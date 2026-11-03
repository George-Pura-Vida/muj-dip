import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,DEFAULTS,taxDetail,RULES} from './dist/engine.js';
import {compare,COMP_DEFAULTS} from './dist/comparison-engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
test('CEO: full deduction reduces the 23 percent bracket',()=>{
 const r=calculate({...DEFAULTS,salary:160000,own:4000});near(r.personalTax,11040);near(r.personalTaxDetail.deduction23,48000);near(r.personalTaxDetail.deduction15,0);
 const c=compare({...COMP_DEFAULTS,salary:160000,own:2000});near(c.annualTax.dip,5520);near(c.annualTax.dps,828);
});
test('deduction crossing the threshold splits between both brackets',()=>{
 const r=calculate({...DEFAULTS,salary:150000,own:4000});near(r.personalTaxDetail.deduction23,37188);near(r.personalTaxDetail.deduction15,10812);near(r.personalTax,37188*.23+10812*.15);
});
test('threshold and rounding: 23 percent never applies to the whole income',()=>{
 near(RULES.threshold/12,146901);const a=taxDetail(RULES.threshold,48000);near(a.base23,0);near(a.saving,7200);
 const b=taxDetail(160000*12,48000);near(b.base15,1762812);near(b.base23,157188);
 near(taxDetail(1800000-40000,8000).saving,1200);
});
test('shared deduction limits, first year deposit and basic credit remain respected',()=>{
 const r=calculate({...DEFAULTS,salary:160000,own:1000,initial:100000,initialNew:1});near(r.personalTax,2760);near(r.firstYearTax,11040);near(r.firstYearTaxDetail.saving,r.firstYearTax);
 near(calculate({...DEFAULTS,salary:160000,otherOwn:48000}).personalTaxDetail.saving,0);
 near(taxDetail(100000,48000).saving,0);
});


test('499 CZK monthly: actual deduction 5988 stays separate from rounded tax saving 900',()=>{
 const r=calculate({...DEFAULTS,own:499});near(r.allowance,5988);near(r.personalTaxDetail.deduction15,5988);near(r.personalTaxDetail.deduction23,0);near(r.personalTaxDetail.roundingEffect,1.8);near(r.personalTax,900);
 const c=compare({...COMP_DEFAULTS,own:499});near(c.taxDetails.dip.deduction15,5988);near(c.annualTax.dip,900);near(c.taxDetails.dps.deduction,0);
});
test('deduction split never includes tax-base rounding or exceeds actual allowance',()=>{
 for(const base of [100000,420000,420099,1762812,1762850,1800050])for(const deduction of [0,1,12,5988,48000,base+100]){const d=taxDetail(base,deduction);near(d.deduction15+d.deduction23,Math.min(base,deduction));assert.ok(d.roundedBefore%100===0&&d.roundedAfter%100===0);assert.ok(d.deduction15>=0&&d.deduction23>=0);}
 near(taxDetail(100000,48000).roundingEffect,0);
});
