<?php
declare(strict_types=1);
require __DIR__.'/auth/bootstrap.php';
auth_boot();
$views=['login','register','forgot','reset','verify','profile','confirm-email','privacy'];
$view=is_string($_GET['view']??null)&&in_array($_GET['view'],$views,true)?$_GET['view']:'login';
$error='';$user=null;
try {
    auth_db();
    $user=auth_user();
    if($_SERVER['REQUEST_METHOD']==='POST')auth_process($user);
} catch(DomainException $e){$error=$e->getMessage();}
catch(Throwable $e){http_response_code(503);$error='Služba účtů je dočasně nedostupná. Zkuste to později nebo napište na info@jirijanousek.cz.';error_log('MUJ-DIP account request failed: '.get_class($e));}
if($view==='profile'&&!$user)auth_redirect('login','Pro úpravu údajů se přihlaste.');
if($user&&in_array($view,['login','register'],true))auth_redirect('profile');
$flash=$_SESSION['flash']??'';unset($_SESSION['flash']);
$titles=['login'=>'Přihlášení','register'=>'Vytvořit účet','forgot'=>'Zapomenuté heslo','reset'=>'Nové heslo','verify'=>'Potvrdit e-mail','profile'=>'Nastavení účtu','confirm-email'=>'Potvrdit nový e-mail','privacy'=>'Údaje a soukromí'];
function field(string $name,string $label,string $type='text',bool $required=true,int $max=150,string $autocomplete=''):void{
    global $user,$view;
    $value=$_POST[$name]??($view==='profile'?($user[$name]??''):'');if(!is_string($value))$value='';
    echo '<label class="field"><span>'.h($label).($required?' <span class="required" aria-hidden="true">*</span>':'').'</span><input name="'.h($name).'" type="'.h($type).'" value="'.h($value).'" maxlength="'.$max.'" '.($required?'required ':'').'autocomplete="'.h($autocomplete).'" '.($name==='ico'?'inputmode="numeric" pattern="[0-9]{8}" ':'').'></label>';
}
function password_field(string $name,string $label,string $autocomplete='new-password',bool $required=true):void{
    echo '<label class="field"><span>'.h($label).($required?' <span class="required" aria-hidden="true">*</span>':'').'</span><span class="password-wrap"><input id="'.h($name).'" name="'.h($name).'" type="password" '.($required?'required ':'').'maxlength="72" '.($autocomplete==='new-password'?'minlength="7" ':'').'autocomplete="'.h($autocomplete).'"><button class="eye" type="button" data-password="'.h($name).'" aria-controls="'.h($name).'" aria-label="Zobrazit heslo: '.h($label).'" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="eye-slash" d="m3 3 18 18"/></svg></button></span></label>';
}
function csrf_fields(string $action,bool $token=false):void{
    echo '<input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'"><input type="hidden" name="action" value="'.h($action).'">';
    if($token){$v=$_POST['token']??'';echo '<input type="hidden" name="token" value="'.h(is_string($v)?$v:'').'">';}
}
function profile_fields():void{
    echo '<div class="fields-grid">';field('first_name','Jméno','text',true,150,'given-name');field('last_name','Příjmení','text',true,150,'family-name');
    field('company','Firma (nepovinné)','text',false,200,'organization');field('ico','IČ (nepovinné)','text',false,8);
    field('dic','DIČ (nepovinné, např. CZ12345678)','text',false,20);field('phone','Telefon','tel',true,40,'tel');
    echo '</div>';field('email','E-mail / přihlašovací jméno','email',true,254,'username');field('address','Adresa — ulice, číslo, PSČ a obec','text',true,500,'street-address');
}
?>
<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="same-origin"><title><?= h($titles[$view]) ?> · MŮJ-DIP</title><link rel="icon" href="/icon.svg?v=2" type="image/svg+xml"><link rel="stylesheet" href="/account.css?v=1"><script defer src="/account.js?v=1"></script><link rel="stylesheet" href="/guide.css?v=27"><script type="module" src="/guide.js?v=29"></script></head>
<body><header class="account-header"><a class="brand" href="/"><img src="/icon.svg?v=2" width="44" height="44" alt=""><span>MŮJ-DIP<small>Jiří Janoušek</small></span></a><a class="contact-link" href="mailto:info@jirijanousek.cz">Potřebujete pomoc?</a></header>
<main class="account-layout"><aside class="welcome"><p class="eyebrow">VÁŠ PLÁN PRO BUDOUCNOST</p><h1>Vaše cíle.<br><em>Váš osobní přístup.</em></h1><p>Přihlaste se a pokračujte k modelaci DIP, firemního příspěvku a srovnání DIP × DPS.</p><ul><li>Modelové výpočty a přehledné grafy</li><li>Export plánu do Excelu, PDF a PNG</li><li>Kontaktní údaje na jednom místě</li></ul><p class="welcome-note">Účet uchovává vaše kontaktní údaje. Investiční plán nadále ukládáte samostatně v prohlížeči nebo exportem. Plány se mezi zařízeními automaticky nesynchronizují.</p></aside>
<section class="account-card" aria-labelledby="account-title"><p class="eyebrow">MŮJ ÚČET</p><h2 id="account-title"><?= h($titles[$view]) ?></h2>
<?php if($error!==''):?><p class="message error" role="alert"><?= h($error) ?></p><?php endif;?>
<?php if($flash!==''):?><p class="message success" role="status"><?= h($flash) ?></p><?php endif;?>
<?php if($view==='login'): ?>
<p class="intro">Přihlaste se e-mailem a heslem po předchozí registraci.</p><form method="post" action="/account.php?view=login"><?php csrf_fields('login');field('email','E-mail / login','email',true,254,'username');password_field('password','Heslo','current-password');?><button class="primary" type="submit">Přihlásit se →</button></form><div class="form-links"><a href="/account.php?view=forgot">Zapomenuté heslo / nový ověřovací odkaz</a></div><p class="divider">Ještě nemáte účet?</p><a class="secondary" href="/account.php?view=register">Zaregistrovat se</a>
<?php elseif($view==='register'): ?>
<p class="intro">Pole označená * jsou povinná. Přihlášení aktivujete potvrzením e-mailu.</p><form method="post" action="/account.php?view=register"><?php csrf_fields('register');profile_fields();password_field('password','Heslo');password_field('password_confirm','Heslo znovu');?><p class="hint">Použijte alespoň 7 znaků. Heslo můžete zobrazit ikonou oka.</p><label class="check"><input type="checkbox" name="privacy" value="yes" required> <span>Seznámil/a jsem se s <a href="/account.php?view=privacy" target="_blank" rel="noopener">informacemi o zpracování údajů</a>. Nejde o souhlas s marketingem.</span></label><button class="primary" type="submit">Vytvořit účet →</button></form><p class="form-links"><a href="/account.php?view=login">Už mám účet — přihlásit se</a></p>
<?php elseif($view==='forgot'): ?>
<p class="intro">Zadejte registrační e-mail. Odkaz pro obnovu hesla platí 30 minut. U nepotvrzeného účtu odešleme nový ověřovací odkaz.</p><form method="post" action="/account.php?view=forgot"><?php csrf_fields('forgot');field('email','E-mail','email',true,254,'email');?><button class="primary" type="submit">Poslat odkaz e-mailem →</button></form><p class="form-links"><a href="/account.php?view=login">Zpět k přihlášení</a></p>
<?php elseif($view==='reset'): ?>
<p class="intro">Nastavte nové heslo. Po změně se přihlásíte znovu; stará přihlášení budou ukončena.</p><form method="post" action="/account.php?view=reset" data-token-form><?php csrf_fields('reset',true);password_field('password','Nové heslo');password_field('password_confirm','Nové heslo znovu');?><button class="primary" type="submit">Uložit nové heslo →</button></form><p class="form-links"><a href="/account.php?view=forgot">Vyžádat nový odkaz</a></p>
<?php elseif($view==='verify'): ?>
<p class="intro">Potvrzením ověříte svůj e-mail a aktivujete přihlášení.</p><form method="post" action="/account.php?view=verify" data-token-form><?php csrf_fields('verify',true);?><button class="primary" type="submit">Potvrdit e-mail →</button></form><p class="form-links"><a href="/account.php?view=forgot">Poslat nový ověřovací odkaz</a></p>
<?php elseif($view==='confirm-email'): ?>
<p class="intro">Změnu adresy potvrďte přihlášeni k původnímu účtu.</p><?php if(!$user):?><p class="message">Nejprve se <a href="/account.php?view=login" target="_blank" rel="noopener">přihlaste původním e-mailem v novém okně</a>, potom se vraťte a obnovte tento odkaz z e-mailu.</p><?php endif;?><form method="post" action="/account.php?view=confirm-email" data-token-form><?php csrf_fields('confirm-email',true);?><button class="primary" type="submit">Potvrdit změnu e-mailu →</button></form>
<?php elseif($view==='profile'): ?>
<p class="intro">Jste přihlášeni jako <strong><?= h($user['email']) ?></strong>. Zde můžete upravit své údaje.</p><a class="secondary" href="/">Přejít do kalkulačky →</a><form method="post" action="/account.php?view=profile"><?php csrf_fields('profile');profile_fields();?><details><summary>Měním e-mailovou adresu</summary><p class="hint">Zadejte současné heslo. Novou adresu bude nutné potvrdit odkazem v e-mailu.</p><?php password_field('current_password','Současné heslo pro změnu e-mailu','current-password',false);?></details><button class="primary" type="submit">Uložit údaje</button></form><details class="password-change"><summary>Změnit heslo</summary><form method="post" action="/account.php?view=profile"><?php csrf_fields('password');password_field('current_password_change','Současné heslo','current-password');password_field('password','Nové heslo');password_field('password_confirm','Nové heslo znovu');?><button class="primary" type="submit">Změnit heslo</button></form></details><form class="logout" method="post" action="/account.php?view=profile"><?php csrf_fields('logout');?><button class="secondary" type="submit">Odhlásit se</button></form>
<?php elseif($view==='privacy'): ?>
<div class="privacy-copy"><p>Správcem údajů účtu MŮJ-DIP je Jiří Janoušek. Kontakt: <a href="mailto:info@jirijanousek.cz">info@jirijanousek.cz</a>.</p><h3>Jaké údaje a proč</h3><p>Pro registraci, přihlášení, správu profilu a související podporu zpracováváme jméno, příjmení, e-mail, telefon, adresu a případně firmu, IČ a DIČ. Heslo ukládáme pouze jako jednosměrný hash. Údaje účtu nepoužíváme automaticky k marketingu.</p><p>Zajištění požadovaného účtu vychází z plnění služby na vaši žádost. Zabezpečení, omezení zneužití a technické záznamy vycházejí z oprávněného zájmu na bezpečném provozu. Používáme nezbytnou relační cookie pro přihlášení a ochranu formulářů.</p><h3>Uložení a příjemci</h3><p>Údaje jsou uloženy na hostingu aplikace, odděleně od veřejných souborů. Hostitel a poskytovatel e-mailové infrastruktury je mohou zpracovávat v rozsahu nezbytném pro provoz a doručení servisních zpráv. Údaje vedeme po dobu existence účtu; po žádosti o zrušení je odstraníme, pokud další uchování nevyžaduje právní povinnost nebo ochrana právních nároků. Krátkodobé bezpečnostní limity expirují automaticky.</p><h3>Vaše práva</h3><p>Můžete požádat o přístup, opravu, výmaz, omezení zpracování, případně přenositelnost, a vznést námitku v případech stanovených právními předpisy. Napište na uvedený e-mail; před vyřízením ověříme totožnost. Máte právo podat stížnost Úřadu pro ochranu osobních údajů.</p><p>Investiční výpočty probíhají v prohlížeči a registrací se na server nesynchronizují. Jejich místní uložení odstraníte funkcí „Vymazat uložený plán“ v kalkulačce. <a href="https://jirijanousek.cz/ochrana-osobnich-udaju/" target="_blank" rel="noopener">Další informace o zpracování údajů</a>.</p></div><p class="form-links"><a href="/account.php?view=login">Přihlášení</a> · <a href="/account.php?view=register">Registrace</a></p>
<?php endif; ?>
<p class="account-footer">© <?= date('Y') ?> Jiří Janoušek · <a href="https://jirijanousek.cz/" target="_blank" rel="noopener noreferrer">jirijanousek.cz ↗</a></p></section></main></body></html>
