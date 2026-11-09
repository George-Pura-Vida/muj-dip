<?php
declare(strict_types=1);

/**
 * Vizuální jazyk zpráv z jirijanousek.cz: tmavá hlavička, zlaté akcenty,
 * typografické JJ, přístupné tabulkové rozvržení a textová alternativa.
 * Jen ověřená bankovní platba smí vyvolat poděkování dárci.
 * Nikdy nenačítat bankovní token ani cizí obrázky do e-mailu.
 */

function donation_mail_escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function donation_mail_url(string $appCode): string {
    $hosts = [
        'muj-dip'=>'muj-dip', 'moje-renta'=>'moje-renta',
        'moje-krypto'=>'moje-krypto', 'muj-kmen'=>'muj-kmen',
        'muj-obchod'=>'muj-obchod'
    ];
    return 'https://'.($hosts[$appCode] ?? 'muj-dip').'.jirijanousek.cz/';
}

/**
 * Stejně jako kontaktní formulář hlavního webu: rozpoznání jen u
 * jednoznačných českých jmen; nesprávné skloňování je horší než neutralita.
 * U jmen, která neznáme, je záměrně bezpečné "Dobrý den,".
 */
function donation_mail_salutation(string $fullName): string {
    $parts = preg_split('/\s+/u', trim($fullName));
    if (!is_array($parts) || count($parts) !== 2) return 'Dobrý den,';
    [$first, $last] = $parts;
    if (!preg_match('/^\p{L}+$/uD', $first) || !preg_match('/^\p{L}+$/uD', $last)) return 'Dobrý den,';
    $lower = static fn(string $s): string => function_exists('mb_strtolower')
        ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    $given = $lower($first);
    $surname = $lower($last);
    $men = ['jiří','petr','pavel','jan','josef','martin','michal','tomáš',
        'lukáš','karel','radek','ondřej','daniel','eduard','bedřich','šimon',
        'václav','roman','františek','tobias','marek','jakub','filip','adam','david','milan'];
    $women = ['jana','marie','iveta','monika','klára','romana','naděžda',
        'hana','eva','tereza','lucie','kateřina','petra','martina','zuzana',
        'veronika','lenka','barbora','anna','eliška','markéta','adéla'];
    if (in_array($given, $women, true)) {
        return (str_ends_with($surname, 'ová') || str_ends_with($surname, 'á') || str_ends_with($surname, 'í'))
            ? 'Dobrý den, paní '.$last.',' : 'Dobrý den,';
    }
    if (!in_array($given, $men, true)) return 'Dobrý den,';
    if (str_ends_with($surname, 'ek')) {
        $stem = function_exists('mb_substr') ? mb_substr($last, 0, -2, 'UTF-8') : substr($last, 0, -2);
        $last = $stem.'ku';
    } elseif (str_ends_with($surname, 'k')) {
        $last .= 'u';
    } elseif (str_ends_with($surname, 'a')) {
        $stem = function_exists('mb_substr') ? mb_substr($last, 0, -1, 'UTF-8') : substr($last, 0, -1);
        $last = $stem.'o';
    } elseif (!str_ends_with($surname, 'ý') && !str_ends_with($surname, 'í')) {
        return 'Dobrý den,';
    }
    return 'Dobrý den, pane '.$last.',';
}

/** Vlastní hodnoty tvoří vždy escaped text, žádné syrové HTML z formuláře. */
function donation_mail_table(array $fields): string {
    $html = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fbf8f2;border:1px solid #eee5d5;border-radius:10px">';
    foreach ($fields as $label=>$value) {
        $html .= '<tr><td style="padding:10px 14px;border-bottom:1px solid #ede3d2;color:#786b58;font-size:13px;width:37%;vertical-align:top">'
            .donation_mail_escape((string)$label).'</td><td style="padding:10px 14px;border-bottom:1px solid #ede3d2;color:#25231f;font-size:14px;font-weight:bold;overflow-wrap:anywhere">'
            .donation_mail_escape((string)$value).'</td></tr>';
    }
    return $html.'</table>';
}

