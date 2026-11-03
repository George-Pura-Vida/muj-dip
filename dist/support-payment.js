export const payment = Object.freeze({account:'223366333/2010',iban:'CZ8220100000000223366333',bic:'FIOBCZPPXXX',recipient:'Jiří Janoušek',message:'PODPORA APLIKACE MUJ DIP'});
export function amountInHellers(value) {
  const text=String(value).trim().replace(',','.');
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text)) throw new Error('Zadejte částku od 1 do 9 999 999,99 Kč, nejvýše se dvěma desetinnými místy.');
  const [whole,fraction='']=text.split('.');
  const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(amount<100||amount>999999999) throw new Error('Zadejte částku od 1 do 9 999 999,99 Kč.');
  return amount;
}
export function paymentDescriptor(value) {
  const cents=amountInHellers(value);
  return 'SPD*1.0*ACC:'+payment.iban+'*AM:'+Math.floor(cents/100)+'.'+String(cents%100).padStart(2,'0')+'*CC:CZK*MSG:'+payment.message;
}
