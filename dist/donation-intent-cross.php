<?php
declare(strict_types=1);
/**
 * Public, cookie-free donation intent creation for sister applications.
 * One central Fio poller and one private SQLite database serve all apps.
 * Whitelisted browser origins determine the app; clients cannot select it.
 */
require __DIR__.'/auth/donations.php';
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin');
header('Referrer-Policy: no-referrer');

$origins=[
    'https://moje-renta.jirijanousek.cz'=>'moje-renta',
    'https://moje-krypto.jirijanousek.cz'=>'moje-krypto',
    'https://muj-kmen.jirijanousek.cz'=>'muj-kmen',
];
$origin=(string)($_SERVER['HTTP_ORIGIN']??'');
$app=$origins[$origin]??null;
if ($app!==null) {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 300');
}
function donation_cross_reply(int $code,array $value): never {
    http_response_code($code);
    echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
if ($app===null) donation_cross_reply(403,['error'=>'Tento platební formulář není povolen.']);
if ($_SERVER['REQUEST_METHOD']==='OPTIONS') {http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST') donation_cross_reply(405,['error'=>'Použijte formulář podpory.']);
if (!donation_feature_enabled())
    donation_cross_reply(503,['error'=>'Automatické poděkování je dočasně nedostupné. Zvolte anonymní příspěvek.']);
if (!str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE']??'')),'application/json'))
    donation_cross_reply(415,['error'=>'Neplatný formát požadavku.']);
$raw=file_get_contents('php://input',false,null,0,4097);
if (!is_string($raw)||strlen($raw)>4096)
    donation_cross_reply(413,['error'=>'Příliš velký požadavek.']);
try {
    $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($input) || ($input['acknowledge']??null)!==true)
        throw new InvalidArgumentException('Potvrďte prosím jednorázové poděkování.');
    donation_rate_limit((string)($_SERVER['REMOTE_ADDR']??'unknown'));
    $amount=donation_cents($input['amount']??'');
    $email=$input['email']??null;
    $name=$input['name']??null;
    if (!is_string($email)||!is_string($name))
        throw new InvalidArgumentException('Neplatné kontaktní údaje.');
    $intent=donation_create_intent($email,$name,$amount,$app);
    donation_cross_reply(201,[
        'vs'=>$intent['vs'],
        'amount_cents'=>$intent['amount_cents'],
        'message'=>'QR platba je připravena. Po potvrzení připsání platby obdržíte poděkování.',
    ]);
} catch (InvalidArgumentException $e) {
    donation_cross_reply(422,['error'=>$e->getMessage()]);
} catch (Throwable $e) {
    error_log('Donation sister app intent failed: '.get_class($e));
    donation_cross_reply(500,['error'=>'Platební údaje nyní nelze vytvořit. Zkuste to znovu později nebo přispějte anonymně.']);
}
