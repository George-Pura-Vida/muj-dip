export const RULES={year:2026,personalLimit:48000,employerLimit:50000,threshold:1762812,socialCap:2350416,taxCredit:30840};
export const DEFAULTS={own:4000,employer:3000,otherOwn:0,otherEmployer:0,salary:35000,employees:60,age:45,years:20,initial:0,rate:5,inflation:2.5,mode:'gross'};
export function clean(input){const s={...DEFAULTS};for(const k of Object.keys(DEFAULTS)){if(k==='mode'){s.mode=input.mode==='budget'?'budget':'gross';continue;}const v=Number(input[k]);if(Number.isFinite(v))s[k]=v;}
const bounds={own:[0,100000],employer:[0,100000],otherOwn:[0,48000],otherEmployer:[0,1000000],salary:[22400,1000000],employees:[1,100000],age:[18,90],years:[1,50],initial:[0,100000000],inflation:[0,15]};for(const [k,[a,b]] of Object.entries(bounds))s[k]=Math.min(b,Math.max(a,s[k]));s.rate=Math.max(-100,s.rate);for(const k of ['employees','age','years'])s[k]=Math.round(s[k]);return s;}
export function tax(base){base=Math.floor(Math.max(0,base)/100)*100;return Math.max(0,Math.min(base,RULES.threshold)*.15+Math.max(0,base-RULES.threshold)*.23-RULES.taxCredit);}
export function payroll(annual){return {net:annual-Math.min(annual,RULES.socialCap)*.071-annual*.045-tax(annual),cost:annual+Math.min(annual,RULES.socialCap)*.248+annual*.09};}
export function calculate(raw){const s=clean(raw),annualSalary=s.salary*12,annualEmployer=s.employer*12,exempt=Math.min(annualEmployer,Math.max(0,RULES.employerLimit-s.otherEmployer)),taxable=annualEmployer-exempt;
const base=payroll(annualSalary),dip=payroll(annualSalary+taxable),dipCost=dip.cost-base.cost+exempt;
let raise=annualEmployer;
if(s.mode==='budget'){let lo=0,hi=dipCost;for(let i=0;i<70;i++){let mid=(lo+hi)/2;if(payroll(annualSalary+mid).cost-base.cost>dipCost)hi=mid;else lo=mid;}raise=(lo+hi)/2;}
const wage=payroll(annualSalary+raise),wageCost=wage.cost-base.cost,wageNet=wage.net-base.net,dipTaxCost=taxable-(dip.net-base.net),dipNetBenefit=annualEmployer-dipTaxCost;
const allowance=Math.min(s.own*12,Math.max(0,RULES.personalLimit-s.otherOwn)),personalTax=tax(annualSalary+taxable)-tax(annualSalary+taxable-allowance);
const netRate=s.rate/100,monthlyRate=Math.pow(1+netRate,1/12)-1;
let value=s.initial;const points=[{year:0,value,own:s.initial,employer:0,gain:0,tax:0,real:value}];
for(let month=1;month<=s.years*12;month++){value=value*(1+monthlyRate)+s.own+s.employer;if(month%12===0){const y=month/12,own=s.initial+s.own*12*y,emp=annualEmployer*y;points.push({year:y,value,own,employer:emp,gain:value-own-emp,tax:personalTax*y,real:value/Math.pow(1+s.inflation/100,y)});}}
return {s,exempt,taxable,allowance,personalTax,dipCost,wageCost,wageNet,dipNetBenefit,dipTaxCost,companySaving:wageCost-dipCost,employeeDifference:dipNetBenefit-wageNet,raise,points,end:points.at(-1),netRate,eligibleAge:Math.max(60,s.age+10),eligible:s.years>=10&&s.age+s.years>=60};}
