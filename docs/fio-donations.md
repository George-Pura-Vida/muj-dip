# MŮJ DIP – Fio API / automatické poděkování za příspěvek

Tento modul navazuje na existující veřejnou stránku /support.php.
**Ve výchozím stavu je vypnutý**, dokud správce nenastaví token,
serverový cron a e-mailový transport.

## Princip

1. Návštěvník vybere částku, uvede e-mail a aktivně požádá o jednorázové poděkování.
2. Server vytvoří jedinečný osmimístný variabilní symbol a uloží e-mail, jméno a částku do soukromé SQLite.
3. QR kód v českém SPD formátu obsahuje X-VS pro spárování. Účet zůstává 223366333/2010.
4. Cron kontroluje API Fio za posledních 14 dní read-only tokenem.
5. Kontrola: IBAN správného účtu, unikátní VS, přesná kladná částka, CZK, datum a jedinečné ID Fio pohybu.
6. Po spárování je děkovný e-mail dárci a e-mailové upozornění správci odesláno přes existující PHP mail().
7. Původní anonymní QR funguje i nadále. U anonymní platby bez VS/e-mailu nelze dárce zpětně poznat.

## Produkční nastavení

- Webový document root musí být složka dist/. PHP 8.1+, pdo_sqlite, curl, cron a funkční mail() jsou nutné.
- Úložiště je mimo web ve var/accounts/donations.sqlite vytvořené přes auth_dir().
- Ve Fio Internetbankingu vygenerujte token POUZE PRO SLEDOVÁNÍ účtu přijímajícího dary.
- Token nikdy neukládejte do GitHubu, JavaScriptu, HTML, QR kódu, chatu ani do URL veřejné aplikace.
- Pro PHP webový proces nastavte tajnou konfiguraci DONATIONS_ENABLED=1.
- Pro CLI nastavte DONATIONS_ENABLED=1 a FIO_TOKEN s reálným tokenem. Token musí být v chráněném konfiguračním prostředí mimo web (práva 0600), nikoli v parametrech příkazové řádky cronu.
- Cron spouštějte každých 5 minut příkazem:
  /usr/bin/php /ABSOLUTNI/CESTA/dist/cron/fio-sync.php
- Cron i PHP web musí mít odpovídající přístupová práva k soukromé SQLite.
- Adresa info@jirijanousek.cz vyžaduje funkční poštovní server a nastavené SPF/DKIM/DMARC.
- WebKitty nebo jiný hosting musí podporovat PHP a cron. Statický GitHub Pages neprovozuje backend.
- Cron má lock a minimální odstup Fio volání 60 sekund. Při sdílení tokenu s jinými službami koordinujte frekvenci.

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

Kód ve větvi feature/fio-donations-email je připravený k revizi. Zatím není
propojen se skutečným Fio tokenem, není naplánován cron na hostingu a
neproběhl živý test s bankou. Neprovádí změny v Moje renta,
Můj kmen ani Moje krypto.

Dokumentace Fio: https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
