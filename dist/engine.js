export const RULES={year:2026,personalLimit:48000,employerLimit:50000,threshold:1762812,socialCap:2350416,taxCredit:30840};
export const DEFAULTS={own:4000,employer:3000,otherOwn:0,otherEmployer:0,salary:50000,employees:50,age:30,years:30,initial:0,initialNew:0,rate:7,inflation:1,mode:'gross'};
export function clean(input){const s={...DEFAULTS};for(const k of Object.keys(DEFAULTS)){if(k==='mode'){s.mode=input.mode==='budget'?'budget':'gross';continue;}const v=Number(input[k]);if(Number.isFinite(v))s[k]=v;}
const bounds={own:[0,100000],employer:[0,100000],otherOwn:[0,48000],otherEmployer:[0,1000000],salary:[22400,1000000],employees:[1,100000],age:[18,90],years:[1,50],initial:[0,100000000],initialNew:[0,1],inflation:[0,15]};for(const [k,[a,b]] of Object.entries(bounds))s[k]=Math.min(b,Math.max(a,s[k]));s.rate=Math.max(-100,s.rate);for(const k of ['employees','age','years','initialNew'])s[k]=Math.round(s[k]);return s;}
export function tax(base){base=Math.floor(Math.max(0,base)/100)*100;return Math.max(0,Math.min(base,RULES.threshold)*.15+Math.max(0,base-RULES.threshold)*.23-RULES.taxCredit);}
// Keep the actual deduction separate from the effect of rounding the annual tax basis.
export function taxDetail(base,deduction=0){
 const before=Math.max(0,base),applied=Math.min(before,Math.max(0,deduction)),after=before-applied;
 const roundedBefore=Math.floor(before/100)*100,roundedAfter=Math.floor(after/100)*100;
 const base23=Math.max(0,before-RULES.threshold),deduction23=base23-Math.max(0,after-RULES.threshold);
 const deduction15=applied-deduction23,saving=tax(before)-tax(after);
 const withoutRounding=amount=>Math.max(0,Math.min(amount,RULES.threshold)*.15+Math.max(0,amount-RULES.threshold)*.23-RULES.taxCredit);
 const roundingEffect=saving-(withoutRounding(before)-withoutRounding(after));
 return {base:before,base15:Math.min(before,RULES.threshold),base23,deduction:applied,deduction23,deduction15,roundedBefore,roundedAfter,roundingEffect,saving};
}
export function payroll(annual){return {net:annual-Math.min(annual,RULES.socialCap)*.071-annual*.045-tax(annual),cost:annual+Math.min(annual,RULES.socialCap)*.248+annual*.09};}
export function calculate(raw){const s=clean(raw),annualSalary=s.salary*12,annualEmployer=s.employer*12,exempt=Math.min(annualEmployer,Math.max(0,RULES.employerLimit-s.otherEmployer)),taxable=annualEmployer-exempt;
const otherTaxable=Math.max(0,s.otherEmployer-RULES.employerLimit),baselineIncome=annualSalary+otherTaxable;
const base=payroll(baselineIncome),dip=payroll(baselineIncome+taxable),dipCost=dip.cost-base.cost+exempt;
let raise=annualEmployer;
if(s.mode==='budget'){let lo=0,hi=dipCost;for(let i=0;i<70;i++){let mid=(lo+hi)/2;if(payroll(baselineIncome+mid).cost-base.cost>dipCost)hi=mid;else lo=mid;}raise=(lo+hi)/2;}
const wage=payroll(baselineIncome+raise),wageCost=wage.cost-base.cost,wageNet=wage.net-base.net,dipTaxCost=taxable-(dip.net-base.net),dipNetBenefit=annualEmployer-dipTaxCost;
const allowance=Math.min(s.own*12,Math.max(0,RULES.personalLimit-s.otherOwn)),incomeAfterOtherDeductions=baselineIncome+taxable-s.otherOwn,personalTax=tax(incomeAfterOtherDeductions)-tax(incomeAfterOtherDeductions-allowance);
const firstYearAllowance=Math.min(s.own*12+(s.initialNew?s.initial:0),Math.max(0,RULES.personalLimit-s.otherOwn)),firstYearTax=tax(incomeAfterOtherDeductions)-tax(incomeAfterOtherDeductions-firstYearAllowance),initialTaxExtra=firstYearTax-personalTax;
const netRate=s.rate/100,monthlyRate=Math.pow(1+netRate,1/12)-1;
let value=s.initial;const points=[{year:0,value,own:s.initial,employer:0,gain:0,tax:0,real:value}];
for(let month=1;month<=s.years*12;month++){value=value*(1+monthlyRate)+s.own+s.employer;if(month%12===0){const y=month/12,own=s.initial+s.own*12*y,emp=annualEmployer*y;points.push({year:y,value,own,employer:emp,gain:value-own-emp,tax:personalTax*y+initialTaxExtra,real:value/Math.pow(1+s.inflation/100,y)});}}
return {s,exempt,taxable,allowance,personalTax,firstYearAllowance,firstYearTax,initialTaxExtra,personalTaxDetail:taxDetail(incomeAfterOtherDeductions,allowance),firstYearTaxDetail:taxDetail(incomeAfterOtherDeductions,firstYearAllowance),dipCost,wageCost,wageNet,dipNetBenefit,dipTaxCost,companySaving:wageCost-dipCost,employeeDifference:dipNetBenefit-wageNet,raise,points,end:points.at(-1),netRate,eligibleAge:Math.max(60,s.age+10),eligible:s.years>=10&&s.age+s.years>=60};}


