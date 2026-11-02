import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,DEFAULTS} from './dist/engine.js';
import {validate,payload,excelBytes,unzip} from './dist/files.js';
test('new initial contribution uses annual deduction once, not every year',()=>{
 const r=calculate({...DEFAULTS,own:0,employer:0,initial:48000,initialNew:1,years:20});
 assert.equal(r.firstYearTax,7200);assert.equal(r.personalTax,0);
 assert.equal(r.points[0].tax,0);assert.equal(r.points[1].tax,7200);assert.equal(r.end.tax,7200);
});
test('initial and regular contributions share the deduction limit',()=>{
 const r=calculate({...DEFAULTS,own:2000,employer:0,initial:48000,initialNew:1,years:2,otherOwn:12000});
 assert.equal(r.firstYearAllowance,36000);assert.equal(r.firstYearTax,5400);
 assert.equal(r.personalTax,3600);assert.equal(r.end.tax,9000);
});
test('existing balance and legacy imports do not generate a new deduction',()=>{
 const old={...DEFAULTS,own:0,employer:0,initial:48000};delete old.initialNew;
 const s=validate({app:'MUJ-DIP',version:1,settings:old});
 assert.equal(s.initialNew,0);assert.equal(calculate(s).firstYearTax,0);
 assert.equal(calculate(s).end.tax,0);
});
test('export preserves initial contribution status and first-year tax saving',async()=>{
 const r=calculate({...DEFAULTS,own:0,initial:48000,initialNew:1});
 assert.equal(validate(payload(r.s)).initialNew,1);
 const files=await unzip(excelBytes(r));assert.match(files['xl/worksheets/sheet1.xml'],/initialNew/);
 assert.match(files['xl/worksheets/sheet3.xml'],/7200/);
});
