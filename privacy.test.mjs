import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTICE_KEY,NOTICE_TTL,noticeAcknowledged,acknowledgeNotice} from './dist/privacy.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('cookie notice is not tracking consent; acknowledgement expires after 180 days',()=>{
 const s=storage();assert.equal(noticeAcknowledged(s,1000),false);assert.equal(acknowledgeNotice(s,1000),true);assert.equal(noticeAcknowledged(s,1001),true);assert.equal(noticeAcknowledged(s,1000+NOTICE_TTL),false);assert.equal(noticeAcknowledged(s,999),false);assert.deepEqual(JSON.parse(s.getItem(NOTICE_KEY)),{version:1,necessary:true,at:1000});
});
test('corrupt, forged version and unavailable storage cannot suppress the notice',()=>{
 const s=storage();for(const v of ['broken','null','{}',JSON.stringify({version:2,necessary:true,at:1000}),JSON.stringify({version:1,necessary:true,at:'1000'})]){s.setItem(NOTICE_KEY,v);assert.equal(noticeAcknowledged(s,1001),false);}
 const unavailable={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(noticeAcknowledged(unavailable),false);assert.equal(acknowledgeNotice(unavailable),false);
});
