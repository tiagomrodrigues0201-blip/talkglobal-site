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
  if (!/^[a-f0-9]{64}$/.test(token) || !(/^\d+$/.test(id) || /^freela-na-vida-real:[a-f0-9-]{36}$/i.test(reference))) {
    heading.textContent = 'Não foi possível identificar sua compra';
    status.textContent = 'Se você concluiu um pagamento, entre em contato com nosso suporte com o comprovante. Não faça outra compra antes de confirmar.';
    return;
  }
  const query = new URLSearchParams({ checkout_token: token });
  if (id) query.set('payment_id', id); else query.set('reference', reference);
  const resume = '/freela-na-vida-real/mercadopago/?' + query;
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
      items: [{ item_id: 'freela-na-vida-real', item_name: 'Freela na Vida Real', price: result.value, quantity: 1 }]
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
      if (result.paid === true && result.value === 19.9 && result.currency === 'BRL') {
        const url = new URL(result.download_url, location.origin);
        if (url.origin !== location.origin || url.pathname !== '/api/freela-download') throw Error('Invalid download');
        heading.textContent = 'Pagamento confirmado!';
        status.textContent = 'Seu ebook e os materiais do kit já estão disponíveis. Você pode voltar a esta página para recuperar o acesso neste navegador.';
        download.href = url.pathname + url.search;
        download.dataset.ready = 'true'; download.removeAttribute('aria-disabled');
        trackPurchase(result); running = false; return;
      }
      if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(result.status)) {
        heading.textContent = 'Pagamento não aprovado';
        status.textContent = 'Nenhum material foi liberado. Volte ao produto para tentar novamente ou entre em contato com o suporte.';
        running = false; return;
      }
      heading.textContent = 'Aguardando confirmação';
      status.textContent = 'Se você pagou com Pix, a confirmação pode levar alguns instantes. Esta página verifica automaticamente.';
    } catch {
      heading.textContent = 'Confirmação temporariamente indisponível';
      status.textContent = 'Tente verificar novamente. Se você já pagou, não faça outra compra: retome por esta página ou fale com nosso suporte.';
    }
    running = false;
    if (attempts < 24) timer = setTimeout(check, 5000);
    else { retry.hidden = false; status.textContent += ' A consulta automática foi pausada. Toque em verificar novamente para continuar.'; }
  }
  retry.addEventListener('click', () => { attempts = 0; check(); });
  check();
})();
