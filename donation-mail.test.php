<?php
declare(strict_types=1);
require __DIR__.'/dist/auth/donations.php';

function mail_check(bool $pass,string $msg): void {
    if (!$pass) {fwrite(STDERR,"FAIL donation mail: $msg\n");exit(1);}
}
$salutations = [
    'Jiří Janoušek'=>'Dobrý den, pane Janoušku,',
    'Petr Novák'=>'Dobrý den, pane Nováku,',
    'Pavel Sova'=>'Dobrý den, pane Sovo,',
    'Jana Nováková'=>'Dobrý den, paní Nováková,',
    'Marie Svobodová'=>'Dobrý den, paní Svobodová,',
    'Jana'=>'Dobrý den,',
    'Alex Johnson'=>'Dobrý den,',
    'Jana Nováková a další'=>'Dobrý den,',
    '<script>'=>'Dobrý den,',
];
foreach ($salutations as $name=>$expected) {
    mail_check(donation_mail_salutation($name)===$expected,'Wrong Czech greeting for '.$name);
}

foreach (DONATION_APPS as $key=>$label) {
    $d = ['app'=>$key,'amount_cents'=>25000,'vs'=>'12345678',
        'donor_name'=>'Jiří Janoušek','email'=>'donor@example.org'];
    $mail = donation_mail_donor($d);
    mail_check(str_contains($mail['subject'],$label),'Donor subject missing '.$label);
    mail_check(str_contains($mail['text'],'Dobrý den, pane Janoušku,'),'Donor salutation absent');
    mail_check(str_contains($mail['text'],'250 Kč'),'Donor amount missing');
    mail_check(str_contains($mail['html'],'250 Kč'),'HTML amount missing');
    mail_check(str_contains($mail['html'],'JIŘÍ JANOUŠEK'),'Branded header missing');
    mail_check(str_contains($mail['html'],'jirijanousek.cz'),'Branded signature missing');
    mail_check(str_contains($mail['html'],donation_mail_url($key)),'App URL missing');
}

$unsafe = ['app'=>'moje-renta','amount_cents'=>10000,
    'vs'=>'87654321','donor_name'=>'Jana <img src=x onerror=alert(1)>',
    'email'=>'donor@example.org'];
$sanitized = donation_mail_donor($unsafe);
mail_check(!str_contains($sanitized['html'],'<img src=x'),'Unescaped donor HTML');
mail_check(str_contains($sanitized['html'],'Dobrý den,'),'Unknown full name must use neutral salutation');

$bank = [
    'money'=>'250 Kč','sender_name'=>'<b>Útočník</b>',
    'paid_on'=>'2026-11-09','vs'=>'12345678',
    'message_text'=>'Podpora <script>alert(1)</script>','fio_id'=>'123456789012'
];
$unknown = donation_mail_admin($bank,null);
mail_check(str_contains($unknown['subject'],'Fio | příchozí platba'),'Unknown payment incorrectly called donation');
mail_check(str_contains($unknown['text'],'účel není automaticky ověřen'),'Unknown payment needs warning');
mail_check(!str_contains($unknown['html'],'<script>'),'Unescaped bank details');
mail_check(str_contains($unknown['html'],'&lt;script&gt;'),'Missing escaped bank data');

foreach (DONATION_APPS as $key=>$label) {
    $known = donation_mail_admin($bank,['app'=>$key,'donor_name'=>'Pavel Sova','email'=>'donor@example.org']);
    mail_check(str_contains($known['subject'],$label),'Admin missing app '.$label);
    mail_check(str_contains($known['subject'],'přijatý příspěvek'),'Matched donation missing label');
    mail_check(str_contains($known['html'],'donor@example.org'),'Admin donor email missing');
    mail_check(str_contains($known['html'],'Dobrý den, pane Janoušku,'),'Admin greeting missing');
}

$alt=donation_mime_parts("Český text\n",'<p>Úspěch 💛</p>','test_123');
mail_check(substr_count($alt,'Content-Type: text/plain; charset=UTF-8')===1,'Missing plain MIME part');
mail_check(substr_count($alt,'Content-Type: text/html; charset=UTF-8')===1,'Missing HTML MIME part');
mail_check(str_contains($alt,base64_encode('<p>Úspěch 💛</p>')),'HTML not base64 encoded');
mail_check(str_ends_with($alt,"--test_123--\r\n"),'MIME boundary malformed');
echo "PASS branded HTML donation emails, 5 app sources, Czech salutation, escaping and MIME\n";
