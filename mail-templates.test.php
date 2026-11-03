<?php
declare(strict_types=1);
require __DIR__.'/dist/auth/mail.php';
$count=0;
function check(bool $ok,string $label):void{global $count;if(!$ok)throw new RuntimeException($label);$count++;}
$base='https://muj-dip.jirijanousek.cz';$token=str_repeat('a',64);
foreach(['verify','reset','email','admin-registration','approved','rejected','pending'] as $purpose){
 $m=auth_email_template($purpose,$base,['token'=>$token,'first_name'=>"Jan\r\nTest",'last_name'=>'Novák','email'=>'test@example.invalid','company'=>'Firma','phone'=>'+420 777 123 456']);
 check(str_starts_with($m['body'],"Dobrý den,\n\n"),'greeting');
 check(str_contains($m['body'],$m['url']),'action link');
 check(!preg_match('/\{[a-z_]+\}/',$m['body']),'resolved placeholders');
 check(str_contains($m['body'],'info@jirijanousek.cz'),'support');
 check(!str_contains($m['body'],"Jan\r\n"),'single line input');
 $encoded=auth_email_header($m['subject']);$decoded='';
 foreach(explode("\r\n ",$encoded)as$part){check(strlen($part)<=75,'header length');$decoded.=base64_decode(substr($part,10,-2));}
 check($decoded===$m['subject'],'UTF-8 subject roundtrip');
 if(in_array($purpose,['verify','reset','email'],true)){
  $view=['verify'=>'verify','reset'=>'reset','email'=>'confirm-email'][$purpose];
  check($m['url']===$base.'/account.php?view='.$view.'#token='.$token,'canonical token URL');
  check(str_contains($m['body'],$purpose==='verify'?'24 hodin':'30 minut'),'expiry');
 }else check(!str_contains($m['body'],$token),'no leaked token');
 if($purpose==='verify')check(str_contains($m['body'],'bez čekání'),'automatic activation');
 if($purpose==='admin-registration')check(str_contains($m['body'],'+420 777 123 456'),'phone for operator');
}
foreach([['verify',['token'=>'bad']],['missing',[]]]as[$purpose,$data]){
 try{auth_email_template($purpose,$base,$data);throw new RuntimeException('must reject');}catch(InvalidArgumentException $e){$count++;}
}
try{auth_email_header("Bad\r\nBcc: x");throw new RuntimeException('must reject header');}catch(InvalidArgumentException $e){$count++;}
echo "PASS: $count process-email checks.\n";
