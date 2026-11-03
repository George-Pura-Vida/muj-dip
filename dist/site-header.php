<?php
// Shared navigation for account, support, administration and legal pages.
$menuUser=$user??null;
$menuPath=basename($_SERVER['SCRIPT_NAME']??'');
$menuItems=[['/?tab=plan','🎯','Můj DIP',''],['/?tab=company','🏢','Pro firmu',''],['/?tab=comparison','⚖️','DIP × DPS',''],['/?tab=method','💡','Pravidla a výpočty',''],['/support.php','💛','Podpořit','menu-support']];
$menuItems[]=['/?tab=plan&download=pdf','📄','Stáhnout PDF','menu-pdf'];
if($menuUser&&auth_is_admin($menuUser))$menuItems[]=['/admin.php','🛡️','Správa uživatelů',''];
if($menuUser)$menuItems[]=['/account.php?view=profile','👤','Můj účet','menu-account'];
else {$menuItems[]=['/account.php?view=login','👤','Přihlášení','menu-account'];$menuItems[]=['/account.php?view=register','✨','Registrace','menu-account'];}
$menuItems[]=['/#kontakt','💬','Kontakt','menu-contact'];
?>
<header class="site-header"><a class="brand" href="/"><img src="/icon.svg?v=2" width="44" height="44" alt=""><span>MŮJ-DIP<small>Jiří Janoušek</small></span></a><button id="menuToggle" class="menu-toggle" type="button" aria-controls="topNav" aria-expanded="false" aria-label="Otevřít menu"><span class="menu-lines" aria-hidden="true">☰</span><span>Menu</span></button><nav id="topNav" aria-label="Hlavní navigace"><div class="menu-pages">
<?php foreach($menuItems as [$url,$icon,$label,$class]):
$current=($menuPath==='support.php'&&$class==='menu-support')||($menuPath==='admin.php'&&$url==='/admin.php')||($menuPath==='account.php'&&$url==='/account.php?view='.($view??'')); ?>
<a class="nav <?= h($class) ?><?= $current?' active':'' ?>" href="<?= h($url) ?>"<?= $current?' aria-current="page"':'' ?>><span class="ui-icon" aria-hidden="true"><?= h($icon) ?></span><span class="nav-label"><?= h($label) ?></span></a>
<?php endforeach; ?></div>
<?php if($menuUser): ?><form class="nav-logout" method="post" action="/account.php?view=login"><input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="logout"><button type="submit" class="nav"><span class="ui-icon" aria-hidden="true">🚪</span><span class="nav-label">Odhlásit se</span></button></form><?php endif; ?>
</nav></header>
