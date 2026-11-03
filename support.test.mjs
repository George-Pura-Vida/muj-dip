import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {payment,amountInHellers,paymentDescriptor} from './dist/support-payment.js';
test('payment account and IBAN agree and checksum is valid',()=>{
 const iban=payment.iban;
 assert.equal(iban.slice(4),'2010'+'000000'+'223366333'.padStart(10,'0'));
 const numeric=(iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
 assert.equal(BigInt(numeric)%97n,1n);
 assert.equal(payment.account,'223366333/2010');
});
test('QR payment preserves selected amounts exactly, including Czech decimals',()=>{
 for(const [value,expected] of [['100','100.00'],['250','250.00'],['500','500.00'],['1000','1000.00'],['1,01','1.01'],['9999999,99','9999999.99']]){
  const descriptor=paymentDescriptor(value);assert.ok(descriptor.includes('*AM:'+expected+'*CC:CZK*'));
  assert.ok(descriptor.includes('*ACC:CZ8220100000000223366333*'));assert.ok(descriptor.endsWith('*MSG:PODPORA APLIKACE MUJ DIP'));
 }
 assert.equal(amountInHellers('1,01'),101);
});
test('invalid amounts cannot generate a payment',()=>{
 for(const value of ['',0,-1,'NaN','Infinity','1e3','0.99','10000000','1.001','1*ACC:other','<script>','1 000'])assert.throws(()=>paymentDescriptor(value));
});
test('support is optional, public and reachable from navigation',async()=>{
 const [page,index]=await Promise.all(['dist/support.php','dist/index.html'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
 assert.ok(page.includes('Používání aplikace není platbou podmíněno.'));assert.ok(page.includes('Pokračovat do aplikace bez příspěvku'));
 assert.ok(page.includes(payment.account)&&page.includes('CZ82 2010 0000 0002 2336 6333'));assert.ok(!page.includes('auth_require()'));
 assert.ok(index.includes('class="nav menu-support" href="/support.php"'));assert.ok(index.includes('💛 Podpořit Můj DIP'));
});
