// Accessible field explanations and a non-modal, optional walkthrough.
const fsSource='https://financnisprava.gov.cz/cs/dane/dane/dan-z-prijmu/zamestnanci-zamestnavatele/obecne-informace';
const mfSource='https://mf.gov.cz/cs/financni-trh/ochrana-spotrebitele/aktuality/2024/dlouhodoby-investicni-produkt-a-danova-podpora-pro-54732';
const tips={
 stress:['Krizový scénář','Zapnutím nahradíte v jednom roce běžný výnos krizovou sazbou. Rozdílné poklesy jsou vaše předpoklady, nikoli důkaz, že jeden produkt musí vyhrát.'],
 shockYear:['Načasování krize','Zadejte rok od založení, například 20 pro propad před výběrem po 20 letech. Vklady po celou dobu pokračují. Stejná procentní ztráta může mít jiný dopad na počátku a na konci spoření.'],
 dipShock:['Krizový výnos DIP','Celkový výnos portfolia za zvolený rok, například −15 %. Nahradí běžný výnos; není k němu přičten. Může být stejně špatný nebo horší než DPS. Nejde o maximální možnou ztrátu Permanentního portfolia.'],
 dpsShock:['Krizový výnos DPS','Celkový výnos akciové strategie za zvolený rok, například −35 %. Jde jen o ilustraci, nikoli historický údaj ani předpověď. DPS neznamená automaticky S&P 500 a ne každý DPS tento index kopíruje.'],
 own:['Vlastní měsíční vklad','Zadejte pouze peníze, které vkládáte vy. Příspěvek firmy vyplňte zvlášť. V DIP lze vlastní vklady odečíst do zbývajícího společného limitu 48 000 Kč ročně; vyšší vklad je možný. Příklad: 2 000 Kč měsíčně znamená 24 000 Kč vlastních vkladů za rok. U DPS bez přiznaného starobního důchodu je odpočet jen z vlastních plateb nad 1 700 Kč měsíčně; nejde o celý vklad.',mfSource],
 employer:['Příspěvek zaměstnavatele','Zadejte měsíční příspěvek firmy na jednu osobu, nikoli za celý tým. Osvobození se posuzuje do 50 000 Kč ročně od téhož zaměstnavatele společně s jeho ostatními příspěvky na podporované produkty. Nejde o měsíční strop ani limit samotné investice. Přesah může podléhat dani a pojistnému.',fsSource],
 age:['Věk při založení','Zadejte aktuální věk pro model nově založeného produktu. Model nezohledňuje dřívější trvání existující smlouvy ani přesné datum narození. Věk a doba investování společně ovlivňují upozornění na řádný výběr.',fsSource],
 years:['Doba investování','Zadejte počet let od založení. Pro zachování podpory DIP musí standardně uplynout 120 kalendářních měsíců a výběr nastat nejdříve v kalendářním roce dosažení 60 let. Například při založení v 57 letech nestačí 3 roky. Zákonné výjimky a přesná data model neřeší.',fsSource],
 rate:['Modelový roční výnos','Zadejte vlastní odhad, nikoli zaručený výnos. Zde se sazba používá přímo, bez dalšího ročního poplatku. Pokud váš odhad poplatky neobsahuje, výsledek je nezohlední. Výnos se měsíčně skládá; skutečné výnosy kolísají a mohou být záporné. Případná daň z investičních výnosů v tomto základním plánu není odečtena.'],
 initial:['Počáteční částka','Zadejte existující hodnotu portfolia nebo nový jednorázový vlastní vklad. V dalším poli určete původ částky. Nový vlastní vklad může zvýšit odpočet pouze v prvním modelovém roce a jen do zbývajícího limitu; existující majetek nebo převod mezi DIP nový odpočet nevytváří.',mfSource],
 initialNew:['Původ počáteční částky','Existující majetek zvolte pro již naspořené peníze. Nový vlastní vklad zvolte jen pro nově vložené vlastní peníze v prvním modelovém roce. Nezaměňujte jej s příspěvkem firmy. Model přitom počítá i 12 pravidelných měsíčních plateb.',mfSource],
 inflation:['Inflace','Zadejte odhad ročního růstu cen, například 2,5 %. Červená křivka vyjadřuje kupní sílu výsledku v dnešních cenách. Inflace není poplatek odečítaný z účtu a její budoucí výše není zaručená.'],
 salary:['Hrubá měsíční mzda a sazba daně','Zadejte hrubou mzdu jedné osoby. Pro rok 2026 platí roční hranice 1 762 812 Kč; 23 % se použije jen na přesah a zbytek se daní 15 %. Měsíční hranice záloh je 146 901 Kč. Při mzdě 160 000 Kč a odpočtu 48 000 Kč je roční úspora 11 040 Kč; kolem hranice může odpočet zasáhnout obě sazby. Model předpokládá stejnou mzdu po celý rok, základní slevu a nezahrnuje další nezadané příjmy. Nerozhoduje pracovní pozice.',fsSource],
 otherOwn:['Jiné využité odpočty za rok','Zadejte již uplatňovanou část odpočtu na ostatní daňově podporované produkty na stáří a pojištění dlouhodobé péče. Jde o uznatelný odpočet ze základu daně, nikoli všechny platby ani daňovou úsporu. U DPS bez přiznaného starobního důchodu jde o vlastní platby nad 1 700 Kč měsíčně. Společný limit je 48 000 Kč ročně. Například jiný odpočet 12 000 Kč ponechá pro DIP 36 000 Kč.',fsSource],
 otherEmployer:['Jiné příspěvky téhož zaměstnavatele','Zadejte roční součet ostatních příspěvků od stejného zaměstnavatele na daňově podporované produkty na stáří a pojištění dlouhodobé péče. Nepatří sem vaše vlastní vklady ani obecné nepeněžní benefity. Tento součet s příspěvkem na DIP sdílí limit osvobození 50 000 Kč. Model zde neprovádí samostatné vyhodnocení více zaměstnavatelů.',fsSource],
 employees:['Počet zaměstnanců','Zadejte počet osob se stejnou mzdou a příspěvkem. Náklady a úspory firmy se násobí tímto počtem, hodnoty pro zaměstnance zůstávají na jednu osobu. Pro vedení firmy s vyšší mzdou a ostatní zaměstnance udělejte samostatné modely.'],
 mode:['Jak porovnávat mzdu a DIP','Stejná částka porovnává příspěvek DIP s navýšením hrubé mzdy o stejnou částku. Stejný rozpočet firmy hledá mzdu při stejných celkových nákladech. Čistá mzda je ihned dostupná, DIP je investice s omezením výběru. Úspora firmy je rozdíl mzdových nákladů, nikoli automaticky sleva na dani z příjmů firmy.'],
 dipRate:['Výnos DIP','Zadejte odhad ročního výnosu modelového fondu. Přepínač dole určuje, zda již zahrnuje průběžné náklady. Stejná sazba pro DIP a DPS je matematický scénář, ne tvrzení, že strategie mají stejné riziko nebo budoucí výnos.'],
 dpsRate:['Výnos DPS','Zadejte modelový roční výnos DPS. Při použití již zveřejněného čistého výnosu zvolte dole režim výnosu po nákladech, aby se stejné poplatky neodečetly dvakrát. Výnos není garantovaný.'],
 dipEntry:['Vstupní poplatek DIP','Zadejte procento poplatku z každé vlastní a firemní platby v tomto modelu. Model nepředstavuje předplacený poplatek z cílové částky. Použijte skutečný sazebník nebo svůj výslovný předpoklad; nejde o zákonnou sazbu.'],
 dpsEntry:['Vstupní poplatek DPS','Zadejte poplatek ze součtu vlastních a firemních plateb, bez státního příspěvku. Předvolba modelu je 0 %. Vyplňte podle konkrétních podmínek; pole není tvrzením, že takový poplatek poskytovatel účtuje.'],
 dipFee:['Celkové průběžné náklady DIP','Zadejte celkové procentní roční náklady, které chcete v modelu odečítat. Zkontrolujte správu, náklady fondů i další náklady konkrétní investice. Pole lze kdykoliv přepsat. Úprava nákladů přepne model na výnos před náklady, aby se nová částka započítala.'],
 dpsFee:['Správa DPS','Zadejte roční náklad podle statutu konkrétního fondu nebo modelový předpoklad. Předvolby jsou ilustrativní, nejde o univerzální sazebník. Pole můžete přepsat; úpravou se model přepne na výnos před náklady. Zkontrolujte poté i sazbu výnosu.'],
 dpsPerformance:['Výkonnostní úplata DPS','Toto je odhad poplatku z kladného ročního výnosu po správě, nikoli výstupní daň. Model je zjednodušený a nepoužívá přesnou zákonnou metodiku historických maxim jednotky konkrétního fondu. Pro srovnání reálných výnosů můžete zadat již čistý výnos.'],
 dipProfile:['Předvolba DIP','Předvolba pouze vyplní modelové poplatky. Nejde o nabídku, sazebník ani doporučení konkrétního produktu. Upravte parametry podle svého scénáře.'],
 dpsProfile:['Předvolba DPS','Předvolba vyplní modelové poplatky, nikoli výnos nebo riziko fondu. Parametry porovnejte se statutem a klíčovými informacemi konkrétního fondu.'],
 netReturns:['Výnos před náklady, nebo po nich','U hrubého výnosu model odečítá zadanou správu a výkonnostní úplatu. U čistého výnosu je již předpokládá v sazbě a znovu je neodečte. Vstupní poplatek zůstává v obou režimech.'],
 dipTax:['Daň z prodeje v DIP','Samotné splnění 120 měsíců a věku pro podporu nezaručuje osvobození všech výnosů. Automatický model posuzuje prodej cenných papírů: hodnotový test 100 000 Kč hrubých prodejů a časový test jednotlivých nákupů. Zdanitelný zisk přičte k zadanému příjmu a použije 15 / 23 %. Dividendy a další nezadané příjmy se nepočítají. Volba všech prodejů osvobozených je váš modelový předpoklad.',mfSource],
 otherSales:['Další hrubé prodeje cenných papírů','Zadejte jiné hrubé příjmy z prodeje cenných papírů v roce výběru, ne zisk. Použijí se k posouzení limitu 100 000 Kč společně s modelovým prodejem. Model nezná jejich pořizovací ceny a samostatnou daň z těchto jiných prodejů nepočítá.',mfSource],
 payout:['Způsob výplaty DPS','Jednorázová výplata v modelu nové smlouvy podléhá 15% dani z kladného zhodnocení. Alternativní nejméně desetiletá penze modeluje osvobození; zobrazuje kapitál pro postupnou výplatu, nikoli peníze okamžitě na účet. Starší smlouvy a jiné dávky mohou mít odlišné podmínky.','https://www.nn.cz/poradna/penze/vyplata-penze.html'],
 pensioner:['Přiznaný starobní důchod','Ano znamená předpoklad přiznaného starobního důchodu po celý modelový horizont: bez státního příspěvku DPS, s možností odpočtu vlastních plateb od první koruny v mezích společného limitu a skutečné daňové povinnosti. Nepřepíná automaticky stav při dosažení určitého věku.',fsSource],
 loyalty:['Volitelný model bonusu','Jde pouze o ilustrační model, nikoli standardní vlastnost nebo automatický nárok klienta DPS. Bonus je před případnou daní a mimo hlavní součet. Podmínky skutečného programu ověřte u poskytovatele.'],
 loyaltyRate:['Výnos bonusového konta','Zadejte odhad zhodnocení samostatného modelového bonusu. Není garantovaný. Bonus se nepřičítá k hlavnímu výsledku.']
};
const accountTips={
 first_name:['Jméno','Vyplňte své jméno. Údaje účtu slouží ke správě profilu; registrace není sjednáním investičního produktu.'],
 last_name:['Příjmení','Vyplňte příjmení. Údaje můžete po přihlášení upravit v Můj účet.'],
 company:['Firma','Nepovinné: obchodní název firmy. Pokud se registrujete jako soukromá osoba, ponechte prázdné.'],
 ico:['IČ','Nepovinné: osm číslic identifikačního čísla osoby, včetně úvodních nul. Nevyplňujte rodné číslo.'],
 dic:['DIČ','Nepovinné: daňové identifikační číslo včetně označení země, například CZ. Pokud je nemáte, ponechte prázdné.'],
 phone:['Telefon','Vyplňte telefon včetně předvolby, například +420 777 123 456. Slouží ke kontaktu a případnému ověření správcem. Nejde o ověření pomocí SMS ani o souhlas s marketingem.'],
 email:['E-mail a login','Použijte dostupnou e-mailovou adresu. Slouží jako přihlašovací jméno a pro potvrzení registrace i obnovu hesla. Změna adresy v profilu vyžaduje současné heslo a potvrzení nové adresy.'],
 address:['Adresa','Nepovinné: ulice, číslo, PSČ a obec. Pro přístup do kalkulačky adresu nepotřebujete. Údaje se ukládají do profilu, investiční plány se tím automaticky nesynchronizují mezi zařízeními.'],
 password:['Heslo','Použijte alespoň 7 znaků, nejvýše 72 bajtů. Delší jedinečné heslo usnadní ochranu účtu. Ikona oka přepíná skrytí a zobrazení. Heslo nikomu neposílejte.'],
 password_confirm:['Heslo znovu','Zadejte stejné heslo pro kontrolu překlepu. Ikonou oka můžete text zobrazit. Formulář průvodce nikdy sám neodesílá.'],
 current_password:['Současné heslo','Vyplňujte pouze při změně e-mailu v nastavení účtu.'],
 current_password_change:['Současné heslo','Pro změnu hesla ověřte stávající heslo. Po změně se stará přihlášení ukončí.']
};
let serial=0,current=null,tour=null,opener=null;
const entries=[],bubble=document.createElement('section');
bubble.className='guide-bubble';bubble.hidden=true;bubble.setAttribute('role','dialog');bubble.setAttribute('aria-label','Nápověda k vyplnění');
const close=document.createElement('button');close.type='button';close.className='guide-close';close.textContent='×';close.setAttribute('aria-label','Zavřít nápovědu');
const progress=document.createElement('p');progress.className='guide-progress';progress.setAttribute('aria-live','polite');
const title=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a'),actions=document.createElement('div');
title.id='guide-title';bubble.setAttribute('aria-labelledby',title.id);body.id='guide-description';link.textContent='Oficiální zdroj ↗';link.target='_blank';link.rel='noopener noreferrer';actions.className='guide-actions';
const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.textContent='← Zpět';actions.append(prev,next);bubble.append(close,progress,title,body,link,actions);document.body.append(bubble);
function finish(restore=true){if(current){current.label.classList.remove('guide-active');current.button.setAttribute('aria-expanded','false');current.input.removeAttribute('aria-describedby');}bubble.hidden=true;current=null;tour=null;if(restore)opener?.focus({preventScroll:true});}
function position(){if(!current)return;const r=current.label.getBoundingClientRect(),w=Math.min(430,innerWidth-24);bubble.style.width=w+'px';bubble.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right+12))+'px';const h=bubble.offsetHeight;bubble.style.top=Math.max(12,Math.min(innerHeight-h-12,r.top))+'px';}
function show(entry,steps=null,index=0){
 finish(false);current=entry;tour=steps?{steps,index}:null;
 for(const d of entry.label.closest('details')?[entry.label.closest('details')]:[])d.open=true;
 const advanced=entry.label.closest('#advancedSettings');if(advanced){advanced.hidden=false;const b=document.getElementById('advancedToggle');b.setAttribute('aria-expanded','true');b.querySelector('span').textContent='−';}
 progress.textContent=tour?'Krok '+(index+1)+' z '+steps.length:'Vysvětlivka '+entry.number;
 title.textContent=entry.tip[0];body.textContent=entry.tip[1];link.hidden=!entry.tip[2];if(entry.tip[2])link.href=entry.tip[2];
 actions.hidden=!tour;prev.disabled=index===0;next.textContent=steps&&index===steps.length-1?(steps.moduleRoot?'Zobrazit výsledek →':'Dokončit ✓'):'Další →';
 bubble.hidden=false;entry.label.classList.add('guide-active');entry.button.setAttribute('aria-expanded','true');entry.input.setAttribute('aria-describedby',body.id);
 entry.label.scrollIntoView({block:'center',behavior:'instant'});if(tour)entry.input.focus({preventScroll:true});position();
}
close.onclick=()=>finish();prev.onclick=()=>{if(!tour)return;let i=tour.index-1;while(i>=0&&tour.steps[i].input.disabled)i--;if(i>=0)show(tour.steps[i],tour.steps,i);};
next.onclick=()=>{if(!tour)return;if(!current.input.checkValidity()){current.input.reportValidity();return;}let i=tour.index+1;while(i<tour.steps.length&&tour.steps[i].input.disabled)i++;if(i===tour.steps.length){const root=tour.steps.moduleRoot;finish(!root);if(root){const result=root.querySelector('.model-summary');if(result){result.setAttribute('tabindex','-1');result.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});result.focus({preventScroll:true});}}return;}show(tour.steps[i],tour.steps,i);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!bubble.hidden){e.preventDefault();finish();}});
document.addEventListener('click',e=>{if(!bubble.hidden&&!tour&&!bubble.contains(e.target)&&!current.label.contains(e.target))finish(false);});
document.addEventListener('click',e=>{if(e.target.closest('[data-tab]'))finish(false);});
window.addEventListener('resize',position);window.addEventListener('scroll',position,{passive:true});
function setup(root,account=false){
 const fields=[...root.querySelectorAll(account?'input[name],textarea[name]':'input[data-key],select[data-key],input[data-cmp],select[data-cmp]')].filter(x=>x.type!=='range'&&x.type!=='hidden'&&x.type!=='checkbox');
 let count=0;const local=[];
 for(const input of fields){
  const key=account?input.name:input.dataset.key||input.dataset.cmp,tip=(account?accountTips:tips)[key],label=input.closest('label');if(!tip||!label||label.querySelector('.guide-help'))continue;
  const labelText=[...label.childNodes].find(n=>n.nodeType===3&&n.textContent.trim())||[...label.children].find(n=>n.tagName==='SPAN'&&!n.querySelector('input'));
  if(!labelText)continue;const row=document.createElement('span');row.className='guide-label-row';label.insertBefore(row,labelText);
  const name=document.createElement('span');if(labelText.nodeType===3){name.textContent=labelText.textContent;labelText.remove();}else{name.append(labelText);}row.append(name);
  const button=document.createElement('button');button.type='button';button.className='guide-help';button.textContent=String(++count);button.setAttribute('aria-label','Nápověda '+count+': '+tip[0]);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','guide-description');row.append(button);
  const id=++serial;input.id||='guide-input-'+id;label.htmlFor=input.id;name.id='guide-label-'+id;input.setAttribute('aria-labelledby',name.id);
  const entry={input,label,button,tip,number:count,id};entries.push(entry);local.push(entry);
  button.onclick=e=>{e.preventDefault();e.stopPropagation();opener=button;if(current===entry){finish();return;}show(entry);};
 }
 if(!local.length)return;
 const toolbar=document.createElement('div');toolbar.className='guide-toolbar';
 const start=document.createElement('button');start.type='button';start.className='guide-start';start.textContent=account?'🧭 Pomocník s vyplněním':'🧭 Začněte zde – průvodce';
 const basicKeys={plan:['own','employer','age','years','rate'],company:['employees','salary','employer','mode','otherEmployer'],comparison:['own','employer','age','years','dipRate','dpsRate','netReturns']}[root.id];
 const steps=basicKeys?basicKeys.map(key=>local.find(e=>(e.input.dataset.key||e.input.dataset.cmp)===key)).filter(Boolean):local;steps.moduleRoot=account?null:root;
 start.onclick=()=>{opener=start;show(steps[0],steps);};
 const hint=document.createElement('p');hint.textContent=account?'Číslo u pole otevře nápovědu. Pomocník vás provede krok za krokem.':'1. Zadejte údaje → 2. Prohlédněte si výsledek → 3. Exportujte. Číslo u pole otevře nápovědu; další nastavení jsou dobrovolná.';
 toolbar.append(start,hint);const anchor=account?root.querySelector('form'):root.querySelector('aside.inputs');(anchor||root).prepend(toolbar);
}
for(const id of ['plan','company','comparison']){const root=document.getElementById(id);if(root)setup(root);}

const account=document.querySelector('.account-card');if(account&&document.querySelector('form'))setup(account,true);

