import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from './dist/engine.js';
import {calculatorReport,REPORT_LINKS} from './dist/module-report-data.js';
import {workbookBytes,chartSvg} from './dist/module-export.js';
import {unzip} from './dist/files.js';
test('individual and company reports keep their own settings and rows',()=>{
 const r=calculate({own:499,employees:7,employer:1234,years:12});
 const plan=calculatorReport(r,'plan'),company=calculatorReport(r,'company');
 assert.equal(plan.id,'plan');assert.equal(company.id,'firma');
 assert.ok(plan.settings.some(([k,v])=>k==='Doba investování (let)'&&v===12));
 assert.ok(!plan.settings.some(([k])=>k==='Počet zaměstnanců'));
 assert.ok(company.settings.some(([k,v])=>k==='Počet zaměstnanců'&&v===7));
 assert.ok(!company.settings.some(([k])=>k==='Doba investování (let)'));
 assert.equal(plan.rows.length,13);assert.equal(company.rows.length,5);
 assert.equal(company.summary.find(([k])=>k==='Náklad na DIP – celý tým / rok')[1],r.dipCost*7);
 assert.equal(plan.chart.series[0].values.at(-1),r.end.value);
 assert.deepEqual(company.chart.series[0].values,[r.wageNet,r.dipNetBenefit]);
});
test('each Excel contains a native chart with values from its module',async()=>{
 for(const kind of ['plan','company']){
  const report=calculatorReport(calculate({years:3,employees:7}),kind);
  const files=await unzip(workbookBytes(report)),decoder=new TextDecoder();
  const chart=files['xl/charts/chart1.xml'];
  assert.ok(chart.includes('GrafData!$A$2:'));assert.ok(chart.includes(kind==='plan'?'lineChart':'barChart'));
  assert.ok(chart.includes(String(report.chart.series[0].values.at(-1))));
  const settings=files['xl/worksheets/sheet2.xml'];
  assert.ok(settings.includes(kind==='plan'?'Doba investování':'Počet zaměstnanců'));
  assert.ok(!settings.includes(kind==='plan'?'Počet zaměstnanců':'Doba investování'));
  assert.ok(files['xl/worksheets/_rels/sheet5.xml.rels']);assert.ok(files['xl/drawings/_rels/drawing1.xml.rels']);
 }
});
test('chart keeps negative values and export QR links open the site and voluntary support',()=>{
 const svg=chartSvg({type:'bar',categories:['A','B'],series:[{name:'Test',color:'#76283b',values:[-100,200]}]});
 assert.ok(svg.includes('<rect'));assert.ok(!svg.includes('NaN'));
 assert.equal(REPORT_LINKS.website,'https://muj-dip.jirijanousek.cz/');
 assert.equal(REPORT_LINKS.support,'https://muj-dip.jirijanousek.cz/support.php');
});