function donation_mail_layout(string $app, string $heading, string $subheading, string $content, string $legal): string {
    $e = 'donation_mail_escape';
    $preheader = $e($subheading);
    return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
        .$e($heading).'</title></head>'
        .'<body style="margin:0;padding:0;background:#f5f0e7;color:#24211e;font-family:Arial,Helvetica,sans-serif">'
        .'<div style="display:none;font-size:1px;color:#f5f0e7;max-height:0;max-width:0;opacity:0;overflow:hidden">'.$preheader.'</div>'
        .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e7"><tr><td align="center" style="padding:26px 10px">'
        .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #e5dccb;border-radius:16px;border-collapse:separate;border-spacing:0">'
        .'<tr><td style="padding:27px 28px;background:#201f1b;border-bottom:4px solid #c5a15f;color:#fff">'
        .'<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="55" valign="middle">'
        .'<span style="display:inline-block;background:#c5a15f;color:#17150f;border-radius:10px;min-width:43px;text-align:center;padding:12px 0;font-size:20px;font-weight:900">JJ</span>'
        .'</td><td valign="middle"><span style="font-size:19px;font-weight:800;letter-spacing:.5px">JIŘÍ JANOUŠEK</span>'
        .'<div style="font-size:12px;font-weight:normal;color:#e4cd9c;margin-top:5px">Finanční specialista · '.$e($app).'</div>'
        .'</td></tr></table></td></tr>'
        .'<tr><td style="padding:30px 28px 27px">'
        .'<div style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#9c793e;margin-bottom:11px">✦ '.$e($app).'</div>'
        .'<h1 style="font-size:25px;line-height:1.35;letter-spacing:-.4px;color:#25221d;margin:0 0 13px">'.$e($heading).'</h1>'
        .'<p style="font-size:15px;line-height:1.7;color:#6d655a;margin:0 0 25px">'.$e($subheading).'</p>'
        .$content.'</td></tr>'
        .'<tr><td style="padding:21px 28px 26px;background:#faf7f1;color:#776f61;font-size:12px;line-height:1.8">'
        .$e($legal).'<div style="margin-top:11px">Jiří Janoušek · '
        .'<a href="https://jirijanousek.cz/" style="color:#80602e">jirijanousek.cz</a>'
        .' · <a href="mailto:info@jirijanousek.cz" style="color:#80602e">info@jirijanousek.cz</a>'
        .' · +420 777 796 148</div></td></tr></table></td></tr></table></body></html>';
}

function donation_mail_donor(array $donation): array {
    $appCode = (string)($donation['app'] ?? 'muj-dip');
    $app = DONATION_APPS[$appCode] ?? DONATION_APP;
    $amount = donation_text_amount((int)$donation['amount_cents']);
    $vs = (string)$donation['vs'];
    $name = (string)($donation['donor_name'] ?? '');
    $greeting = donation_mail_salutation($name);
    $url = donation_mail_url($appCode);
    $content = '<p style="font-size:16px;line-height:1.75;margin:0 0 19px"><strong>'
        .donation_mail_escape($greeting).'</strong></p>'
        .'<p style="font-size:15px;line-height:1.8;margin:0 0 20px">💛 Děkuji Vám za dobrovolnou podporu projektu <strong>'
        .donation_mail_escape($app).'</strong>. Vaše platba byla připsána a ověřena prostřednictvím Fio banky.</p>'
        .'<div style="background:#fff8e8;border-left:4px solid #c5a15f;padding:16px 18px;margin:19px 0;border-radius:7px">'
        .'<div style="font-size:12px;letter-spacing:.6px;color:#866d43">PŘIJATÝ PŘÍSPĚVEK</div>'
        .'<div style="font-size:28px;font-weight:800;color:#674d23;margin-top:6px">'
        .donation_mail_escape($amount).'</div></div>'
        .donation_mail_table(['Podpořený projekt'=>$app, 'Variabilní symbol'=>$vs])
        .'<p style="font-size:15px;line-height:1.8;margin:24px 0">Vážím si Vaší důvěry. Pomáháte rozvíjet a udržovat aplikaci dostupnou. 🌟</p>'
        .'<p style="margin:20px 0 24px"><a href="'.donation_mail_escape($url).'" style="display:inline-block;background:#88652e;color:#fff;text-decoration:none;border-radius:8px;padding:13px 22px;font-size:14px;font-weight:bold">↗ Otevřít aplikaci</a></p>'
        .'<p style="font-size:15px;line-height:1.8;margin:0">S vděčností a přáním hezkého dne,<br><strong>Jiří Janoušek</strong></p>';
    $text = $greeting."\n\n"
        ."💛 Děkuji Vám za podporu projektu $app.\n"
        ."Fio banka potvrdila připsání platby $amount.\n"
        ."Variabilní symbol: $vs\n\n"
        ."Vážím si Vaší důvěry.\n\nS vděčností,\nJiří Janoušek\n$url\n\n"
        ."Toto je jednorázové poděkování, nikoli reklamní sdělení.";
    return [
        'subject'=>'💛 Děkuji za podporu | '.$app,
        'text'=>$text,
        'html'=>donation_mail_layout($app,'Děkuji za Vaši podporu! 💛',
            'Potvrzení přijetí Vašeho dobrovolného příspěvku.',$content,
            'Jednorázové poděkování za přijatý příspěvek. Nejde o reklamní sdělení.'),
    ];
}

