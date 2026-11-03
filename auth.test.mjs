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
const profile={first_name:'Test',last_name:'Uživatel',company:'Test firma',ico:'12345678',dic:'CZ12345678',phone:'+420 777 123 456',address:'',email:'integration@example.invalid'};
const password='Test123';let checks=0;
function ok(value){assert.ok(value);checks++;}
async function mailToken(purpose){const lines=(await readFile(join(dir,'var/accounts/test-outbox.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);return new URL(lines.filter(x=>x.purpose===purpose).at(-1).url).hash.slice(7);}
try{
 let ready=false;for(let i=0;i<60;i++){try{await a.request('/account.php');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(ready,logs);
 const publicSupport=await a.request('/support.php?welcome=1');ok(publicSupport.status===200&&!publicSupport.html.includes('Váš účet je aktivní a jste přihlášeni.')&&publicSupport.html.includes('223366333/2010'));
 ok((await a.request('/')).status===303);
 ok((await a.request('/index.html')).status===303);
 ok((await a.request('/auth/bootstrap.php')).status===403);
 for(const legalView of ['terms','privacy','cookies','legal']){const legal=await b.request('/legal.php?view='+legalView);ok(legal.status===200&&legal.html.includes('IČO 13798804')&&legal.html.includes('data-cookie-settings'));}
 const legacyPrivacy=await b.request('/account.php?view=privacy');ok(legacyPrivacy.location==='/legal.php?view=privacy');
 const registration=await a.request('/account.php?view=register');
 for(const field of ['phone','address']){const input=registration.html.match(new RegExp('<input[^>]*name="'+field+'"[^>]*>'))?.[0];assert.ok(input&&/\brequired\b/.test(input)===(field==='phone'),'Required phone, optional address: '+field);}

 ok(registration.headers.get('referrer-policy')==='same-origin');
 ok(registration.html.includes('name="referrer" content="same-origin"'));
 ok(registration.html.includes('minlength="7"'));
 ok(registration.html.includes('/privacy.js?v=1')&&registration.html.includes('Podmínky používání')&&registration.html.includes('Ochrana údajů / GDPR'));
 ok(registration.html.includes('Aktivace bez čekání:')&&registration.html.includes('aplikace Vás automaticky přihlásí.'));
 const loginNotice=await a.request('/account.php?view=login');ok(loginNotice.html.includes('Po potvrzení e-mailu se Váš přístup aktivuje automaticky.'));
 const ownerNotice=await a.request('/account.php?view=register');
 ok((await a.request('/account.php?view=register',{action:'register',...profile,password,password_confirm:password,privacy:'yes',csrf:'invalid'})).status===403);
 for(const phone of ['', '------', '+1234567890123456']) {const invalidPhone=await a.request('/account.php?view=register',{action:'register',...profile,phone,password,password_confirm:password,privacy:'yes'});ok(invalidPhone.status===200&&!invalidPhone.location);}
 const reg=await a.request('/account.php?view=register',{action:'register',...profile,password,password_confirm:password,privacy:'yes'});ok(reg.status===303);
 ok(!(await readFile(join(dir,'var/accounts/accounts.sqlite'))).includes(Buffer.from(password)));
 const notifications=async()=> (await readFile(join(dir,'var/accounts/test-outbox.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).filter(x=>x.purpose==='admin-registration');
 const alerts=await notifications();ok(alerts.length===1);
 ok(alerts[0].to==='jgjanousek@gmail.com'&&alerts[0].subject.includes('Nová registrace'));
 ok(alerts[0].body.includes(profile.email)&&alerts[0].body.includes(profile.first_name+' '+profile.last_name)&&alerts[0].body.includes(profile.company)&&alerts[0].body.includes(profile.phone));
 ok(alerts[0].url===base+'/admin.php'&&!alerts[0].url.includes('token='));
 ok(!alerts[0].body.includes(password)&&!alerts[0].body.includes(await mailToken('verify')));
 // Duplicate registration does not send another administrator alert.
 await a.request('/account.php?view=register');
 ok((await a.request('/account.php?view=register',{action:'register',...profile,password,password_confirm:password,privacy:'yes'})).status===303);
 ok((await notifications()).length===1);

 await a.request('/account.php?view=login');
 ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).status===200);
 ok((await a.request('/')).status===303);
 const outbox=async()=> (await readFile(join(dir,'var/accounts/test-outbox.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const verificationMail=(await outbox()).find(x=>x.purpose==='verify');ok(verificationMail.body.includes(verificationMail.url)&&verificationMail.body.includes('24 hodin')&&verificationMail.body.includes('rovnou přihlásí'));
 const verify=await mailToken('verify');
 const lifetimes=spawnSync(php,[...args,'-r',`require ${JSON.stringify(join(dir,'dist/auth/bootstrap.php').replaceAll('\\\\','/'))}; echo auth_query("SELECT expires FROM tokens WHERE purpose='verify' LIMIT 1")->fetchColumn()-time();`],{encoding:'utf8'});
 assert.equal(lifetimes.status,0,lifetimes.stderr);ok(Number(lifetimes.stdout)>86300&&Number(lifetimes.stdout)<=86400);
 await a.request('/account.php?view=verify');
 const verifiedResponse=await a.request('/account.php?view=verify',{action:'verify',token:verify});ok(verifiedResponse.status===303&&verifiedResponse.location==='/support.php?welcome=1');
 const welcome=await a.request('/support.php?welcome=1');ok(welcome.status===200&&welcome.html.includes('Váš účet je aktivní a jste přihlášeni.')&&welcome.html.includes('Pokračovat do aplikace'));
 ok((await a.request('/')).status===200);await a.request('/account.php?view=profile');
 await a.request('/account.php?view=verify');ok((await a.request('/account.php?view=verify',{action:'verify',token:verify})).status===200);
 // Verification immediately enables login; explicit administrator restrictions still apply.
 ok((await b.request('/admin.php')).status===403);
 await a.request('/account.php?view=login');
 const pending=await a.request('/account.php?view=login',{action:'login',email:profile.email,password});
 ok(pending.location==='/');
 ok((await a.request('/')).status===200);
 const activationMail=(await outbox()).find(x=>x.purpose==='approved');ok(activationMail.to===profile.email&&activationMail.url===base+'/account.php?view=login');
 const admin=new Client();const adminProfile={...profile,email:'jgjanousek@gmail.com',first_name:'Správce'};
 await admin.request('/account.php?view=register');
 ok((await admin.request('/account.php?view=register',{action:'register',...adminProfile,password,password_confirm:password,privacy:'yes'})).status===303);
 await admin.request('/account.php?view=login');ok((await admin.request('/account.php?view=login',{action:'login',email:adminProfile.email,password})).status===200);
 const adminToken=await mailToken('verify');await admin.request('/account.php?view=verify');
 ok((await admin.request('/account.php?view=verify',{action:'verify',token:adminToken})).location==='/support.php?welcome=1');
 await admin.request('/account.php?view=profile');
 await admin.request('/account.php?view=login');ok((await admin.request('/account.php?view=login',{action:'login',email:adminProfile.email,password})).location==='/');
 const adminHome=await admin.request('/');ok(adminHome.html.includes('href="/admin.php"')&&adminHome.html.includes('Správa uživatelů')&&adminHome.html.includes('class="nav menu-account"')&&!adminHome.html.includes('class="account-shortcut"')&&adminHome.html.includes('Odhlásit se'));
 const panel=await admin.request('/admin.php');ok(panel.status===200&&panel.html.includes(profile.email)&&panel.html.includes('class="admin-table"'));
 const legacy=await admin.request('/account.php?view=approvals');ok(legacy.status===303&&legacy.location==='/admin.php');
 const filtered=await admin.request('/admin.php?q=nomatch123');ok(filtered.html.includes('Žádný účet neodpovídá')&&!filtered.html.includes(profile.email));
 const byPhone=await admin.request('/admin.php?q='+encodeURIComponent(profile.phone));ok(byPhone.html.includes(profile.email));
 ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'approved',csrf:'invalid'})).status===403);
 ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'approved'},{Origin:'https://example.invalid'})).status===403);
 ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'approved'})).status===303);
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).location==='/');
 ok((await a.request('/admin.php')).status===403);
 const userHome=await a.request('/');ok(userHome.html.includes('class="account-shortcut" href="/account.php?view=profile">Účet</a>')&&!userHome.html.includes('>Admin</a>'));
 ok((await a.request('/account.php?view=profile',{action:'approval',user_id:'1',decision:'approved'})).status===403);
 await admin.request('/admin.php');
 ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'pending'})).status===303);
 ok((await a.request('/')).status===303);
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).status===200);
 await admin.request('/admin.php');
 ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'rejected'})).status===303);
 await a.request('/account.php?view=login');const rejected=await a.request('/account.php?view=login',{action:'login',email:profile.email,password});ok(rejected.html.includes('nebyl schválen'));
 await admin.request('/admin.php');ok((await admin.request('/admin.php',{action:'approval',user_id:'1',decision:'approved'})).status===303);
 await admin.request('/admin.php');ok((await admin.request('/admin.php',{action:'approval',user_id:'2',decision:'rejected'})).status===200);
 await admin.request('/account.php?view=profile');ok((await admin.request('/account.php?view=profile',{action:'profile',...adminProfile,email:'other@example.invalid',current_password:password})).html.includes('E-mail správce nelze změnit'));
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:profile.email,password})).location==='/');
 const app=await a.request('/');ok(app.status===200&&app.html.includes('data-account-key="u1"'));ok(app.headers.get('cache-control').includes('no-store'));
 await a.request('/account.php?view=profile');ok((await a.request('/account.php?view=profile',{action:'profile',...profile,first_name:'Upraveno'})).status===303);
 ok((await a.request('/account.php?view=profile')).html.includes('value="Upraveno"'));
 await a.request('/account.php?view=profile');ok((await a.request('/account.php?view=profile',{action:'profile',...profile,first_name:'<script>alert(1)</script>'})).status===303);
 const safePanel=await admin.request('/admin.php');ok(safePanel.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;')&&!safePanel.html.includes('<script>alert(1)</script>'));
 await b.request('/account.php?view=forgot');ok((await b.request('/account.php?view=forgot',{action:'forgot',email:profile.email})).status===303);
 const reset=await mailToken('reset');await b.request('/account.php?view=reset');
 ok((await b.request('/account.php?view=reset',{action:'reset',token:reset,password:'žžžžžž',password_confirm:'žžžžžž'})).status===200);
 const newPassword='New1234';
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
 await a.request('/account.php?view=login');
 for(let i=0;i<10;i++)ok((await a.request('/account.php?view=login',{action:'login',email:'limit@example.invalid',password:'BadPassword'})).status===200);
 ok((await a.request('/account.php?view=login',{action:'login',email:'limit@example.invalid',password:'BadPassword'})).status===429);
 // Permanent deletion is tested only on this disposable local database.
 await a.request('/account.php?view=login');ok((await a.request('/account.php?view=login',{action:'login',email:'changed@example.invalid',password:newPassword})).location==='/');
 ok((await a.request('/account.php?view=profile',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid',confirm_delete:'yes'})).status===403);
 await admin.request('/admin.php');
 ok((await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid',confirm_delete:'yes',csrf:'invalid'})).status===403);
 ok((await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid',confirm_delete:'yes'},{Origin:'https://example.invalid'})).status===403);
 ok((await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'wrong@example.invalid',confirm_delete:'yes'})).html.includes('opište přesnou'));
 ok((await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid'})).html.includes('Potvrďte nevratné'));
 ok((await admin.request('/admin.php',{action:'delete-account',user_id:'2',confirm_email:adminProfile.email,confirm_delete:'yes'})).html.includes('nelze smazat'));
 ok((await a.request('/')).status===200);
 await admin.request('/admin.php');
 const removed=await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid',confirm_delete:'yes'});ok(removed.status===303&&removed.location==='/admin.php');
 ok((await a.request('/')).status===303);
 const remaining=await admin.request('/admin.php');ok(!remaining.html.includes('changed@example.invalid')&&remaining.html.includes(adminProfile.email));
 const deletionDb=spawnSync(php,[...args,'-r',`require ${JSON.stringify(join(dir,'dist/auth/bootstrap.php').replaceAll('\\','/'))};echo json_encode([auth_query('SELECT COUNT(*) FROM users WHERE id=1')->fetchColumn(),auth_query('SELECT COUNT(*) FROM tokens WHERE user_id=1')->fetchColumn(),auth_query('SELECT COUNT(*) FROM approval_audit WHERE user_id=1')->fetchColumn()]);`],{encoding:'utf8'});assert.equal(deletionDb.status,0,deletionDb.stderr);ok(JSON.parse(deletionDb.stdout).every(x=>Number(x)===0));
 await admin.request('/admin.php');ok((await admin.request('/admin.php',{action:'delete-account',user_id:'1',confirm_email:'changed@example.invalid',confirm_delete:'yes'})).html.includes('již neexistuje'));
 await b.request('/account.php?view=reset');ok((await b.request('/account.php?view=reset',{action:'reset',token:expired,password,password_confirm:password})).status===200);
 console.log(`PASS: ${checks} authentication integration checks (isolated SQLite and email outbox).`);
}catch(error){console.error(logs);throw error;}finally{server.kill();await new Promise(r=>server.once('exit',r));await rm(dir,{recursive:true,force:true});}


