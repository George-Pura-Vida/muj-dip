import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('./dist/index.html');
const cmp=read('./dist/comparison.js');
const css=read('./dist/style.css');
test('four calculator destinations have the required names and visual sequence',()=>{
  const source=html.match(/<div class="tabs"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
  const tabs=[...source.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(tabs,['plan','company','method']);
  assert.match(source,/data-tab="method">04 <span>Pravidla a výpočty<\/span>/);
  assert.ok(cmp.includes("tab.innerHTML='03 <span>DIP × DPS</span>'"));
  assert.ok(cmp.includes('document.querySelector(\'.tabs [data-tab="method"]\').before(tab)'));
  assert.ok(cmp.includes('document.querySelector(\'.menu-pages [data-tab="method"]\').before(nav)'));
  assert.ok(cmp.includes('<span class="nav-label">DIP × DPS</span>'));
  assert.ok(html.includes('<span class="nav-label">Můj DIP</span>'));
  assert.ok(html.includes('<span class="nav-label">Pravidla a výpočty</span>'));
});
test('visible compact burgundy tabs remain usable on mobile',()=>{
  assert.match(css,/\.tabs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.tabs button\{[^}]*background:#76283b/);
  assert.match(css,/@media screen and \(max-width:767px\)\{\s*\.toolbar\{display:block!important/);
  assert.match(css,/\.tabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
