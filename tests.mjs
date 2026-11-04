import test from 'node:test';import assert from 'node:assert/strict';import {calculate,DEFAULTS} from './dist/engine.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<.01,`${a} != ${b}`);
test('existing taxable benefits put new contribution wholly in 23 percent bracket',()=>{for(const mode of ['gross','budget']){const r=calculate({...DEFAULTS,salary:146000,otherEmployer:100000,employer:3000,mode});close(r.dipTaxCost,12456);close(r.dipNetBenefit,23544);close(r.dipCost,48168);close(r.companySaving,0);close(r.employeeDifference,0);}});
test('existing taxable benefits already exhaust social insurance cap',()=>{for(const mode of ['gross','budget']){const r=calculate({...DEFAULTS,salary:195000,otherEmployer:100000,employer:3000,mode});close(r.dipTaxCost,9900);close(r.dipNetBenefit,26100);close(r.dipCost,39240);close(r.wageCost,r.dipCost);close(r.companySaving,0);}});
test('existing benefits partially consume remaining social insurance cap',()=>{const r=calculate({...DEFAULTS,salary:195000,otherEmployer:52000,employer:3000});close(r.dipCost,36000+8416*.248+36000*.09);close(r.dipTaxCost,8416*.071+36000*(.045+.23));close(r.companySaving,0);});
test('prior deductions and taxable benefits affect marginal personal tax saving',()=>{let r=calculate({...DEFAULTS,salary:150000,otherOwn:40000,own:4000});close(r.allowance,8000);close(r.personalTax,1200);r=calculate({...DEFAULTS,salary:146000,otherEmployer:100000,employer:0,otherOwn:0,own:1000});close(r.personalTax,2760);close(r.dipCost,0);close(r.companySaving,0);});
test('běžný příspěvek: 60 lidí, 3000 Kč',()=>{const r=calculate({...DEFAULTS,employees:60});close(r.companySaving,12168);close(r.employeeDifference,9576);close(r.personalTax,7200);close(r.wageNet,26424);close(r.dipCost,36000);});
test('sdílené limity a přesah',()=>{const r=calculate({...DEFAULTS,employer:5000,otherEmployer:10000,otherOwn:40000});close(r.exempt,40000);close(r.taxable,20000);close(r.allowance,8000);close(r.personalTax,1200);assert.ok(r.dipTaxCost>0);});
test('nulové vklady, sazba a výnos',()=>{let r=calculate({...DEFAULTS,own:0,employer:0,initial:1000,rate:0,fee:0});close(r.end.value,1000);close(r.companySaving,0);close(r.personalTax,0);r=calculate({...DEFAULTS,rate:0,fee:0});close(r.end.value,7000*12*DEFAULTS.years);});
test('stejný rozpočet firmy a vysoká mzda',()=>{for(const salary of [35000,146900,150000,200000,300000]){const r=calculate({...DEFAULTS,salary,mode:'budget'});close(r.wageCost,r.dipCost);assert.ok(r.raise<=r.dipCost);}});
test('sleva na dani omezí úsporu, věk a záporný výnos',()=>{const r=calculate({...DEFAULTS,salary:22400,otherOwn:0,own:100000,age:57,years:10,rate:-10});assert.ok(r.personalTax<=7200);assert.equal(r.eligibleAge,67);assert.equal(r.eligible,true);assert.ok(r.end.gain<0);});
test('vstupy z importu nelze zneužít',()=>{const r=calculate({own:-1,employees:0,years:NaN,age:999,mode:'bad',salary:Infinity});assert.equal(r.s.own,0);assert.equal(r.s.employees,1);assert.equal(r.s.years,30);assert.equal(r.s.age,90);assert.equal(r.s.mode,'gross');});
test('zadaný výnos se použije přímo, i při starém uloženém poplatku',()=>{for(const rate of [0,5,7.9,25.75,50,-10,-100]){const r=calculate({...DEFAULTS,own:0,employer:0,initial:10000,years:1,rate,fee:9});close(r.end.value,10000*(1+rate/100));close(r.netRate,rate/100);assert.equal('fee' in r.s,false);}});
test('pravidelné vklady odpovídají nezávislému výpočtu bez poplatku',()=>{const r=calculate({...DEFAULTS,rate:8.25,years:20,fee:.5}),m=Math.pow(1.0825,1/12)-1;close(r.end.value,7000*(Math.pow(1+m,240)-1)/m);});


