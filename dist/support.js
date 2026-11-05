import {payment,amountInHellers,paymentDescriptor} from './support-payment.js?v=2';
import {qrcodegen} from './vendor/qrcodegen.js?v=1';
const input=document.getElementById('supportAmount'),error=document.getElementById('paymentError'),
  preview=document.getElementById('paymentPreview'),qrHost=document.getElementById('paymentQr'),
  status=document.getElementById('supportStatus'),
  donorEmail=document.getElementById('donorEmail'),donorName=document.getElementById('donorName'),
  consent=document.getElementById('donorConsent'),feedback=document.getElementById('donationFeedback'),
  prepare=document.getElementById('prepareThanks');
const format=new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:2});
let currentQr=null,currentCents=0,variableSymbol='',intentAmount=0;

function clearIntent(){
  variableSymbol='';intentAmount=0;
  feedback.textContent='';
  render();
}
function render(){
  try{
    currentCents=amountInHellers(input.value);
    if(variableSymbol && intentAmount!==currentCents){variableSymbol='';intentAmount=0;}
    currentQr=qrcodegen.QrCode.encodeText(paymentDescriptor(input.value,variableSymbol),qrcodegen.QrCode.Ecc.MEDIUM);
    const ns='http://www.w3.org/2000/svg',border=4,size=currentQr.size+border*2;
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+size+' '+size);
    svg.setAttribute('role','img');svg.setAttribute('aria-label','Platební QR kód na '+format.format(currentCents/100));
    svg.setAttribute('shape-rendering','crispEdges');
    const background=document.createElementNS(ns,'rect');background.setAttribute('width','100%');background.setAttribute('height','100%');background.setAttribute('fill','#fff');svg.append(background);
    const path=document.createElementNS(ns,'path');let data='';
    for(let y=0;y<currentQr.size;y++)for(let x=0;x<currentQr.size;x++)if(currentQr.getModule(x,y))data+='M'+(x+border)+','+(y+border)+'h1v1h-1z';
    path.setAttribute('d',data);path.setAttribute('fill','#000');svg.append(path);qrHost.replaceChildren(svg);
    document.getElementById('selectedAmount').textContent=format.format(currentCents/100);
    document.getElementById('paymentVsLine').hidden=!variableSymbol;
    document.getElementById('selectedVs').textContent=variableSymbol;
    document.getElementById('paymentMode').textContent=variableSymbol
      ?'✅ QR kód obsahuje identifikátor platby. Po připsání platby obdržíte jednorázové poděkování na e-mail.'
      :'Anonymní QR platba: bez automatického poděkování e-mailem.';
    error.textContent='';input.removeAttribute('aria-invalid');preview.hidden=false;
    document.querySelectorAll('[data-amount]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.amount)*100===currentCents)));
  }catch(e){
    currentQr=null;preview.hidden=true;qrHost.replaceChildren();input.setAttribute('aria-invalid','true');
    error.textContent=e.message;
    document.querySelectorAll('[data-amount]').forEach(button=>button.setAttribute('aria-pressed','false'));
  }
}
document.querySelectorAll('[data-amount]').forEach(button=>button.addEventListener('click',()=>{
  input.value=button.dataset.amount;
  clearIntent();
}));
input.addEventListener('input',clearIntent);
donorEmail.addEventListener('input',clearIntent);
donorName.addEventListener('input',clearIntent);
consent.addEventListener('change',clearIntent);

prepare.addEventListener('click',async()=>{
  let cents;
  try{cents=amountInHellers(input.value);}catch(e){feedback.textContent=e.message;return;}
  if(!donorEmail.validity.valid || !donorEmail.value.trim()){feedback.textContent='Zadejte platný e-mail pro poděkování.';donorEmail.focus();return;}
  if(!consent.checked){feedback.textContent='Potvrďte prosím zaslání jednorázového děkovného e-mailu.';return;}
  prepare.disabled=true;feedback.textContent='Připravuji QR kód s variabilním symbolem…';
  try{
    const response=await fetch('/donation-intent.php',{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        csrf:document.querySelector('meta[name="donation-csrf"]')?.content||'',
        name:donorName.value.trim(),email:donorEmail.value.trim(),
        amount:input.value,acknowledge:true
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Požadavek se nepodařilo zpracovat.');
    if(!/^[1-9][0-9]{7}$/.test(data.vs) || data.amount_cents!==cents)
      throw new Error('Server vrátil neplatné platební údaje.');
    variableSymbol=data.vs;intentAmount=cents;
    render();feedback.textContent='✅ QR s poděkováním je připraven. Použijte pouze nový QR kód s variabilním symbolem '+variableSymbol+'.';
    document.getElementById('paymentQr').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){
    variableSymbol='';intentAmount=0;render();
    feedback.textContent=e.message||'Nepodařilo se připojit k serveru.';
  }finally{prepare.disabled=false;}
});

document.getElementById('copyPayment').addEventListener('click',async()=>{
  const detail='Příjemce: '+payment.recipient+'\nÚčet: '+payment.account
    +'\nIBAN: '+payment.iban+'\nČástka: '+format.format(currentCents/100)
    +(variableSymbol?'\nVariabilní symbol: '+variableSymbol:'')
    +'\nZpráva: Podpora aplikace Můj DIP';
  try{await navigator.clipboard.writeText(detail);status.textContent='Platební údaje byly zkopírovány.';}
  catch{status.textContent='Kopírování se nepodařilo. Platební údaje můžete označit a zkopírovat ručně.';}
});
document.getElementById('saveQr').addEventListener('click',()=>{
  if(!currentQr)return;
  const border=4,scale=10,canvas=document.createElement('canvas');canvas.width=canvas.height=(currentQr.size+border*2)*scale;
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#000';
  for(let y=0;y<currentQr.size;y++)for(let x=0;x<currentQr.size;x++)if(currentQr.getModule(x,y))context.fillRect((x+border)*scale,(y+border)*scale,scale,scale);
  const link=document.createElement('a');link.download='MUJ-DIP-QR-'+currentCents+(variableSymbol?'-VS'+variableSymbol:'')+'.png';
  link.href=canvas.toDataURL('image/png');link.click();status.textContent='QR kód byl připraven ke stažení.';
});
render();
