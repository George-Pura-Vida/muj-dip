<?php
declare(strict_types=1);
require __DIR__.'/auth/bootstrap.php';
auth_boot();
$user=auth_require();
header('Content-Type: text/html; charset=UTF-8');
$html=file_get_contents(__DIR__.'/index.html');
echo str_replace('<body>', '<body data-account-key="u'.(int)$user['id'].'">', $html);
