# MŮJ DIP – Fio API / automatické poděkování za příspěvek

Tento modul navazuje na existující veřejnou stránku /support.php.
**Ve výchozím stavu je vypnutý**, dokud správce nenastaví token,
serverový cron a e-mailový transport.

## Princip

1. Návštěvník vybere částku, uvede e-mail a aktivně požádá o jednorázové poděkování.
2. Server vytvoří jedinečný osmimístný variabilní symbol a uloží e-mail, jméno a částku do soukromé SQLite.
3. QR kód v českém SPD formátu obsahuje X-VS pro spárování. Účet zůstává 223366333/2010.
4. Cron kontroluje API Fio za posledních 14 dní read-only tokenem.
5. Ověření účtu: IBAN odpovídá cílovému účtu. Fio JSON datum pohybu je UNIX časová značka v milisekundách (podporujeme i textový datumový formát).
6. Všechny příchozí kladné transakce s jedinečným Fio ID (s VS i bez VS, v různých měnách) se ukládají do privátní SQLite fronty. Každá vyvolá právě jeden pokus úspěšně převzatého oznámení správci `jgjanousek@gmail.com`; datum, částka, odesílatel (je-li uveden) a zpráva jsou součástí e-mailu.
7. Poděkování dárci odchází nezávisle pouze tehdy, když se platba CZK spáruje s předem vytvořeným QR e-mailem podle VS, přesné částky, data a Fio ID.
8. Oznámení správci **nepotřebuje** e-mail dárce; u anonymní platby nelze automaticky odpovědět dárci.
9. Vše se ukládá pod unikátním bankovním ID, aby další spuštění Cronu neposílala tatáž upozornění znovu. Zpětně se při prvním nasazení prověří pohyby za posledních 14 dní.

## Produkční nastavení

- Webový document root musí být složka dist/. PHP 8.1+, pdo_sqlite, curl, cron a funkční mail() jsou nutné.
- Úložiště je mimo web ve var/accounts/donations.sqlite vytvořené přes auth_dir().
- Ve Fio Internetbankingu vygenerujte token POUZE PRO SLEDOVÁNÍ účtu přijímajícího dary.
- Token nikdy neukládejte do GitHubu, JavaScriptu, HTML, QR kódu, chatu ani do URL veřejné aplikace.
- Na WebKitty je možné místo serverových env proměnných použít dva SOUKROMÉ soubory v kořenové složce projektu `var/` (tato složka je v `.gitignore`, mimo veřejné `dist/`):
  1. `var/fio-token.txt` = samotný Fio read-only token bez dalšího textu; oprávnění souboru musí být `0600`. Token se načítá pouze v CLI cron skriptu. Pokud má soubor širší oprávnění, synchronizace odmítne běžet.
  2. `var/donations-enabled.flag` = jediný znak `1` (lze přidat až po dokončení testu tokenu). Tento soubor zapíná vytvoření QR platebního požadavku i synchronizaci. Není tajný.
- Alternativně lze použít původní serverové proměnné `DONATIONS_ENABLED=1` pro web i CLI a `FIO_TOKEN` jen pro CLI; hodnotu tokenu nikdy neuvádějte do příkazu Cron, jeho parametrů ani do HTTP odpovědi.
- Doporučený Cron na tomto WebKitty hostingu je `/usr/bin/php84 /home/sites/1a/1/1f8017897e/muj-dip/dist/cron/fio-sync.php`, každých 5 minut. Nezaměňujte s `php84 -l`, který pouze testuje syntaxi.
- Cron spouštějte každých 5 minut příkazem:
  /usr/bin/php /ABSOLUTNI/CESTA/dist/cron/fio-sync.php
- Cron i PHP web musí mít odpovídající přístupová práva k soukromé SQLite.
- Adresa info@jirijanousek.cz vyžaduje funkční poštovní server a nastavené SPF/DKIM/DMARC.
- WebKitty nebo jiný hosting musí podporovat PHP a cron. Statický GitHub Pages neprovozuje backend.
- Cron má lock a minimální odstup Fio volání 60 sekund. Při sdílení tokenu s jinými službami koordinujte frekvenci.

