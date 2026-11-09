<?php
declare(strict_types=1);
/**
 * Spouštět VÝHRADNĚ z CLI přes cron, např. každých 5 minut.
 * Token pouze v proměnné prostředí FIO_TOKEN, nikdy jako argument či v GitHubu.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../auth/inbound-notifications.php';
ini_set('display_errors','0');

// Save only operational status outside dist/, with no bank or donor data.
$report = static function (string $stage, array $counts = []): void {
    $path = donation_private_dir().'/donation-cron-status.json';
    if (is_link($path)) return;
    $mode = umask(0077);
    try {
        @file_put_contents($path, json_encode([
            'at'=>gmdate(DATE_ATOM), 'stage'=>$stage,
        ] + $counts)."\n", LOCK_EX);
    } finally {
        umask($mode);
    }
};
$token=donation_bank_token();
if (!donation_feature_enabled() || !preg_match('/\A[A-Za-z0-9]{30,128}\z/D',$token)) {
    $report('configuration');
    fwrite(STDERR,"Donations are disabled or FIO_TOKEN is not configured.\n");
    exit(1);
}
if (!function_exists('curl_init')) {
    $report('missing_curl');
    fwrite(STDERR,"PHP cURL extension is required.\n");
    exit(1);
}
$stage='storage';
$httpCode=0;
try {
    $lockPath=auth_dir().'/fio-sync.lock';
} catch (Throwable $e) {
    $report($stage);
    fwrite(STDERR, "Fio storage is not available.\n");
    exit(1);
}
$lock=@fopen($lockPath,'c');
if (!$lock) {
    $report($stage);
    exit(1);
}
if (!flock($lock,LOCK_EX|LOCK_NB)) {
    exit(0);
}
try {
    $db=donation_db();
    $last=$db->query("SELECT last_success FROM donation_poll WHERE identifier='fio'")->fetchColumn();
    // Zamezí náhodnému opakovanému dotazu na Fio v krátkém intervalu.
    if ($last!==false && time()-(int)$last<60) exit(0);
    $stage='fio_request';
    $tz=new DateTimeZone('Europe/Prague');
    $now=new DateTimeImmutable('now',$tz);
    $start=$now->modify('-14 days')->format('Y-m-d');
    $end=$now->format('Y-m-d');
    $url='https://fioapi.fio.cz/v1/rest/periods/'.rawurlencode($token)
        .'/'.$start.'/'.$end.'/transactions.json';
    $curl=curl_init($url);
    curl_setopt_array($curl,[
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>10, CURLOPT_TIMEOUT=>25,
        CURLOPT_FOLLOWLOCATION=>false, CURLOPT_HTTPGET=>true,
        CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_HTTPHEADER=>['Accept: application/json'],
    ]);
    $response=curl_exec($curl);
    $httpCode=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);
    curl_close($curl);
    // URL obsahuje citlivý token: nikdy ji nevypisovat do logů.
    if (!is_string($response) || $httpCode!==200 || strlen($response)>5000000) {
        throw new RuntimeException('Fio API nedostupné nebo neplatná odpověď HTTP '.$httpCode);
    }
    $stage='bank_matching';
    $payload=json_decode($response,true,512,JSON_THROW_ON_ERROR);
    if (!is_array($payload)) throw new RuntimeException('Fio: neplatná JSON odpověď');
    $matched=donation_match_transactions($payload);
    $inbound=inbound_collect($payload);
    $db->prepare("INSERT INTO donation_poll(identifier,last_success) VALUES('fio',?)
        ON CONFLICT(identifier) DO UPDATE SET last_success=excluded.last_success")->execute([time()]);
    $stage='mail_queue';
    $mail=donation_dispatch();
    $alerts=inbound_dispatch();
    $report('complete', [
        'matched'=>$matched, 'incoming'=>$inbound,
        'donor_accepted'=>$mail['donor'], 'admin_accepted'=>$alerts['admin'],
        'mail_failed'=>$mail['failed']+$alerts['failed'],
    ]);
    printf("Fio sync OK; matched=%d; inbound_new=%d; donor=%d; admin=%d; failed=%d\n",
        $matched,$inbound,$mail['donor'],$alerts['admin'],$mail['failed']+$alerts['failed']);
} catch (Throwable $e) {
    $report($stage, ['http_status'=>$httpCode, 'exception'=>get_class($e)]);
    error_log('MUJ-DIP donation sync: '.$stage.' ('.get_class($e).')');
    fwrite(STDERR,"Fio sync failed; see server error log.\n");
    exit(1);
} finally {
    flock($lock,LOCK_UN);
    fclose($lock);
}
