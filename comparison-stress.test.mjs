import test from 'node:test';import assert from 'node:assert/strict';
import {compare,cleanComparison,COMP_DEFAULTS as CURRENT_DEFAULTS,COMP_EXAMPLE as CURRENT_EXAMPLE,stressCases} from './dist/comparison-engine.js';
// Explicit historical assumptions keep the independent 8% / 2.5% audit scenario stable.
const COMP_DEFAULTS={...CURRENT_DEFAULTS,age:40,years:20,salary:35000,own:2000,employer:1000,dipRate:8,dpsRate:8,inflation:2.5};
const COMP_EXAMPLE={...CURRENT_EXAMPLE,age:40,years:20,salary:35000,own:2000,employer:1000,dipRate:7.9,dpsRate:7.9,inflation:2.5};
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,a+' != '+b);
const ann=(f,n)=>Math.abs(f-1)<1e-10?n:(f**n-1)/(f-1);
test('stress off preserves audited baseline, even with stored shock magnitudes',()=>{
 const a=compare(COMP_DEFAULTS),b=compare({...COMP_DEFAULTS,stress:0,dipShock:-100,dpsShock:100});near(a.dip.end.total,1345740.14190882);near(a.dps.end.total,1402022.66799479);near(a.difference,b.difference);
});
test('crisis year replaces annual return and respects deposits: independent block annuities',()=>{
 for(const year of [1,2,10,20])for(const shock of [-100,-35,-15,0,20]){
  const s={...COMP_DEFAULTS,netReturns:1,dipEntry:0,stress:1,shockYear:year,dipShock:shock},r=compare(s),a=1.08**(1/12),b=(1+shock/100)**(1/12);
  let v=3000*ann(a,12*(year-1));v=v*b**12+3000*ann(b,12);v=v*a**(12*(20-year))+3000*ann(a,12*(20-year));near(r.dip.end.value,v);near(r.dip.rows[year-1].annualReturn,shock);
  near(r.dip.rows.filter(x=>x.annualReturn===shock).length,1);
 }
});
test('sequence risk: same single shock harms late contributions more in this scenario',()=>{
 const s={...COMP_DEFAULTS,netReturns:1,dipEntry:0,stress:1,dipShock:-35,dpsShock:-35};
 const early=compare({...s,shockYear:2}),late=compare({...s,shockYear:20});assert.ok(early.dip.end.value>late.dip.end.value);assert.ok(early.dps.end.value>late.dps.end.value);near(late.dip.maxDrawdown,.35);near(late.dps.maxDrawdown,.35);
});
test('drawdown excludes new contributions, gains tax and unreinvested refunds',()=>{
 const r=compare({...COMP_DEFAULTS,netReturns:1,dipEntry:0,stress:1,shockYear:20,dipShock:-35,dpsShock:-35});
 near(r.dip.maxDrawdown,.35);near(r.dip.end.taxSaving,72000);near(r.dps.end.taxSaving,10800);
 for(const k of ['dip','dps']){const a=r[k].end;near(a.total,a.value-a.tax+a.taxSaving);near(r.points.at(-1)[k],a.total);assert.ok(a.tax>=0);assert.ok(r.baseline[k]>a.total);}
});
test('equal net rates need not favour DPS; zero entry and 3 percent entry have different outcomes',()=>{
 const s={...COMP_DEFAULTS,netReturns:1,dipEntry:0};assert.ok(compare(s).difference>0);assert.ok(compare({...s,dipEntry:3}).difference<0);
});
test('loss year does not incur performance fee; full loss remains finite',()=>{
 const r=compare({...COMP_DEFAULTS,stress:1,shockYear:20,dipShock:-100,dpsShock:-100}),a=r.dps.rows;
 near(a[19].performance,a[18].performance);near(r.dip.maxDrawdown,1);near(r.dps.maxDrawdown,1);assert.ok(Number.isFinite(r.dip.end.total));assert.ok(Number.isFinite(r.dps.end.total));
});
test('timing comparison preserves user state and all endpoints use same payout rules',()=>{
 const s={...COMP_DEFAULTS,stress:1,shockYear:15},before=JSON.stringify(s),cases=stressCases(s);
 assert.equal(cases.length,4);assert.equal(JSON.stringify(s),before);for(const c of cases){const r=compare({...s,stress:c.year?1:0,shockYear:c.year||15});near(c.dip,r.dip.end.total);near(c.dps,r.dps.end.total);}
});
test('legacy settings retain no-crisis behaviour; hostile shock inputs are clamped',()=>{
 assert.equal(cleanComparison({own:2000}).stress,0);const s=cleanComparison({years:10,shockYear:200,stress:8,dipShock:-300,dpsShock:Infinity});assert.equal(s.shockYear,10);assert.equal(s.dipShock,-100);assert.equal(s.stress,1);assert.equal(s.dpsShock,-35);
});
test('requested example: both 7.9 percent gross, editable costs 1.5 and 1, no double fees in net mode',()=>{
 const a=compare(COMP_EXAMPLE);near(a.s.dipRate,7.9);near(a.s.dpsRate,7.9);near(a.s.dipFee,1.5);near(a.s.dpsFee,1);assert.equal(a.s.netReturns,0);assert.ok(a.dip.end.management>0);assert.ok(a.dps.end.performance>0);
 const net=compare({...COMP_EXAMPLE,netReturns:1});near(net.dip.end.management,0);near(net.dps.end.performance,0);assert.ok(net.dip.end.value>a.dip.end.value);assert.ok(net.dps.end.value>a.dps.end.value);
 const higher=compare({...COMP_EXAMPLE,dipFee:2,dpsFee:1.5});assert.ok(higher.dip.end.value<a.dip.end.value);assert.ok(higher.dps.end.value<a.dps.end.value);
 const b=compare({...COMP_EXAMPLE,netReturns:1,stress:1,shockYear:20});near(b.dip.maxDrawdown,.15);near(b.dps.maxDrawdown,.35);assert.ok(b.difference>0);
 const c=compare({...COMP_EXAMPLE,stress:1,shockYear:20,dipShock:-50,dpsShock:-10});assert.ok(c.difference<0);
});

