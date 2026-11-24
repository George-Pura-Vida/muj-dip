<?php
declare(strict_types=1);
require __DIR__.'/auth/bootstrap.php';
auth_boot();$error='';$user=null;
try{
 $user=auth_user();
 if(($_SERVER['REQUEST_METHOD']??'GET')==='POST')auth_process($user);
}catch(DomainException $e){$error=$e->getMessage();}
catch(Throwable $e){http_response_code(503);$error='Přihlášení je dočasně nedostupné.';error_log('Private account failed: '.get_class($e));}
$requested=is_string($_GET['view']??null)?$_GET['view']:'login';
if(!in_array($requested,['login','profile'],true)){http_response_code(404);exit('Stránka není dostupná.');}
?><!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Soukromý vstup</title><style>body{font:17px system-ui;background:#f5f7f6;color:#20352e;margin:0;padding:24px}main{max-width:370px;margin:12vh auto;background:white;padding:32px;border-radius:18px}h1{font-size:25px}input,button{box-sizing:border-box;width:100%;font:inherit;padding:12px;margin:8px 0 18px;border:1px solid #b6c6bd;border-radius:8px}button{background:#176b50;color:white;border:0;cursor:pointer}.error{color:#a31e1e}a{color:#176b50}</style></head><body><main><h1>🔐 Soukromý vstup</h1>
<?php if($error!==''):?><p class="error" role="alert"><?=h($error)?></p><?php endif;?>
<?php if($user):?><p>Jste přihlášený.</p><p><a href="/">Vstoupit do aplikace →</a></p><form method="post" action="/account.php?view=login"><input type="hidden" name="csrf" value="<?=h($_SESSION['csrf'])?>"><button name="action" value="logout">Odhlásit se</button></form>
<?php else:?><p>Přístup pouze pro vlastníka.</p><form method="post" action="/account.php?view=login"><input type="hidden" name="csrf" value="<?=h($_SESSION['csrf'])?>"><input type="hidden" name="action" value="login"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" maxlength="254" required><label for="password">Heslo</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="72" required><button>Přihlásit se</button></form><?php endif;?></main></body></html>
