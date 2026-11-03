const numbers=new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:8});
const yearsPlural=new Intl.PluralRules('cs');
export const number=value=>numbers.format(value);
export const percent=(value,digits)=>new Intl.NumberFormat('cs-CZ',digits===undefined?{maximumFractionDigits:8}:{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value)+' %';
export const years=value=>number(value)+' '+({one:'rok',few:'roky',many:'roku',other:'let'}[yearsPlural.select(value)]);
