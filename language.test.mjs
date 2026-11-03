import test from 'node:test';import assert from 'node:assert/strict';import {percent,years} from './dist/format.js';
test('Czech year labels for chart ticks and horizons',()=>{assert.deepEqual([0,1,2,3,4,5,9,21].map(years),['0 let','1 rok','2 roky','3 roky','4 roky','5 let','9 let','21 let']);});
test('Czech percentage formatting including drawdown and negative rates',()=>{assert.equal(percent(7.9),'7,9 %');assert.equal(percent(1.5),'1,5 %');assert.equal(percent(0,2),'0,00 %');assert.equal(percent(-15.25),'-15,25 %');});
