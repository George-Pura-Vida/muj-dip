<?php
declare(strict_types=1);

/**
 * MŮJ DIP — dobrovolné příspěvky.
 * Soukromý modul; Apache zakazuje přímý přístup do /auth/.
 * Žádné bankovní API tokeny ani údaje dárců do veřejného repozitáře.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/donation-config.php';

const DONATION_IBAN = 'CZ8220100000000223366333';
const DONATION_APP = 'Můj DIP';
const DONATION_APPS = ['muj-dip'=>'Můj DIP','moje-renta'=>'Moje renta','moje-krypto'=>'Moje krypto','muj-kmen'=>'Můj kmen','muj-obchod'=>'Můj obchod'];
require_once __DIR__ . '/donation-mail.php';

function donation_db(): PDO {
    static $db;
    if ($db instanceof PDO) return $db;
    $file = auth_dir() . '/donations.sqlite'; // mimo veřejný dist/
    $db = new PDO('sqlite:' . $file, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON');
    $db->exec("CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vs TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        donor_name TEXT NOT NULL DEFAULT '',
        app TEXT NOT NULL DEFAULT 'muj-dip',
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 999999999),
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
        paid_at INTEGER,
        fio_id TEXT UNIQUE,
        email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sending','failed','sent')),
        admin_status TEXT NOT NULL DEFAULT 'pending' CHECK (admin_status IN ('pending','sending','failed','sent'))
    );
    CREATE TABLE IF NOT EXISTS donation_rate (
        identifier TEXT PRIMARY KEY,
        hits INTEGER NOT NULL,
        expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS donation_poll (
        identifier TEXT PRIMARY KEY,
        last_success INTEGER NOT NULL
    )");
    // Existing donations.sqlite from Můj DIP predates app tagging; preserve prior rows.
    $columns=$db->query("PRAGMA table_info(donations)")->fetchAll(PDO::FETCH_ASSOC);
    if (!in_array('app',array_column($columns,'name'),true))
        $db->exec("ALTER TABLE donations ADD COLUMN app TEXT NOT NULL DEFAULT 'muj-dip'");
    @chmod($file, 0600);
    return $db;
}

function donation_cents(mixed $raw): int {
    if (!is_string($raw) && !is_int($raw)) throw new InvalidArgumentException('Neplatná částka.');
    $v = str_replace(',', '.', trim((string)$raw));
    if (!preg_match('/\A[0-9]{1,7}(?:\.[0-9]{1,2})?\z/D', $v)) throw new InvalidArgumentException('Zadejte platnou částku.');
    [$whole, $decimal] = array_pad(explode('.', $v, 2), 2, '');
    $amount = (int)$whole * 100 + (int)str_pad($decimal, 2, '0');
    if ($amount < 100 || $amount > 999999999) throw new InvalidArgumentException('Částka musí být alespoň 1 Kč.');
    return $amount;
}

function donation_rate_limit(string $ip): void {
    $db = donation_db();
    $key = hash('sha256', 'mujdip-support|' . $ip . '|' . gmdate('Y-m-d-H'));
    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM donation_rate WHERE expires < ?')->execute([time()]);
        $db->prepare('INSERT INTO donation_rate(identifier,hits,expires) VALUES(?,1,?)
            ON CONFLICT(identifier) DO UPDATE SET hits=hits+1')->execute([$key, time()+3600]);
        $q=$db->prepare('SELECT hits FROM donation_rate WHERE identifier=?');
        $q->execute([$key]);
        $count=(int)$q->fetchColumn();
        $db->commit();
        if ($count > 12) throw new RuntimeException('Příliš mnoho pokusů, zkuste to později.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

function donation_create_intent(string $email, string $name, int $amountCents, string $app='muj-dip'): array {
    if (!array_key_exists($app,DONATION_APPS)) throw new InvalidArgumentException('Neplatná aplikace podpory.');
    $email=trim($email);
    if (strlen($email)>254 || !filter_var($email,FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Zadejte platnou e-mailovou adresu.');
    }
    $name=trim(preg_replace('/\s+/u', ' ', $name) ?? '');
    if (strlen($name)>120 || preg_match('/[\x00-\x1f\x7f]/', $name)) {
        throw new InvalidArgumentException('Neplatné jméno.');
    }
    if ($amountCents < 100 || $amountCents > 999999999) throw new InvalidArgumentException('Neplatná částka.');
    $db=donation_db();
    for ($i=0; $i<15; $i++) {
        $vs=(string)random_int(10000000,99999999);
        try {
            $q=$db->prepare('INSERT INTO donations(vs,email,donor_name,amount_cents,created_at,app) VALUES (?,?,?,?,?,?)');
            $q->execute([$vs,$email,$name,$amountCents,time(),$app]);
            return ['vs'=>$vs,'amount_cents'=>$amountCents];
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'UNIQUE constraint failed: donations.vs')) continue;
            throw $e;
        }
    }
    throw new RuntimeException('Nepodařilo se vytvořit jednoznačný platební symbol.');
}

function donation_bank_cents(mixed $value): ?int {
    if (!is_string($value) && !is_int($value) && !is_float($value)) return null;
    $str=trim((string)$value);
    if (!preg_match('/\A[0-9]{1,9}(?:\.[0-9]{1,2})?\z/D', $str)) return null;
    [$whole,$fraction]=array_pad(explode('.',$str,2),2,'');
    return (int)$whole*100+(int)str_pad($fraction,2,'0');
}

function donation_fio_column(array $row, int $number): mixed {
    return $row['column'.$number]['value'] ?? $row['column_'.$number]['value'] ?? null;
}

/**
 * Fio API JSON poskytuje datum jako UNIX čas v milisekundách.
 * Přijímáme také starší / testovací řetězcový formát yyyy-mm-dd+TZ.
 */
