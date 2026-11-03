import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./dist/account.js',import.meta.url),'utf8');
function openLink(hash,{auto=true,posted=''}={}){
 const events=[];const tokenInput={value:posted};const submit={disabled:false};
 const form={elements:{token:tokenInput},before(){events.push('warning');},querySelector(){return submit;},requestSubmit(){events.push('submit');}};
 const document={
  querySelectorAll(selector){return selector==='[data-password]'?[]:selector==='input[name="token"]'?[tokenInput]:[form];},
  querySelector(){return auto?form:null;},
  createElement(){return {};},
 };
 vm.runInNewContext(source,{document,location:{hash,pathname:'/account.php',search:'?view=verify'},history:{replaceState(){events.push('remove-token');}},URLSearchParams});
 return {events,value:tokenInput.value,disabled:submit.disabled};
}
test('verification fills token, removes fragment, then submits exactly once',()=>{
 const token='a'.repeat(64),r=openLink('#token='+token);
 assert.equal(r.value,token);assert.deepEqual(r.events,['remove-token','submit']);
});
test('reset and email changes never submit automatically',()=>{
 for(const purpose of ['reset','email'])assert.deepEqual(openLink('#token='+'a'.repeat(64),{auto:false}).events,['remove-token'],purpose);
});
test('missing and invalid tokens cannot trigger automatic verification',()=>{
 for(const hash of ['','#token=bad','#token='+'A'.repeat(64)]){const r=openLink(hash);assert.equal(r.disabled,true);assert.ok(!r.events.includes('submit'));}
});
test('failed POST with used or expired token does not resubmit in a loop',()=>{
 const r=openLink('',{posted:'a'.repeat(64)});assert.deepEqual(r.events,[]);
});
