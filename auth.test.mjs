// Isolated integration test: never sends email or touches production accounts.
import {mkdtemp,cp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'mujdip-auth-'));
await cp(new URL('./dist/',import.meta.url),join(dir,'dist'),{recursive:true});
await cp(new URL('./router.php',import.meta.url),join(dir,'router.php'));
const php=process.env.PHP_BINARY||'php';
const args=process.env.PHP_EXTENSION_DIR?['-d',`extension_dir=${process.env.PHP_EXTENSION_DIR}`,'-d','extension=pdo_sqlite']:[];
const server=spawn(php,[...args,'-S','127.0.0.1:18975','-t','dist','router.php'],{cwd:dir,env:{...process.env,MUJDIP_TEST_MODE:'1'},stdio:'pipe'});
let logs='';server.stderr.on('data',b=>logs+=b);server.on('error',e=>logs+=e.message);
const base='http://127.0.0.1:18975';
class Client{
 cookie='';csrf='';
 async request(path='/',data){
  const r=await fetch(base+path,{redirect:'manual',method:data?'POST':'GET',headers:{Cookie:this.cookie,...(data?{'Content-Type':'application/x-www-form-urlencoded',Origin:base}:{})},body:data?new URLSearchParams({csrf:this.csrf,...data}):undefined});
  const cookie=r.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];
  const html=await r.text();const csrf=html.match(/name="csrf" value="([a-f0-9]+)"/);if(csrf)this.csrf=csrf[1];
  return {status:r.status,location:r.headers.get('location'),headers:r.headers,html};
 }
}
const a=new Client(),b=new Client();
const profile={first_name:'Test',last_name:'Uživatel',company:'Test firma',ico:'12345678',dic:'CZ12345678',phone:'+420 777 123 456',address:'Testovací 1, 11000 Praha',email:'integration@example.invalid'};
const password='Test-only-password-2026';let checks=0;
function ok(value){assert.ok(value);checks++;}
async function mailToken(purpose){const lines=(await readFile(join(dir,'var/accounts/test-outbox.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);return new URL(lines.filter(x=>x.purpose===purpose).at(-1).url).hash.slice(7);}
try{
 let ready=false;for(let i=0;i<60;i++){try{await a.request('/account.php');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(ready,logs);
 ok((await a.request('/')).status===303);
 ok((await a.request('/index.html')).status===303);
 ok((await a.request('/auth/bootstrap.php')).status===403);
 await a.request('/account.php?view=register');
 ok((await a.request('/account.php?view=register',{action:'register',...profile,password,password_confirm:password,privacy:'yes',csrf:'invalid'})).status===403);
 const reg=await a.request('/account.php?view=register',{action:'register',...profile,password,password_confirm:password,privacy:'yes'});ok(reg.status===303);
 ok(!(await readFile(join(dir,'var/accounts/accounts.sqlite'))).includes(Buffer.from(password)));
 await a.request('/account.php?view=login');
 ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).status===200);
 ok((await a.request('/')).status===303);
 const verify=await mailToken('verify');await a.request('/account.php?view=verify');
 ok((await a.request('/account.php?view=verify',{action:'verify',token:verify})).status===303);
 await a.request('/account.php?view=verify');ok((await a.request('/account.php?view=verify',{action:'verify',token:verify})).status===200);
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).location==='/');
 const app=await a.request('/');ok(app.status===200&&app.html.includes('data-account-key="u1"'));ok(app.headers.get('cache-control').includes('no-store'));
 await a.request('/account.php?view=profile');ok((await a.request('/account.php?view=profile',{action:'profile',...profile,first_name:'Upraveno'})).status===303);
 ok((await a.request('/account.php?view=profile')).html.includes('value="Upraveno"'));
 await b.request('/account.php?view=forgot');ok((await b.request('/account.php?view=forgot',{action:'forgot',email:profile.email})).status===303);
 const reset=await mailToken('reset');await b.request('/account.php?view=reset');
 ok((await b.request('/account.php?view=reset',{action:'reset',token:reset,password:'žžžžžž',password_confirm:'žžžžžž'})).status===200);
 const newPassword='Changed-test-password-2026';
 ok((await b.request('/account.php?view=reset',{action:'reset',token:reset,password:newPassword,password_confirm:newPassword})).status===303);
 ok((await a.request('/')).status===303);
 await b.request('/account.php?view=reset');ok((await b.request('/account.php?view=reset',{action:'reset',token:reset,password:newPassword,password_confirm:newPassword})).status===200);
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).status===200);
 ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password:newPassword})).location==='/');
 await a.request('/account.php?view=profile');
 ok((await a.request('/account.php?view=profile',{action:'profile',...profile,email:'changed@example.invalid'})).status===200);
 ok((await a.request('/account.php?view=profile',{action:'profile',...profile,email:'changed@example.invalid',current_password:newPassword})).status===303);
 const change=await mailToken('email');await a.request('/account.php?view=confirm-email');
 ok((await a.request('/account.php?view=confirm-email',{action:'confirm-email',token:change})).status===303);
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:'changed@example.invalid',password:newPassword})).location==='/');
 await b.request('/account.php?view=forgot');await b.request('/account.php?view=forgot',{action:'forgot',email:'changed@example.invalid'});
 const expired=await mailToken('reset');
 const expire=spawnSync(php,[...args,'-r',`require ${JSON.stringify(join(dir,'dist/auth/bootstrap.php').replaceAll('\\','/'))}; auth_query('UPDATE tokens SET expires=1');`],{encoding:'utf8'});assert.equal(expire.status,0,expire.stderr);
 await b.request('/account.php?view=reset');ok((await b.request('/account.php?view=reset',{action:'reset',token:expired,password,password_confirm:password})).status===200);
 ok((await a.request('/')).status===200);
 await a.request('/account.php?view=profile');ok((await a.request('/account.php?view=profile',{action:'logout'})).status===303);ok((await a.request('/')).status===303);
 console.log(`PASS: ${checks} authentication integration checks (isolated SQLite and email outbox).`);
}finally{server.kill();await new Promise(r=>server.once('exit',r));await rm(dir,{recursive:true,force:true});}
