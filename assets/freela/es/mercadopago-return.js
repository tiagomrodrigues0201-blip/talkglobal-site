(() => {
  let params = new URLSearchParams(location.search);
  const heading = document.querySelector('[data-title]');
  const status = document.querySelector('[data-status]');
  const download = document.querySelector('[data-download-link]');
  const retry = document.querySelector('[data-retry]');
  let id = params.get('payment_id') || params.get('collection_id') || '';
  let reference = params.get('reference') || '';
  let token = params.get('checkout_token') || '';
  if (!token) {
    const saved = window.freelaOrderAccess?.load();
    if (saved) {
      params = new URL(saved, location.origin).searchParams;
      id = params.get('payment_id') || '';
      reference = params.get('reference') || '';
      token = params.get('checkout_token') || '';
    }
  }
  if (!/^[a-f0-9]{64}$/.test(token) || !(/^\d+$/.test(id) || /^freelance-en-la-vida-real:[a-f0-9-]{36}$/i.test(reference))) {
    heading.textContent = 'No pudimos identificar tu compra';
    status.textContent = 'Si ya pagaste, escribe a soporte con el comprobante. No vuelvas a comprar antes de confirmar.';
    return;
  }
  const query = new URLSearchParams({ checkout_token: token });
  if (id) query.set('payment_id', id); else query.set('reference', reference);
  const resume = '/es/freelance-en-la-vida-real/mercadopago/?' + query;
  window.freelaOrderAccess?.save(resume);
  // Keep bearer access out of subsequent history, referrers and analytics URLs.
  try { history.replaceState(null, '', location.pathname); } catch {}
  const endpoint = '/api/freela-mercadopago-checkout-status?' + query;
  let attempts = 0, running = false, timer;
  function trackPurchase(result) {
    if (typeof window.gtag !== 'function' || !/^mp_\d+$/.test(result.transaction_id || '')) return;
    const key = 'freela_purchase_' + result.transaction_id;
    try { if (localStorage.getItem(key) === 'sent') return; } catch {}
    window.gtag('event', 'purchase', {
      transaction_id: result.transaction_id, value: result.value, currency: result.currency,
      items: [{ item_id: 'freelance-en-la-vida-real', item_name: 'Freelance en la Vida Real', price: result.value, quantity: 1 }]
    });
    try { localStorage.setItem(key, 'sent'); } catch {}
  }
  async function check() {
    if (running) return;
    clearTimeout(timer);
    running = true; attempts++; retry.hidden = true;
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!response.ok) throw Error('Unable to verify');
      if (result.paid === true && result.language === 'es' && result.product_slug === 'freelance-en-la-vida-real' && result.value === 19.9 && result.currency === 'BRL') {
        const url = new URL(result.download_url, location.origin);
        if (url.origin !== location.origin || url.pathname !== '/api/freela-download') throw Error('Invalid download');
        heading.textContent = '¡Pago confirmado!';
        status.textContent = 'Tu ebook y el kit en español ya están disponibles. Puedes volver a esta página para recuperar el acceso en este navegador.';
        download.href = url.pathname + url.search;
        download.dataset.ready = 'true'; download.removeAttribute('aria-disabled');
        trackPurchase(result); running = false; return;
      }
      if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(result.status)) {
        heading.textContent = 'Pago no aprobado';
        status.textContent = 'No se ha habilitado la descarga. Vuelve al producto para intentarlo de nuevo o contacta con soporte.';
        running = false; return;
      }
      heading.textContent = 'Esperando confirmación';
      status.textContent = 'Si pagaste con Pix, la confirmación puede tardar unos instantes. Esta página la comprueba automáticamente.';
    } catch {
      heading.textContent = 'Confirmación temporalmente no disponible';
      status.textContent = 'Vuelve a comprobar el pago. Si ya pagaste, no compres otra vez: regresa a esta página o contacta con soporte.';
    }
    running = false;
    if (attempts < 24) timer = setTimeout(check, 5000);
    else { retry.hidden = false; status.textContent += ' La consulta automática se ha pausado. Pulsa verificar de nuevo para continuar.'; }
  }
  retry.addEventListener('click', () => { attempts = 0; check(); });
  check();
})();
