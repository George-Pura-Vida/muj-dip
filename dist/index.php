<?php
declare(strict_types=1);
require __DIR__.'/auth/bootstrap.php';
auth_boot();
$user=auth_require();
header('Content-Type: text/html; charset=UTF-8');
// Preserve the source origin for the contact form submitted to jirijanousek.cz.
header('Referrer-Policy: strict-origin');
$html=file_get_contents(__DIR__.'/index.html');
if (auth_is_admin($user)) $html=str_replace('<a class="nav menu-account"', '<a class="nav" href="/admin.php"><span class="ui-icon ui-purple" aria-hidden="true">🛡️</span><span class="nav-label">Správa uživatelů</span></a><a class="nav menu-account"', $html);
$logout='<form class="nav-logout" method="post" action="/account.php?view=login"><input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'"><input type="hidden" name="action" value="logout"><button type="submit" class="nav"><span class="ui-icon ui-slate" aria-hidden="true">🚪</span><span class="nav-label">Odhlásit se</span></button></form>';
$html=str_replace('<!--account-actions-->', $logout, $html);
echo str_replace('<body>', '<body data-account-key="u'.(int)$user['id'].'">', $html);


