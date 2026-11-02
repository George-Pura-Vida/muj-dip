<?php
declare(strict_types=1);
require __DIR__.'/auth/bootstrap.php';
auth_boot();
$user=auth_require();
header('Content-Type: text/html; charset=UTF-8');
$html=file_get_contents(__DIR__.'/index.html');
if (auth_is_admin($user)) $html=str_replace('<a class="nav menu-account"', '<a class="nav" href="/account.php?view=approvals">Správa uživatelů</a><a class="nav menu-account"', $html);
$quickLabel=auth_is_admin($user)?'Admin':'Účet';
$quickUrl=auth_is_admin($user)?'/account.php?view=approvals':'/account.php?view=profile';
$html=str_replace('<button id="menuToggle"', '<a class="account-shortcut" href="'.$quickUrl.'">'.$quickLabel.'</a><button id="menuToggle"', $html);
$logout='<form class="nav-logout" method="post" action="/account.php?view=login"><input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'"><input type="hidden" name="action" value="logout"><button type="submit" class="nav">Odhlásit se</button></form>';
$html=str_replace('</div></nav></header>', $logout.'</div></nav></header>', $html);
echo str_replace('<body>', '<body data-account-key="u'.(int)$user['id'].'">', $html);

