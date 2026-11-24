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
 async request(path='/',data,extraHeaders={}){
  const r=await fetch(base+path,{redirect:'manual',method:data?'POST':'GET',headers:{Cookie:this.cookie,...(data?{'Content-Type':'application/x-www-form-urlencoded',Origin:base}:{}),...extraHeaders},body:data?new URLSearchParams({csrf:this.csrf,...data}):undefined});
  const cookie=r.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];
  const html=await r.text();const csrf=html.match(/name="csrf" value="([a-f0-9]+)"/);if(csrf)this.csrf=csrf[1];
  return {status:r.status,location:r.headers.get('location'),headers:r.headers,html};
 }
}
const a=new Client(),b=new Client();

let checks=0;function ok(v){assert.ok(v);checks++;}
try{
 let ready=false;for(let i=0;i<60;i++){try{await a.request('/account.php');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(ready,logs);
 const seed=spawnSync(php,[...args,'-r',String.raw`require 'dist/auth/bootstrap.php';$db=auth_db();$q=$db->prepare('INSERT INTO users(email,password_hash,first_name,last_name,phone,address,verified,created_at,updated_at,approval_status)VALUES(?,?,?,?,?,?,?,?,?,?)');foreach(['jgjanousek@gmail.com','other@example.invalid']as$e)$q->execute([$e,password_hash('Private-test-123',PASSWORD_DEFAULT),'Test','User','123456','','1',time(),time(),'approved']);`],{cwd:dir,encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
 ok((await a.request('/')).status===303);
 const login=await a.request('/account.php');ok(login.status===200&&login.html.includes('Soukromý vstup')&&!login.html.includes('Registrace'));
 ok(login.headers.get('x-robots-tag').includes('noindex'));
 for(const view of ['register','recover','verify','reset','approvals'])ok((await a.request('/account.php?view='+view)).status===404);
 await a.request('/account.php');
 for(const action of ['register','verify','reset','password','approval','profile','email_change'])ok((await a.request('/account.php',{action,email:'other@example.invalid',password:'Private-test-123'})).status===403);
 ok((await b.request('/account.php',{action:'login',email:'jgjanousek@gmail.com',password:'Private-test-123',csrf:'bad'})).status===403);
 await b.request('/account.php');
 ok(!(await b.request('/account.php',{action:'login',email:'other@example.invalid',password:'Private-test-123'})).location);
 ok((await b.request('/')).status===303);
 await a.request('/account.php');
 const owner=await a.request('/account.php',{action:'login',email:'jgjanousek@gmail.com',password:'Private-test-123'});ok(owner.status===303&&owner.location==='/');
 ok((await a.request('/')).status===200);
 await a.request('/account.php?view=profile');ok((await a.request('/account.php',{action:'logout'})).status===303);
 ok((await a.request('/')).status===303);
 console.log('PASS private owner-only access:',checks,'checks');
}finally{server.kill();await rm(dir,{recursive:true,force:true});}
