<?php
declare(strict_types=1);
require __DIR__.'/dist/auth/inbound-notifications.php';
function check(bool $condition,string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: ".$message."\n"); exit(1); }
}
check(donation_cents('100')===10000,'100 Kč must be 10000 cents');
check(donation_cents('1,01')===101,'decimal cents');
try { donation_cents('0.50'); check(false,'too-small payment accepted'); }
catch (InvalidArgumentException $e) {}
try { donation_cents('100*CC:EUR'); check(false,'injected amount accepted'); }
catch (InvalidArgumentException $e) {}
$db=donation_db();
$intent=donation_create_intent('test-donor@example.org','Testovací dárce',10000);
check((bool)preg_match('/^[1-9]\d{7}$/',$intent['vs']),'VS must be exactly eight digits');
try { donation_create_intent('not-an-email','Name',10000); check(false,'invalid email accepted'); }
catch (InvalidArgumentException $e) {}
$transaction=static fn($id,$vs,$amount,$currency)=>[
    'column22'=>['value'=>$id],'column5'=>['value'=>$vs],
    'column1'=>['value'=>$amount],'column14'=>['value'=>$currency],
    'column0'=>['value'=>date('Y-m-d').'+01:00'],
];
$payload=static fn($transactions,$iban=DONATION_IBAN)=>[
    'accountStatement'=>['info'=>['iban'=>$iban,'currency'=>'CZK'],
    'transactionList'=>['transaction'=>$transactions]]
];
check(donation_match_transactions($payload([$transaction('1234567801',$intent['vs'],'99.00','CZK')]))===0,'wrong amount matched');
check(donation_match_transactions($payload([$transaction('1234567802',$intent['vs'],'100.00','EUR')]))===0,'wrong currency matched');
try { donation_match_transactions($payload([], 'CZ0000000000000000000000')); check(false,'wrong bank account allowed'); }
catch (RuntimeException $e) {}
$good=$payload([$transaction('1234567803',$intent['vs'],'100.00','CZK')]);
check(donation_match_transactions($good)===1,'valid bank transaction did not match');
check(donation_match_transactions($good)===0,'duplicate transaction matched');
$q=$db->prepare('SELECT status,fio_id,email_status,admin_status FROM donations WHERE vs=?');
$q->execute([$intent['vs']]);
$row=$q->fetch(PDO::FETCH_ASSOC);
check($row['status']==='paid'&&$row['fio_id']==='1234567803','payment status not saved');
check($row['email_status']==='pending'&&$row['admin_status']==='pending','mail must be queued, not sent immediately');
$db->prepare('DELETE FROM donations WHERE vs=?')->execute([$intent['vs']]);

// Reálné Fio JSON předává datum jako Unix čas v MILISEKUNDÁCH.
$stamp = time() * 1000;
$todayPrague = (new DateTimeImmutable('@'.time()))
    ->setTimezone(new DateTimeZone('Europe/Prague'))->format('Y-m-d');
check(donation_fio_date($stamp) === $todayPrague, 'Fio millisecond date parsing failed');
check(donation_fio_date(intdiv($stamp, 1000)) === $todayPrague, 'Fio second date parsing failed');
check(donation_fio_date('not-a-date') === null, 'invalid bank date accepted');
$intentMs = donation_create_intent('test-donor@example.org', 'Dárce', 100);
$bankRow = static fn(string $id, mixed $amount, string $currency = 'CZK', ?string $vs = null): array => [
    'column22'=>['value'=>$id],
    'column0'=>['value'=>$stamp],
    'column1'=>['value'=>$amount],
    'column14'=>['value'=>$currency],
    'column5'=>['value'=>$vs],
    'column10'=>['value'=>'Jiří Testovací'],
    'column16'=>['value'=>'Podpora aplikace Můj DIP'],
];
$realJsonStyle = $payload([$bankRow('1234567881', 1.0, 'CZK', $intentMs['vs'])]);
check(donation_match_transactions($realJsonStyle) === 1,
    'real Fio JSON timestamp did not match donor intent');
check(donation_match_transactions($realJsonStyle) === 0, 'millisecond date matched twice');

// Bez VS/e-mailu mají i anonymní dary přijít administrátorovi právě jednou.
$inbound = $payload([
    $bankRow('1234567882', 1.0),
    $bankRow('1234567883', 2.0),
    $bankRow('1234567884', -3.0), // odchozí platba
    $bankRow('1234567885', 3.0, 'EUR'),
]);
check(inbound_collect($inbound) === 3, 'not all incoming transfers were queued');
check(inbound_collect($inbound) === 0, 'bank transaction IDs were duplicated');
try {
    inbound_collect($payload([$bankRow('1234567886', 5.0)], 'CZ0000000000000000000000'));
    check(false, 'wrong IBAN inbound transaction was accepted');
} catch (RuntimeException $e) {}

$sent = [];
$mailMock = static function (string $to, string $subject, string $body) use (&$sent): bool {
    $sent[] = compact('to', 'subject', 'body');
    return true;
};
$result = inbound_dispatch($mailMock);
check($result['admin'] === 3 && $result['failed'] === 0,
    'admin must be notified once per incoming payment');
check(count($sent) === 3, 'exactly three admin emails expected');
check($sent[0]['to'] === AUTH_APPROVER_EMAIL, 'admin destination incorrect');
check(str_contains($sent[0]['body'], 'Jiří Testovací')
    && str_contains($sent[0]['body'], 'Podpora aplikace Můj DIP'),
    'bank sender and message absent from notification');
check(inbound_dispatch($mailMock)['admin'] === 0 && count($sent) === 3,
    'repeated cron execution sent duplicate admin notifications');

// Jestli stará verze u konkrétního ID již poslala zprávu, neposílat znovu.
$db->prepare("UPDATE donations SET admin_status='sent'
    WHERE fio_id='1234567881'")->execute();
check(inbound_collect($realJsonStyle) === 1,
    'existing legacy bank payment not recorded in new registry');
check(inbound_dispatch($mailMock)['admin'] === 0 && count($sent) === 3,
    'legacy admin email was duplicated');

$db->prepare("DELETE FROM donations WHERE vs=?")->execute([$intentMs['vs']]);
$db->exec("DELETE FROM fio_inbound_notifications WHERE fio_id IN
    ('1234567881','1234567882','1234567883','1234567885')");

echo "PASS Fio JSON milliseconds, anonymous incoming transfer alerts and exact-once mail acceptance\n";