## Jednorázové zpracování a nasazení

- Nový mechanismus se aktivuje automaticky po `git pull` na WebKitty a běží stávajícím Cron příkazem `php84 dist/cron/fio-sync.php` každých 5 minut. **Token ani příkazy Cronu není nutné měnit.**
- První úspěšná synchronizace po aktualizaci importuje příchozí platby z posledních 14 dní. Pokud byly na bankovním účtu právě dvě testovací platby, správci odejdou dvě samostatná upozornění. Pokud tam byly další příchozí transakce, odejdou upozornění i na ně (nejde nutně o dary).
- Bankovní účet musí být ten, pro který je token určen; odchozí pohyby se ignorují. Jednotlivé měny se vypisují zvlášť.
- Jediným zdrojem oznámení pro správce je nová tabulka `fio_inbound_notifications`; starší notifikace v `donations.admin_status` se respektují a nepřeposílají znovu.
- Tlačítko `Test Command` lze použít na bezpečnou diagnostiku `/usr/bin/php84 /home/sites/1a/1/1f8017897e/muj-dip/dist/cron/donation-status.php`; vrací počty `admin_notice=pending|sending|failed|sent`, bez jmen, VS, e-mailů a tokenů.
- `sent` = PHP `mail()` úspěšně předalo zprávu poštovnímu systému, nikoli garance doručení do Gmailu. Při pádu ve stavu `sending` se pokus **sám neopakuje**, protože není jisté, zda zpráva už odešla; stav je třeba vyšetřit ručně.
- Testy v CI zkouší záznam bez VS, příchozí CZK i EUR, vyloučení odchozích plateb, deduplikaci, formát JSON času a ochranu proti nesprávnému IBANu. Skutečné doručení na WebKitty je nutné ověřit při živém běhu.

## Společná platební logika pro čtyři weby

- **Můj DIP** je jediný platební backend: vlastní donation-intent.php, veřejná brána donation-intent-cross.php a jediný CLI cron/fio-sync.php (každých 5 minut).
- **Moje renta**, **Moje krypto**, **Můj kmen** a **Můj obchod** volají z veřejné stránky /support.html přes HTTPS a CORS službu Můj DIP. Brána podle povoleného HTTP Origin určí, z jaké aplikace příspěvek pochází.
- Klient zadá e-mail, volitelně jméno a částku, potvrdí jednorázové poděkování a obdrží QR s unikátním osmimístným VS. Pokud endpoint selže, formulář zobrazí chybu; lze přispět anonymním QR bez e-mailu.
- Po spárování příchozí platby s částkou, měnou, VS, bankovním ID a datem odejde jednomu dárci jediné poděkování s názvem správné aplikace. Správce obdrží na Fio ID přesně jedno oznámení za pohyb. Předmět správci obsahuje název správné aplikace, pokud byla platba spárována přes VS; u neoznačených plateb používá neutrální označení Fio.
- Soukromá databáze na Můj DIP automaticky doplní existující řádky značkou muj-dip. Uživatelská data ostatních webů se nemění.
- Bankovní token, SQLite databáze dárců a Fio Cron zůstávají **pouze na Můj DIP**, nikdy se nekopírují do dalších webů, JavaScriptu ani GitHubu.
- **Pořadí WebKitty deploymentu:** nejdřív Můj DIP main, zkontrolovat funkčnost nové brány, potom main v Moje renta, Moje krypto, Můj kmen a Můj obchod.
- **Živý test:** v každé aplikaci vytvořit QR s e-mailem, zaplatit, ověřit skutečné doručení zprávy dárci i správci a při dalším Cronu žádné duplikáty. Jestli e-mail nedorazí, spusťte diagnostiku `dist/cron/donation-status.php` na hostingu Můj DIP: ukáže poslední synchronizaci Fio, počet požadavků a stav e-mailů po aplikacích. Nepotvrzený požadavek `pending` sám o sobě nedokazuje připsání platby. GitHub testy nejsou dokladem živého doručení.

