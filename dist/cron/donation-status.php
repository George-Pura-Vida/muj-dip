<?php
declare(strict_types=1);
/**
 * Read-only CLI diagnostics for donation matching and email queue.
 * Does not call Fio API, send email, or print tokens, email addresses, VS or names.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/../auth/donations.php';
ini_set('display_errors', '0');
try {
    $db = donation_db();
    echo 'Muj DIP donation diagnostic (UTC)' . PHP_EOL;
    echo 'Feature enabled: ' . (donation_feature_enabled() ? 'yes' : 'no') . PHP_EOL;
    $poll = $db->query("SELECT last_success FROM donation_poll WHERE identifier='fio'")->fetchColumn();
    echo 'Last Fio sync: ' . ($poll === false ? 'never' : gmdate('Y-m-d H:i:s', (int) $poll)) . PHP_EOL;
    $q = $db->query("SELECT status, email_status, admin_status, COUNT(*) AS count
        FROM donations GROUP BY status, email_status, admin_status ORDER BY status, email_status, admin_status");
    $all = $q->fetchAll(PDO::FETCH_ASSOC);
    if ($all === []) echo 'No donation requests recorded.' . PHP_EOL;
    foreach ($all as $row) {
        printf("Count: %d | payment=%s | donor_mail=%s | admin_mail=%s\n",
            (int)$row['count'], $row['status'], $row['email_status'], $row['admin_status']);
    }
    $q = $db->query("SELECT id,amount_cents,status,email_status,admin_status,created_at,paid_at
        FROM donations ORDER BY id DESC LIMIT 10");
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        printf("Request #%d | amount=%s CZK | created=%s | paid=%s | payment=%s | donor_mail=%s | admin_mail=%s\n",
            (int)$row['id'],
            number_format(((int)$row['amount_cents']) / 100, 2, '.', ''),
            gmdate('Y-m-d H:i:s', (int)$row['created_at']),
            $row['paid_at'] === null ? 'no' : gmdate('Y-m-d H:i:s', (int)$row['paid_at']),
            $row['status'], $row['email_status'], $row['admin_status']);
    }
} catch (Throwable $e) {
    error_log('MUJ-DIP donation diagnostic: ' . get_class($e));
    fwrite(STDERR, "Diagnostic unavailable; check PHP/SQLite permissions and error log.\n");
    exit(1);
}
