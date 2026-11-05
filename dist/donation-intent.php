<?php
declare(strict_types=1);
require __DIR__.'/auth/donations.php';
auth_boot();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $code, array $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405,['error'=>'Použijte formulář podpory.']);
if (!donation_feature_enabled()) {
    respond(503,['error'=>'Automatické e-mailové poděkování zatím není aktivováno. Můžete využít anonymní QR platbu.']);
}
if (!str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'application/json')) {
    respond(415,['error'=>'Neplatný formát požadavku.']);
}
$origin=(string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && $origin !== AUTH_ORIGIN && !auth_test()) respond(403,['error'=>'Nepovolený původ požadavku.']);
$raw=file_get_contents('php://input',false,null,0,4097);
if ($raw===false || strlen($raw)>4096) respond(413,['error'=>'Příliš velký požadavek.']);
try {
    $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($input)) throw new InvalidArgumentException('Neplatný požadavek.');
    if (!isset($input['csrf']) || !is_string($input['csrf'])
        || !hash_equals((string)($_SESSION['csrf'] ?? ''),$input['csrf'])) {
        respond(403,['error'=>'Platnost stránky vypršela. Obnovte ji prosím.']);
    }
    if (($input['acknowledge'] ?? false)!==true) throw new InvalidArgumentException('Potvrďte prosím zaslání děkovného e-mailu.');
    donation_rate_limit((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $cents=donation_cents($input['amount'] ?? '');
    $email=$input['email'] ?? '';
    $name=$input['name'] ?? '';
    if (!is_string($email) || !is_string($name)) throw new InvalidArgumentException('Neplatné kontaktní údaje.');
    $intent=donation_create_intent($email,$name,$cents);
    respond(201,['vs'=>$intent['vs'],'amount_cents'=>$intent['amount_cents'],
        'message'=>'QR kód je připraven. Po připsání správně označené platby obdržíte poděkování na e-mail.']);
} catch (InvalidArgumentException $e) {
    respond(422,['error'=>$e->getMessage()]);
} catch (Throwable $e) {
    error_log('Muj DIP donation intent error: '.get_class($e));
    respond(500,['error'=>'QR kód se nyní nepodařilo připravit. Použijte anonymní QR platbu nebo to zkuste později.']);
}
