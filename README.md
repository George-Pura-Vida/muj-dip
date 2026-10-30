# M�J-DIP

Webov� aplikace pro modelov�n� dlouhodob�ho investi�n�ho produktu a p��sp�vk� zam�stnavatele. Ur�en� pro dom�nu https://muj-dip.jirijanousek.cz.

## Funkce

- Vlastn� a firemn� p��sp�vky, sd�len� da�ov� limity.
- Ro�n� odhad da�ov� �spory podle parametr� roku 2026.
- V�voj investice v�etn� poplatku a inflace.
- Porovn�n� DIP se zv��en�m mzdy p�i stejn� hrub� ��stce nebo stejn�m n�kladu firmy.
- M�stn� ulo�en� pl�nu, import/export JSON, CSV a tisk.

## Spu�t�n� a ov��en�

Sta�� libovoln� statick� HTTP server nad slo�kou `dist`. Aplikace nem� extern� z�vislosti ani build krok. Testy: `node --test tests.mjs` (Node.js 22+).

## Publikov�n�

V nastaven� GitHub repozit��e otev�ete **Settings  Pages  Build and deployment  Source  GitHub Actions**. Workflow p�i zm�n� v�tve `main` ov��� v�po�ty a publikuje slo�ku `dist`. V **Custom domain** nastavte `muj-dip.jirijanousek.cz` a v DNS nasm�rujte CNAME `muj-dip` na `george-pura-vida.github.io`. Po ov��en� certifik�tu zapn�te HTTPS.

## V�po�et a omezen�

Podrobn� parametry, pravidla a ofici�ln� zdroje jsou na z�lo�ce "Pravidla a v�po�ty". V�po�ty jsou orienta�n� ro�n� model, nikoli m�s��n� mzdov� syst�m nebo nab�dka konkr�tn�ho fondu. Pravidla budouc�ch let a p��jmy se pro ilustraci nem�n�. P�edpokl�dan� v�nos nen� garantovan�. V�nos je sn��en o zadan� ro�n� pr�bاn� poplatek. Vstupn�/v�stupn� poplatky a p��padn� dan� uvnit� DIP se nemodeluj�.

Vklady a �spory zam�stnavatele nejsou likvidn� hotovost pro zam�stnance. Da�ov� �spora nen� automaticky reinvestov�na. V�po�ty prob�haj� v prohl��e�i; nastaven� se ukl�d� jen po volb� "Ulo�it pl�n". Zdrojov� k�d klientsk� aplikace je p��stupn� n�v�t�vn�k�m i �ten���m ve�ejn�ho repozit��e.

