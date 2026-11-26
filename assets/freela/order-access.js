(() => {
  const key = 'freela_order_access_v1';
  const maxAge = 30 * 86400000;
  const valid = value => {
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin && url.pathname === '/freela-na-vida-real/mercadopago/'
        && /^[a-f0-9]{64}$/.test(url.searchParams.get('checkout_token') || '')
        && (/^\d+$/.test(url.searchParams.get('payment_id') || '')
          || /^freela-na-vida-real:[a-f0-9-]{36}$/i.test(url.searchParams.get('reference') || ''));
    } catch { return false; }
  };
  window.freelaOrderAccess = {
    save(url) {
      if (!valid(url)) return false;
      try { localStorage.setItem(key, JSON.stringify({ url, at: Date.now() })); return true; }
      catch { return false; }
    },
    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && Date.now() >= saved.at && Date.now() - saved.at < maxAge && valid(saved.url)) return saved.url;
        localStorage.removeItem(key);
      } catch {}
      return null;
    }
  };
  const saved = window.freelaOrderAccess.load();
  const status = document.getElementById('status');
  if (saved && status) {
    const link = document.createElement('a');
    link.href = saved;
    link.textContent = 'Retomar minha compra ou baixar meus materiais';
    status.append(link);
  }
})();