/**
 * Oznámení správci: nespárovaný příchozí převod NENÍ automaticky dar.
 * Název aplikace odvozujeme výlučně z interního párování Fio ID.
 */
function donation_mail_admin(array $tx, ?array $matchedDonation): array {
    $appCode = (string)($matchedDonation['app'] ?? '');
    $app = $appCode !== '' ? (DONATION_APPS[$appCode] ?? '') : '';
    $isDonation = $app !== '';
    $money = (string)$tx['money'];
    $sender = (string)$tx['sender_name'];
    $date = (string)$tx['paid_on'];
    $vs = (string)$tx['vs'];
    $fioId = (string)$tx['fio_id'];
    $message = (string)$tx['message_text'];
    $label = $isDonation ? $app : 'Fio banka';
    $intro = $isDonation
        ? 'Byl připsán příspěvek určený pro aplikaci '.$app.'.'
        : 'Na účet byla připsána platba, jejíž účel není automaticky ověřen jako dar.';
    $fields = [
        'Částka'=>$money,
        'Datum připsání'=>$date,
        'Aplikace'=>$isDonation ? $app : 'Nezjištěna',
        'Odesílatel (banka)'=>$sender,
        'Variabilní symbol'=>$vs,
        'Zpráva pro příjemce'=>$message,
        'Fio ID pohybu'=>$fioId,
    ];
    if ($isDonation) {
        $fields['Jméno z formuláře'] = (string)($matchedDonation['donor_name'] ?: 'Neuvedeno');
        $fields['E-mail pro poděkování'] = (string)$matchedDonation['email'];
    }
    $content = '<p style="font-size:15px;line-height:1.8;margin:0 0 20px"><strong>Dobrý den, pane Janoušku,</strong></p>'
        .'<p style="font-size:15px;line-height:1.8;margin:0 0 22px">'
        .donation_mail_escape($intro).'</p>'
        .'<div style="background:#fff8e8;border-left:4px solid #c5a15f;padding:15px 18px;margin:19px 0;border-radius:7px">'
        .'<div style="font-size:12px;color:#866d43">PŘÍCHOZÍ PLATBA</div>'
        .'<div style="font-size:27px;font-weight:bold;color:#674d23;margin-top:6px">'
        .donation_mail_escape($money).'</div></div>'
        .donation_mail_table($fields)
        .'<p style="font-size:13px;line-height:1.7;color:#766b5f;margin:20px 0 0">'
        .($isDonation
            ? 'Spárování bylo potvrzeno na základě částky, variabilního symbolu a bankovního ID.'
            : 'Nejde o potvrzení daru. Účel platby případně ověřte v internetovém bankovnictví.')
        .'</p>';
    $text = "Dobrý den, pane Janoušku,\n\n".$intro."\n\n";
    foreach ($fields as $field=>$value) $text .= $field.': '.$value."\n";
    $text .= "\n".($isDonation ? 'Bankovně spárovaný příspěvek.' : 'Účel platby je nutné ověřit.')."\n";
    $subject = ($isDonation ? '💛 '.$app.' | přijatý příspěvek ' : '💰 Fio | příchozí platba ').$money;
    return [
        'subject'=>$subject,
        'text'=>$text,
        'html'=>donation_mail_layout($label,
            $isDonation ? 'Přijatý příspěvek 💛' : 'Příchozí platba 💰',
            $isDonation ? 'Oznámení o spárovaném příspěvku.' : 'Automatické bankovní upozornění.',
            $content, 'Administrátorské oznámení. Každý bankovní pohyb se oznamuje pouze jednou.'),
    ];
}
