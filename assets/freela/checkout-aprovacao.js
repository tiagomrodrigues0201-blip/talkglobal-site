(() => {
  const buttons = [...document.querySelectorAll('[data-mercadopago-checkout]')];
  const status = document.getElementById('status');
  let busy = false;
  let requestId = crypto.randomUUID();
  for (const button of buttons) button.addEventListener('click', async () => {
    if (busy) return; busy = true; buttons.forEach(b => b.disabled = true);
    status.textContent = 'Abrindo checkout seguro do Mercado Pago…';
    try {
      const response = await fetch('/api/freela-mercadopago-checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({product:'freela-na-vida-real',request_id:requestId,openai_ads:window.talkglobalOpenAIAttribution?.()})});
      const data = await response.json();
      if (!response.ok || data.value !== 19.9 || data.currency !== 'BRL') throw Error('checkout');
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*mercadopago\.com(?:\.br)?$/i.test(url.hostname) || url.username || url.password || url.port) throw Error('redirect');
      if (data.resume_url) window.freelaOrderAccess?.save(data.resume_url);
      let redirected=false; const redirect=()=>{if(!redirected){redirected=true;location.assign(url.href);}};
      if(typeof window.gtag==='function'){window.gtag('event','begin_checkout',{currency:'BRL',value:19.9,items:[{item_id:'freela-na-vida-real',item_name:'Freela na Vida Real',quantity:1,price:19.9}],event_callback:redirect,event_timeout:1000});setTimeout(redirect,1200);}else redirect();
    } catch { status.textContent = 'Não foi possível abrir o pagamento. Tente novamente ou contate suporte@talkglobalapp.com.'; busy = false; buttons.forEach(b => b.disabled = false); }
  });
})();
