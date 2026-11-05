<?php
declare(strict_types=1);
require __DIR__.'/dist/auth/donations.php';
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
echo "PASS Fio donation matching, amount validation, account guard and idempotence\n";