test('new plans use 7 percent return and 1 percent inflation; custom rates survive',async()=>{const {COMP_DEFAULTS,COMP_EXAMPLE,cleanComparison}=await import('./dist/comparison-engine.js');assert.equal(DEFAULTS.age,30);assert.equal(DEFAULTS.years,30);assert.equal(DEFAULTS.salary,50000);assert.equal(DEFAULTS.employees,50);assert.equal(DEFAULTS.rate,7);assert.equal(DEFAULTS.inflation,1);for(const s of [COMP_DEFAULTS,COMP_EXAMPLE]){assert.equal(s.age,30);assert.equal(s.years,30);assert.equal(s.salary,50000);assert.equal(s.own,4000);assert.equal(s.employer,3000);assert.equal(s.dipRate,7);assert.equal(s.dpsRate,7);assert.equal(s.inflation,1);}const s=cleanComparison({dipRate:5,dpsRate:6,inflation:2.5});assert.equal(s.dipRate,5);assert.equal(s.dpsRate,6);assert.equal(s.inflation,2.5);});

test('Můj DIP and DIP × DPS match investment value for identical net inputs and do not charge 1.8% twice',async()=>{
 const {compare,COMP_DEFAULTS,COMP_EXAMPLE}=await import('./dist/comparison-engine.js');
 assert.equal(COMP_DEFAULTS.dipFee,1.8);
 assert.equal(COMP_EXAMPLE.dipFee,1.8);
 assert.equal(COMP_EXAMPLE.netReturns,1);
 for(const own of [0,2000,4000])for(const employer of [0,1000,3000])for(const years of [1,10,20,30]){
  const plan=calculate({own,employer,age:30,years,initial:0,rate:7});
  const comparison=compare({...COMP_EXAMPLE,own,employer,age:30,years,dipRate:7,dipEntry:3,stress:0});
  close(comparison.dip.end.value,plan.end.value);
  close(comparison.dip.end.entry,0);
  close(comparison.dip.end.management,0);
 }
 const gross=compare({...COMP_EXAMPLE,netReturns:0,own:4000,employer:3000});
 const net=compare({...COMP_EXAMPLE,own:4000,employer:3000});
 assert.ok(gross.dip.end.value<net.dip.end.value);
});

test('comparison defaults to zero tax on all DIP investment gains',async()=>{
 const {compare,COMP_DEFAULTS,COMP_EXAMPLE}=await import('./dist/comparison-engine.js');
 assert.equal(COMP_DEFAULTS.dipTax,'exempt');
 assert.equal(COMP_EXAMPLE.dipTax,'exempt');
 for(const years of [1,10,20,30])for(const rate of [0,7,12]){
  const r=compare({...COMP_EXAMPLE,years,dipRate:rate});
  close(r.dip.end.tax,0);
  close(r.dip.end.net,r.dip.end.value);
 }
 const {readFileSync}=await import('node:fs');
 const ui=readFileSync(new URL('./dist/comparison.js',import.meta.url),'utf8');
 assert.ok(!ui.includes('id="cmp-dip-net"'));
 assert.ok(!ui.includes('id="cmp-dps-net"'));
 assert.ok(!ui.includes('data-cmp="dipTax"'));
 assert.match(ui,/state=cleanComparison\(\{\.\.\.state,dipTax:'exempt'\}\);result=compare/);
});
