import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,clean,DEFAULTS,RULES} from './dist/engine.js';
import {compare,cleanComparison,COMP_EXAMPLE,COMP_DEFAULTS} from './dist/comparison-engine.js';

const close=(actual,expected,epsilon=.02)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
const finite=(value)=>assert.ok(Number.isFinite(value),`Not finite: ${value}`);

test('legislative 2026 reference limits and example capital of Můj DIP',()=>{
 assert.equal(RULES.year,2026);
 assert.equal(RULES.personalLimit,48000);
 assert.equal(RULES.employerLimit,50000);
 assert.equal(RULES.threshold,1762812);
 assert.equal(RULES.socialCap,2350416);
 assert.equal(RULES.taxCredit,30840);
 const plan=calculate(DEFAULTS);
 close(plan.end.value,8186168.223006202);
 close(plan.allowance,48000);
 close(plan.personalTax,7200);
 assert.equal(plan.eligible,true);
});

test('Můj DIP: 144 horizon, contribution, rate, and initial deposit scenarios',()=>{
 let n=0;
 for(const years of [1,5,10,20,30,50])
 for(const rate of [-100,-10,0,7,15,35])
 for(const own of [0,2000])
 for(const employer of [0,1000]){
  const r=calculate({...DEFAULTS,age:30,years,rate,own,employer,initial:2500});
  const value=r.points.at(-1).value;
  finite(value);assert.ok(value>=0);
  close(r.end.value,value);
  close(r.end.own,2500+own*12*years);
  close(r.end.employer,employer*12*years);
  close(r.end.real,r.end.value/(1+r.s.inflation/100)**years);
  if(rate===0)close(r.end.value,2500+(own+employer)*12*years);
  n++;
 }
 assert.equal(n,144);
});

test('Pro firmu: 168 salary, employer, and team scenarios with budget preservation',()=>{
 let n=0;
 for(const salary of [0,11000,22400,50000,146900,200000,250000])
 for(const employer of [0,1000,3000,5000,6000,10000])
 for(const employees of [1,20,50,100]){
  const a=calculate({...DEFAULTS,salary,employer,employees,mode:'gross'});
  const b=calculate({...DEFAULTS,salary,employer,employees,mode:'budget'});
  for(const v of [a.dipCost,a.wageCost,a.companySaving,a.dipTaxCost,a.personalTax,b.dipCost,b.wageCost,b.raise]){
   finite(v);
  }
  close(a.dipCost*employees,a.dipCost*a.s.employees);
  close(b.dipCost,b.wageCost);
  assert.ok(a.exempt>=0&&a.exempt<=50000);
  assert.ok(a.allowance<=48000&&a.allowance>=0);
  assert.ok(a.taxable>=0);
  assert.equal(a.s.salary,salary);
  n++;
 }
 assert.equal(n,168);
});

test('DIP / DPS comparison: 288 horizons, investments, returns, payout modes',()=>{
 let count=0;
 for(const years of [1,10,20,30])
 for(const own of [0,500,1700,4000])
 for(const employer of [0,1000,3000])
 for(const rate of [-10,0,7])
 for(const payout of ['lump','pension']){
  const r=compare({...COMP_EXAMPLE,age:30,years,own,employer,dipRate:rate,dpsRate:rate,payout,stress:0});
  const plan=calculate({...DEFAULTS,age:30,years,own,employer,rate});
  close(r.dip.end.value,plan.end.value);
  close(r.dip.end.tax,0);
  close(r.dip.end.net,r.dip.end.value);
  close(r.points.at(-1).dip,r.dip.end.net);
  close(r.points.at(-1).dps,r.dps.end.net);
  close(r.dps.end.state,r.support*years*12);
  finite(r.dps.end.value);
  assert.ok(r.dps.end.tax>=0);
  if(payout==='pension')close(r.dps.end.tax,0);
  count++;
 }
 assert.equal(count,288);
});

test('DPS legally rounded support bracket and pensioner deduction',()=>{
 const cases=[[0,0],[100,0],[499,0],[499.99,0],[500,100],[500.99,100],[999.9,199.8],[1699.9,339.8],[1700,340],[1700.1,340],[4000,340]];
 for(const [own,support] of cases){
  const r=compare({...COMP_EXAMPLE,own});
  close(r.support,support);
 }
 const normal=compare({...COMP_EXAMPLE,own:4000,salary:50000});
 const pensioner=compare({...COMP_EXAMPLE,own:4000,salary:50000,pensioner:1});
 close(normal.annualTax.dps,4140);
 close(pensioner.annualTax.dps,7200);
 close(normal.support,340);
 close(pensioner.support,0);
 close(normal.annualTax.dip,7200);
});

test('DIP/DPS sensitivity, costs, stress, tax and state support never double-count',()=>{
 for(const own of [0,500,1700,4000])
 for(const employer of [0,3000])
 for(const netReturns of [0,1])
 for(const dipFee of [0,1.8,5])
 for(const stress of [0,1]){
  const r=compare({...COMP_DEFAULTS,age:40,years:20,own,employer,netReturns,dipFee,
   dipRate:7,dpsRate:7,stress,shockYear:10,dipShock:-15,dpsShock:-35});
  finite(r.dip.end.value);finite(r.dps.end.value);
  assert.ok(r.dip.end.value>=0&&r.dps.end.value>=0);
  close(r.dip.end.net,r.dip.end.value-r.dip.end.tax);
  close(r.dps.end.net,r.dps.end.value-r.dps.end.tax);
  close(r.dip.end.total,r.dip.end.net+r.dip.end.taxSaving);
  close(r.dps.end.total,r.dps.end.net+r.dps.end.taxSaving);
  close(r.points.at(-1).dip,r.dip.end.net);
  close(r.points.at(-1).dps,r.dps.end.net);
  if(netReturns)close(r.dip.end.management,0);
 }
});

test('default DIP gains exemption is only an assumption, model retains taxable scenario',()=>{
 assert.equal(cleanComparison({}).dipTax,'exempt');
 assert.equal(COMP_DEFAULTS.dipTax,'exempt');
 for(const years of [1,10,20]) {
  const exempt=compare({...COMP_DEFAULTS,years,own:4000,employer:3000,dipTax:'exempt'});
  const taxable=compare({...COMP_DEFAULTS,years,own:4000,employer:3000,dipTax:'taxable'});
  close(exempt.dip.end.tax,0);
  assert.ok(taxable.dip.end.tax>=0);
 }
 assert.equal(clean({...DEFAULTS,salary:11000}).salary,11000);
 assert.equal(compare({...COMP_EXAMPLE,own:0}).dpsEligible,false);
 assert.equal(compare({...COMP_EXAMPLE,own:99}).dpsEligible,false);
 assert.equal(compare({...COMP_EXAMPLE,own:100}).dpsEligible,true);
});
