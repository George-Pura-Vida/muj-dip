import test from 'node:test';import assert from 'node:assert/strict';import {calculate,DEFAULTS} from './dist/engine.js';import {payload,validate,excelBytes,unzip,zip,crc32,pdfWithPlan,pngWithPlan,importPlan,saveFile} from './dist/files.js';import {jpegPdf} from './dist/pdf.js';
const file=(name,bytes)=>({name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
test('Excel export je platný ZIP a obsahuje přesná vstupní data i výsledky',async()=>{const s={...DEFAULTS,rate:8.25,own:2450,mode:'budget'},r=calculate(s),bytes=excelBytes(r),files=await unzip(bytes);assert.equal(Object.keys(files).length,8);assert.match(files['xl/worksheets/sheet1.xml'],/8.25/);assert.match(files['xl/worksheets/sheet2.xml'],new RegExp(String(r.end.value)));assert.ok(files['xl/styles.xml']);});
test('PDF zachová data plánu a platnou strukturu dokumentu',async()=>{const s={...DEFAULTS,rate:12.75},pdf=pdfWithPlan(jpegPdf([new Uint8Array([255,216,255,217])]),s);assert.equal(new TextDecoder().decode(pdf.slice(0,8)),'%PDF-1.4');assert.deepEqual(await importPlan(file('plan.pdf',pdf)),s);});
test('PNG vlastní export umožní přesný import; změněné údaje odmítne',async()=>{const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')),s={...DEFAULTS,rate:7.9},bytes=pngWithPlan(png,s);assert.deepEqual(await importPlan(file('plan.png',bytes)),s);const bad=bytes.slice();bad[bad.length-30]^=1;await assert.rejects(()=>importPlan(file('bad.png',bad)));});
test('JSON a původní uložené plány jsou kompatibilní, nesmyslné soubory se odmítnou',async()=>{const b=new TextEncoder().encode(JSON.stringify(payload(DEFAULTS)));assert.deepEqual(await importPlan(file('plan.json',b)),DEFAULTS);assert.throws(()=>validate({app:'MUJ-DIP',version:1,settings:{rate:5}}));await assert.rejects(()=>importPlan(file('foto.png',new Uint8Array([1,2,3]))));await assert.rejects(()=>importPlan(file('cizi.pdf',new TextEncoder().encode('%PDF-1.4'))));});

test('stažení připojí odkaz do stránky a zachová funkční URL pro opakované stažení',async()=>{
 const originalDocument=globalThis.document;let attached=false,clicked=false,event;
 const link={remove(){attached=false;},click(){assert.equal(attached,true);clicked=true;}};
 globalThis.document={body:{append(node){assert.equal(node,link);attached=true;}},createElement(tag){assert.equal(tag,'a');return link;},dispatchEvent(e){event=e;}};
 try{
  const bytes=new TextEncoder().encode('%PDF-test');
  const url=saveFile('plan.pdf',bytes,'application/pdf');
  assert.ok(clicked);assert.equal(attached,false);assert.equal(link.download,'plan.pdf');
  assert.equal(event.type,'mujdip:file-ready');assert.equal(event.detail.url,url);
  assert.equal(event.detail.type,'application/pdf');
  const response=await fetch(url);assert.equal(await response.text(),'%PDF-test');
  const second=saveFile('next.pdf',bytes,'application/pdf');
  await assert.rejects(()=>fetch(url));assert.equal((await fetch(second)).status,200);
  URL.revokeObjectURL(second);
 }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
});
