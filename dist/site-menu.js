const toggle=document.getElementById('menuToggle');
const nav=document.getElementById('topNav');
if(toggle&&nav){
 const setOpen=open=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Zavřít menu':'Otevřít menu');nav.classList.toggle('menu-open',open);toggle.querySelector('.menu-lines').textContent=open?'×':'☰';};
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
 nav.addEventListener('click',e=>{if(e.target.closest('a[href]'))setOpen(false);});
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!toggle.contains(e.target))setOpen(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus();}});
}