function donation_fio_date(mixed $raw): ?string {
    $number = null;
    if (is_int($raw) || (is_string($raw) && preg_match('/\A[0-9]{10}(?:[0-9]{3})?\z/D', $raw))) {
        $number = (string)$raw;
    } elseif (is_float($raw) && is_finite($raw) && $raw >= 1000000000) {
        $number = (string)(int)$raw;
    }
    if ($number !== null) {
        $seconds = strlen($number) >= 13
            ? intdiv((int)$number, 1000)
            : (int)$number;
        if ($seconds < 946684800 || $seconds > 4102444800) return null;
        return (new DateTimeImmutable('@'.$seconds))
            ->setTimezone(new DateTimeZone('Europe/Prague'))->format('Y-m-d');
    }
    if (!is_string($raw)) return null;
    if (!preg_match('/\A([0-9]{4})-([0-9]{2})-([0-9]{2})(?:[+T ].*)?\z/D', $raw, $m)) return null;
    if (!checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return null;
    return $m[1].'-'.$m[2].'-'.$m[3];
}

/** Přijímá pouze skutečné bankovní položky z důvěryhodného serverového volání Fio. */
function donation_match_transactions(array $payload): int {
    $info=$payload['accountStatement']['info'] ?? null;
    if (!is_array($info)) throw new RuntimeException('Neplatná odpověď Fio: chybí informace o účtu.');
    $iban=strtoupper(preg_replace('/\s+/', '', (string)($info['iban'] ?? '')));
    if ($iban !== DONATION_IBAN) throw new RuntimeException('Fio API vrátilo nesprávný účet.');
    $list=$payload['accountStatement']['transactionList']['transaction'] ?? [];
    if ($list === null) $list=[];
    if (!is_array($list)) throw new RuntimeException('Neplatný seznam transakcí.');
    $db=donation_db();
    $matched=0;
    foreach ($list as $row) {
        if (!is_array($row)) continue;
        $id=(string)(donation_fio_column($row,22) ?? '');
        $vs=(string)(donation_fio_column($row,5) ?? '');
        $currency=strtoupper(trim((string)(donation_fio_column($row,14) ?? $info['currency'] ?? '')));
        $amount=donation_bank_cents(donation_fio_column($row,1));
        $date=donation_fio_date(donation_fio_column($row,0));
        if (!preg_match('/\A[0-9]{1,20}\z/D',$id)
            || !preg_match('/\A[0-9]{8}\z/D',$vs)
            || $currency!=='CZK' || $amount===null
            || $date===null) continue;

        // Posuzujeme pouze přijaté prostředky, na přesnou částku,
        // pod unikátním VS a po vytvoření QR platebního požadavku.
        $q=$db->prepare("UPDATE donations
            SET status='paid', paid_at=?, fio_id=?
            WHERE vs=? AND amount_cents=? AND status='pending'
              AND date(created_at,'unixepoch','-1 day') <= ?
              AND NOT EXISTS (SELECT 1 FROM donations WHERE fio_id=?)");
        $q->execute([time(),$id,$vs,$amount,$date,$id]);
        $matched += $q->rowCount();
    }
    return $matched;
}

function donation_text_amount(int $cents): string {
    return number_format($cents/100, $cents%100===0?0:2, ',', ' ') . ' Kč';
}

/** MIME multipart/alternative: stejný HTML + textový koncept jako hlavní web. */
function donation_mime_parts(string $plain, string $html, string $boundary): string {
    $part = static fn(string $type,string $text): string =>
        '--'.$boundary."\r\nContent-Type: ".$type."; charset=UTF-8\r\n"
        ."Content-Transfer-Encoding: base64\r\n\r\n"
        .chunk_split(base64_encode($text), 76, "\r\n");
    return $part('text/plain',$plain).$part('text/html',$html).'--'.$boundary."--\r\n";
}

function donation_send(string $to, string $subject, string $body, string $senderApp=DONATION_APP, ?string $html=null): bool {
    if (!in_array($senderApp, DONATION_APPS, true)) $senderApp=DONATION_APP;
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || strpbrk($to, "\r\n") !== false) return false;
    $headers='From: '.auth_email_header($senderApp).' <info@jirijanousek.cz>'."\r\n"
        ."Reply-To: info@jirijanousek.cz\r\nMIME-Version: 1.0\r\n";
    if ($html === null) {
        // Zachovat kompatibilitu případných starších interních volání.
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
        return mail($to, auth_email_header($subject), str_replace("\n","\r\n",$body),$headers);
    }
    $boundary = 'jj_donation_'.bin2hex(random_bytes(12));
    $headers .= 'Content-Type: multipart/alternative; boundary="'.$boundary.'"';
    return mail($to, auth_email_header($subject), donation_mime_parts($body,$html,$boundary),$headers);
}

/**
 * Stav 'sending' je záměrně trvalý při pádu procesu: nejasné doručení
 * se nesmí automaticky opakovat (riziko duplicit). Správce jej prověří.
 */
function donation_dispatch(): array {
    $db=donation_db();
    $sent=['donor'=>0,'admin'=>0,'failed'=>0];
    $rows=$db->query("SELECT * FROM donations WHERE status='paid'
        AND email_status IN ('pending','failed')
        ORDER BY id LIMIT 50")->fetchAll();
    foreach ($rows as $donation) {
        foreach (['email_status'=>'donor'] as $field=>$kind) {
            if (!in_array($donation[$field],['pending','failed'],true)) continue;
            $q=$db->prepare("UPDATE donations SET $field='sending'
                WHERE id=? AND $field IN ('pending','failed')");
            $q->execute([(int)$donation['id']]);
            if ($q->rowCount()!==1) continue;
            $app=DONATION_APPS[$donation['app']??'muj-dip']??DONATION_APP;
            try {
                $message=donation_mail_donor($donation);
                $ok=donation_send($donation['email'],$message['subject'],$message['text'],$app,$message['html']);
            } catch (Throwable $e) {
                $ok=false;
                error_log('Muj DIP donation mail delivery transport exception');
            }
            $db->prepare("UPDATE donations SET $field=? WHERE id=? AND $field='sending'")
                ->execute([$ok?'sent':'failed',(int)$donation['id']]);
            $ok ? $sent[$kind]++ : $sent['failed']++;
        }
    }
    return $sent;
}