## Personalizované e-maily (všech pět aplikací)

- Při obnově doručování cron používá původní textový formát se zachováním českého oslovení a názvu aplikace. Grafická varianta zůstává dostupná v šablonách a testech.
- Grafický styl vychází z hlavního webu jirijanousek.cz: tmavé záhlaví JIŘÍ JANOUŠEK / JJ, zlatá barva, přehled částky, podpis a kontakty. Responzivní **HTML s textovou alternativou** (MIME multipart/alternative), bez externích sledovacích obrázků.
- Oba typy zpráv centrálně tvoří soubor dist/auth/donation-mail.php pro Můj DIP, Moje renta, Moje krypto, Můj kmen a Můj obchod. Oznámení správci obsahuje bankovní informace a při spárování také e-mail a jméno z formuláře.
- Jméno a příjmení se používá pro oslovení: **Jiří Janoušek → pane Janoušku**, **Pavel Sova → pane Sovo**, **Jana Nováková → paní Nováková**. Pokud jméno chybí nebo je nejednoznačné, zůstává bezpečné **Dobrý den,**. Skloňování nemusí obsáhnout všechny varianty.
- Bez skutečného bankovního potvrzení se žádné poděkování dárci neodesílá. Anonymní platby a jiné nespárované pohyby dostávají pouze neutrální administrátorské oznámení.
- HTML escapuje dynamická data, MIME části jsou Base64. From a Reply-To zůstávají info@jirijanousek.cz. Žádný bankovní token se nenačítá do zpráv.
- Soukromý soubor `var/donation-cron-status.json` ukazuje poslední fázi synchronizace, počty předaných e-mailů nebo stav HTTP odpovědi. Neobsahuje údaje plátců, variabilní symboly ani tokeny.
- **Přeprava zůstává přes PHP mail() na hostingu Můj DIP**, nejde o přímé použití soukromého SMTP nastavení hlavního webu. Doručení, SPF/DKIM a spam složky musí být ověřeny po WebKitty deploymentu.
- Testy: php donation-mail.test.php, php donations.test.php a GitHub Actions. Skutečné doručení obou zpráv ověří reálná platba s VS.

## Test

1. Vytvořit QR s poděkováním pro vlastní e-mail a 1 Kč.
2. Zkontrolovat unikátní VS v QR a při kopírování platebních údajů.
3. Zaplatit. Teprve po skutečném připsání a bankovním spárování musí odejít děkovný a interní e-mail.
4. Po druhé synchronizaci se e-maily nesmí odeslat znovu.
5. Nesprávná částka / měna / VS nesmí vytvořit potvrzenou platbu.
6. Ověřit doručení zpráv, nikoli pouze návratový stav mail().

Lokální testy (bez API): php donations.test.php, npm test,
PHP kontrola syntaxe nových souborů pomocí php -l.

## Bezpečnost / omezení

- Samotné kliknutí uživatele platbu nepotvrzuje; potvrzuje ji výhradně Fio API.
- E-mail je použit pouze na jednorázové poděkování, nikoli k marketingu.
- Neuvádět v logu Fio token ani celé URL API obsahující token.
- Údaje dárce nejsou vložené do QR, ale pouze v privátní SQLite mimo web.
- Zprávy ve stavu sending se po pádu procesu automaticky neopakují kvůli riziku duplicit. Správce musí ověřit doručení.
- E-maily ve stavu failed se mohou opakovat. Samotný PHP mail() nezaručuje doručení do schránky.
- Doplňte retenční pravidla, informaci o ochraně osobních údajů, zálohování a monitoring cron úloh.

## Stav

Dřívější živý test potvrdil spojení s Fio API a doručení oznámení správci. Nové sdílené formuláře ve webových aplikacích Moje renta, Moje krypto a Můj kmen potřebují nasadit nejprve změny Můj DIP a poté aktualizace jednotlivých webů. Doručení poděkování dárci z těchto aplikací musí být ověřeno živou platbou se správným VS.

Dokumentace Fio: https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
