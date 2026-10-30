# MŮJ-DIP

Webová aplikace pro modelování dlouhodobého investičního produktu a příspěvků zaměstnavatele. Určená pro doménu https://muj-dip.jirijanousek.cz.

## Funkce

- Vlastní a firemní příspěvky, sdílené daňové limity.
- Roční odhad daňové úspory podle parametrů roku 2026.
- Vývoj investice včetně poplatku a inflace.
- Porovnání DIP se zvýšením mzdy při stejné hrubé částce nebo stejném nákladu firmy.
- Místní uložení plánu, import/export JSON, CSV a tisk.

## Spuštění a ověření

Stačí libovolný statický HTTP server nad složkou `dist`. Aplikace nemá externí závislosti ani build krok. Testy: `node --test tests.mjs` (Node.js 22+).

## Publikování

V nastavení GitHub repozitáře otevřete **Settings → Pages → Build and deployment → Source → GitHub Actions**. Workflow při změně větve `main` ověří výpočty a publikuje složku `dist`. V **Custom domain** nastavte `muj-dip.jirijanousek.cz` a v DNS nasměrujte CNAME `muj-dip` na `george-pura-vida.github.io`. Po ověření certifikátu zapněte HTTPS.

## Výpočet a omezení

Podrobné parametry, pravidla a oficiální zdroje jsou na záložce „Pravidla a výpočty“. Výpočty jsou orientační roční model, nikoli měsíční mzdový systém nebo nabídka konkrétního fondu. Pravidla budoucích let a příjmy se pro ilustraci nemění. Předpokládaný výnos není garantovaný. Výnos je snížen o zadaný roční průběžný poplatek. Vstupní/výstupní poplatky a případné daně uvnitř DIP se nemodelují.

Vklady a úspory zaměstnavatele nejsou likvidní hotovost pro zaměstnance. Daňová úspora není automaticky reinvestována. Výpočty probíhají v prohlížeči; nastavení se ukládá jen po volbě „Uložit plán“. Zdrojový kód klientské aplikace je přístupný návštěvníkům i čtenářům veřejného repozitáře.
