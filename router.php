<?php
$path=parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if($path==='/'||$path==='/index.html'){require __DIR__.'/dist/index.php';return true;}
if(str_starts_with($path,'/auth/')){http_response_code(403);return true;}
return false;
