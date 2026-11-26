const sku='freelance-en-la-vida-real';
const statusEl=document.querySelector('[data-checkout-status]');
const buttons=[...document.querySelectorAll(`[data-checkout="${sku}"]`)];
let busy=false;
buttons.forEach(button=>button.addEventListener('click',async()=>{
 if(busy)return;
 busy=true;buttons.forEach(b=>b.disabled=true);statusEl.textContent='Preparando el pago…';
 let redirecting=false;
 try{
  const r=await fetch('/api/freela-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:sku,openai_ads:window.talkglobalOpenAIAttribution?.()})});
  const d=await r.json();
  if(!r.ok||!d.url){statusEl.textContent=d.message||'La compra todavía no está disponible.';return;}
  const url=new URL(d.url);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port||d.value!==14.99||d.currency!=='BRL')throw Error('Invalid checkout');
  redirecting=true;
  let done=false;const redirect=()=>{if(!done){done=true;window.location.assign(d.url);}};
  if(typeof window.gtag==='function'){window.gtag('event','begin_checkout',{currency:d.currency,value:d.value,items:[{item_id:sku,item_name:'Freelance en la Vida Real',price:d.value,quantity:1}],event_callback:redirect,event_timeout:1000});setTimeout(redirect,1200);}else redirect();
 }catch{statusEl.textContent='No pudimos iniciar el pago. Inténtalo de nuevo más tarde.';}
 finally{if(!redirecting){busy=false;buttons.forEach(b=>b.disabled=false);}}
}));
