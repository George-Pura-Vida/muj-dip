<?php
declare(strict_types=1);

/**
 * Jednorázová upozornění správci o všech příchozích bankovních platbách.
 * Každé Fio ID se ukládá do soukromé SQLite, bez VS či e-mailu dárce.
 * Pouze CLI cron načítá bankovní pohyby, PHP web nikdy nečte Fio token.
 */
require_once __DIR__ . '/donations.php';

function inbound_init(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS fio_inbound_notifications (
        fio_id TEXT PRIMARY KEY,
        amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
        currency TEXT NOT NULL,
        paid_on TEXT NOT NULL,
        vs TEXT NOT NULL DEFAULT '',
        sender_name TEXT NOT NULL DEFAULT '',
        message_text TEXT NOT NULL DEFAULT '',
        notice_status TEXT NOT NULL DEFAULT 'pending'
            CHECK(notice_status IN ('pending','sending','failed','sent')),
        notified_at INTEGER
    )");
}

/** Fio údaje jsou nedůvěryhodný text: nepropouštět do e-mailu řídicí znaky. */
function inbound_safe_text(mixed $input, int $limit = 240): string {
    if (!is_string($input) && !is_numeric($input)) return '';
    $clean = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', trim((string)$input));
    if ($clean === null) return '';
    $clean = trim($clean);
    return function_exists('mb_strcut') ? mb_strcut($clean, 0, $limit, 'UTF-8') : substr($clean, 0, $limit);
}

/**
 * Jedinečná bankovní ID se zapisují jen po ověření účtu.
 * Pozitivní transakce se evidují pro upozornění správci bez ohledu na VS.
 * Částky mohou být v různých měnách; poděkování dárci se páruje zvlášť.
 */
