import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('existing accounts require approval; only verified configured owner bypasses gate',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mujdip-migration-'));
 try {
  await mkdir(join(root,'dist/auth'),{recursive:true}); await mkdir(join(root,'var/accounts'),{recursive:true});
  const php=process.env.PHP_BINARY||'php';const args=process.env.PHP_EXTENSION_DIR?['-d',`extension_dir=${process.env.PHP_EXTENSION_DIR}`,'-d','extension=pdo_sqlite']:[];
  const run=code=>{const r=spawnSync(php,[...args,'-r',code],{encoding:'utf8',cwd:root});assert.equal(r.status,0,r.stderr);return r.stdout;};
  run(`$db=new PDO('sqlite:var/accounts/accounts.sqlite');$db->exec('CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,first_name TEXT NOT NULL,last_name TEXT NOT NULL,company TEXT DEFAULT "",ico TEXT DEFAULT "",dic TEXT DEFAULT "",phone TEXT NOT NULL,address TEXT NOT NULL,verified INTEGER DEFAULT 0,session_version INTEGER DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)');$q=$db->prepare('INSERT INTO users(id,email,password_hash,first_name,last_name,phone,address,verified,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?)');foreach([[1,'old@example.invalid',1],[2,'jgjjanousek@gmail.com',1],[3,'unverified@example.invalid',0]]as$r)$q->execute([$r[0],$r[1],'unused','Test','User','123456','Test',$r[2],time(),time()]);`);
  await copyFile(new URL('./dist/auth/bootstrap.php',import.meta.url),join(root,'dist/auth/bootstrap.php'));
  const out=run(`require 'dist/auth/bootstrap.php';auth_boot();$db=auth_db();$rows=$db->query('SELECT * FROM users ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);$checks=[count($rows)===3,$rows[0]['approval_status']==='pending',!auth_approved($rows[0]),auth_is_admin($rows[1]),auth_approved($rows[1]),!auth_is_admin($rows[2])];$_SESSION=['uid'=>1,'version'=>1,'seen'=>time(),'started'=>time()];$checks[]=auth_user()===null;$_SESSION=['uid'=>2,'version'=>1,'seen'=>time(),'started'=>time()];$checks[]=auth_user()['id']===2;echo json_encode($checks);`);
  const checks=JSON.parse(out);assert.equal(checks.length,8);assert.ok(checks.every(Boolean));
  const second=run(`require 'dist/auth/bootstrap.php';$db=auth_db();$db->exec("UPDATE users SET approval_status='approved' WHERE id=1");echo json_encode(auth_approved($db->query('SELECT * FROM users WHERE id=1')->fetch(PDO::FETCH_ASSOC)));`);
  assert.equal(JSON.parse(second),true);
 }finally{await rm(root,{recursive:true,force:true});}
});
