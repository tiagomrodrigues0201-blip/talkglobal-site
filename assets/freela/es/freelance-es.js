const sku='freelance-en-la-vida-real';
const statusEl=document.querySelector('[data-checkout-status]');
document.querySelectorAll(`[data-checkout="${sku}"]`).forEach(button=>button.addEventListener('click',async()=>{
 if(button.disabled)return;
 button.disabled=true;statusEl.textContent='Preparando el pago…';
 try{
  const r=await fetch('/api/freela-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:sku})});
  const d=await r.json();
  if(!r.ok||!d.url){statusEl.textContent=d.message||'La compra todavía no está disponible.';return;}
  let done=false;const redirect=()=>{if(!done){done=true;window.location.assign(d.url);}};
  if(typeof window.gtag==='function'){window.gtag('event','begin_checkout',{currency:d.currency,value:d.value,items:[{item_id:sku,item_name:'Freelance en la Vida Real',price:d.value,quantity:1}],event_callback:redirect,event_timeout:1000});setTimeout(redirect,1200);}else redirect();
 }catch{statusEl.textContent='No pudimos iniciar el pago. Inténtalo de nuevo más tarde.';}
 finally{button.disabled=false;}
}));