function inbound_collect(array $payload): int {
    $info = $payload['accountStatement']['info'] ?? null;
    if (!is_array($info)) throw new RuntimeException('Fio: chybí údaje o účtu.');
    $iban = strtoupper((string)preg_replace('/\s+/', '', (string)($info['iban'] ?? '')));
    if ($iban !== DONATION_IBAN) throw new RuntimeException('Fio: nesprávný bankovní účet.');
    $transactions = $payload['accountStatement']['transactionList']['transaction'] ?? [];
    if ($transactions === null) $transactions = [];
    if (!is_array($transactions)) throw new RuntimeException('Fio: neplatný seznam plateb.');

    $db = donation_db();
    inbound_init($db);
    $selectLegacy = $db->prepare("SELECT admin_status FROM donations WHERE fio_id=? LIMIT 1");
    $insert = $db->prepare("INSERT OR IGNORE INTO fio_inbound_notifications
        (fio_id, amount_cents, currency, paid_on, vs, sender_name, message_text, notice_status)
        VALUES (?,?,?,?,?,?,?,?)");
    $added = 0;
    foreach ($transactions as $transaction) {
        if (!is_array($transaction)) continue;
        $id = (string)(donation_fio_column($transaction, 22) ?? '');
        if (!preg_match('/\A[0-9]{1,20}\z/D', $id)) continue;
        $amount = donation_bank_cents(donation_fio_column($transaction, 1));
        if ($amount === null || $amount <= 0) continue; // odchozí platby ignorujeme
        $currency = strtoupper((string)(donation_fio_column($transaction, 14) ?? $info['currency'] ?? ''));
        if (!preg_match('/\A[A-Z]{3}\z/D', $currency)) continue;
        $date = donation_fio_date(donation_fio_column($transaction, 0));
        if ($date === null) continue;
        $vs = inbound_safe_text(donation_fio_column($transaction, 5), 40);
        $sender = inbound_safe_text(donation_fio_column($transaction, 10), 200);
        $message = inbound_safe_text(donation_fio_column($transaction, 16), 500);

        // Zpětná kompatibilita: pokud starý systém u konkrétního Fio ID již
        // správce notifikoval, nová verze ho nebude upozorňovat podruhé.
        $selectLegacy->execute([$id]);
        $legacy = $selectLegacy->fetchColumn();
        $state = ($legacy === 'sent' || $legacy === 'sending') ? $legacy : 'pending';
        $insert->execute([$id, $amount, $currency, $date, $vs, $sender, $message, $state]);
        $added += $insert->rowCount();
    }
    return $added;
}

/**
 * Při pádu v okamžiku odesílání zůstává status 'sending'; nikdy se z něj
 * automaticky neopakuje pokus. PHP mail() potvrzuje jen převzetí serverem,
 * nikoli skutečné doručení do příjemcovy schránky.
 */
function inbound_dispatch(?callable $send = null): array {
    $send ??= 'donation_send';
    $db = donation_db();
    inbound_init($db);
    $stats = ['admin' => 0, 'failed' => 0];
    $rows = $db->query("SELECT * FROM fio_inbound_notifications
        WHERE notice_status IN ('pending','failed')
        ORDER BY paid_on, fio_id LIMIT 50")->fetchAll();
    $claim = $db->prepare("UPDATE fio_inbound_notifications SET notice_status='sending'
        WHERE fio_id=? AND notice_status IN ('pending','failed')");
    $finish = $db->prepare("UPDATE fio_inbound_notifications
        SET notice_status=?, notified_at=?
        WHERE fio_id=? AND notice_status='sending'");
    $legacy = $db->prepare("UPDATE donations SET admin_status=?
        WHERE fio_id=? AND admin_status IN ('pending','failed')");
    $source = $db->prepare("SELECT app FROM donations WHERE fio_id=? LIMIT 1");
    foreach ($rows as $tx) {
        $id = (string)$tx['fio_id'];
        $claim->execute([$id]);
        if ($claim->rowCount() !== 1) continue;

        $money = donation_text_amount((int)$tx['amount_cents']);
        if ($tx['currency'] !== 'CZK') {
            $money = number_format(((int)$tx['amount_cents']) / 100, 2, ',', ' ')
                . ' ' . $tx['currency'];
        }
        $sender = $tx['sender_name'] !== '' ? $tx['sender_name'] : 'Banka neuvedla';
        $message = $tx['message_text'] !== '' ? $tx['message_text'] : 'Neuvedena';
        $vs = $tx['vs'] !== '' ? $tx['vs'] : 'Neuveden';
        // Zdroj odvozujeme výhradně od bankou spárovaného Fio ID, nikoli od
        // libovolného textu odesílatele. Neoznačené platby zůstávají obecné.
        $source->execute([$id]);
        $appCode = $source->fetchColumn();
        $appName = is_string($appCode) ? (DONATION_APPS[$appCode] ?? '') : '';
        $subject = ($appName !== '' ? '💛 '.$appName.': přijatý příspěvek ' : '💰 Fio: příchozí platba ') . $money;
        $body = ($appName !== ''
            ? "Potvrzený příspěvek pro aplikaci $appName.\n\n"
            : "Na účet Fio byla připsána platba (aplikace nezjištěna).\n\n")
            . "Částka: $money\n"
            . "Datum připsání: {$tx['paid_on']}\n"
            . "Odesílatel (dle banky): $sender\n"
            . "Zpráva pro příjemce: $message\n"
            . "Variabilní symbol: $vs\n"
            . "Fio ID pohybu: $id\n\n"
            . "Jde o jednorázové upozornění na příchozí bankovní platbu. "
            . "Pokud nebyla označena jako dar, ověřte její účel v bankovnictví.\n";
        try {
            $ok = (bool)$send(AUTH_APPROVER_EMAIL, $subject, $body);
        } catch (Throwable $e) {
            $ok = false;
            error_log('MUJ-DIP inbound notification transport exception');
        }
        $status = $ok ? 'sent' : 'failed';
        $finish->execute([$status, $ok ? time() : null, $id]);
        $legacy->execute([$status, $id]);
        $ok ? $stats['admin']++ : $stats['failed']++;
    }
    return $stats;
}
