import {payment,amountInHellers,paymentDescriptor} from './support-payment.js?v=1';
import {qrcodegen} from './vendor/qrcodegen.js?v=1';
const input=document.getElementById('supportAmount'),error=document.getElementById('paymentError'),preview=document.getElementById('paymentPreview'),qrHost=document.getElementById('paymentQr'),status=document.getElementById('supportStatus');
const format=new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:2});
let currentQr=null,currentCents=0;
function render(){
  try{
    currentCents=amountInHellers(input.value);
    currentQr=qrcodegen.QrCode.encodeText(paymentDescriptor(input.value),qrcodegen.QrCode.Ecc.MEDIUM);
    const ns='http://www.w3.org/2000/svg',border=4,size=currentQr.size+border*2;
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${size} ${size}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Platební QR kód na '+format.format(currentCents/100));svg.setAttribute('shape-rendering','crispEdges');
    const background=document.createElementNS(ns,'rect');background.setAttribute('width','100%');background.setAttribute('height','100%');background.setAttribute('fill','#fff');svg.append(background);
    const path=document.createElementNS(ns,'path');let data='';
    for(let y=0;y<currentQr.size;y++)for(let x=0;x<currentQr.size;x++)if(currentQr.getModule(x,y))data+=`M${x+border},${y+border}h1v1h-1z`;
    path.setAttribute('d',data);path.setAttribute('fill','#000');svg.append(path);qrHost.replaceChildren(svg);
    document.getElementById('selectedAmount').textContent=format.format(currentCents/100);
    error.textContent='';input.removeAttribute('aria-invalid');preview.hidden=false;
    document.querySelectorAll('[data-amount]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.amount)*100===currentCents)));
  }catch(e){currentQr=null;preview.hidden=true;qrHost.replaceChildren();input.setAttribute('aria-invalid','true');error.textContent=e.message;document.querySelectorAll('[data-amount]').forEach(button=>button.setAttribute('aria-pressed','false'));}
}
document.querySelectorAll('[data-amount]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.amount;render();}));
input.addEventListener('input',render);
document.getElementById('copyPayment').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText('Příjemce: '+payment.recipient+'\nÚčet: '+payment.account+'\nIBAN: '+payment.iban+'\nČástka: '+format.format(currentCents/100)+'\nZpráva: Podpora aplikace Můj DIP');status.textContent='Platební údaje byly zkopírovány.';}catch{status.textContent='Kopírování se nepodařilo. Platební údaje můžete označit a zkopírovat ručně.';}
});
document.getElementById('saveQr').addEventListener('click',()=>{
  if(!currentQr)return;
  const border=4,scale=10,canvas=document.createElement('canvas');canvas.width=canvas.height=(currentQr.size+border*2)*scale;
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#000';
  for(let y=0;y<currentQr.size;y++)for(let x=0;x<currentQr.size;x++)if(currentQr.getModule(x,y))context.fillRect((x+border)*scale,(y+border)*scale,scale,scale);
  const link=document.createElement('a');link.download='MUJ-DIP-QR-'+currentCents+'-haleru.png';link.href=canvas.toDataURL('image/png');link.click();status.textContent='QR kód byl připraven ke stažení. V mobilním bankovnictví jej můžete načíst z obrázku.';
});
render();
