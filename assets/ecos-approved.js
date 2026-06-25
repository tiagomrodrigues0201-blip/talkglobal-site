(() => {
  const grid = document.querySelector('[data-ecos-approved-grid]');
  const detail = document.querySelector('[data-ecos-approved-detail]');

  function text(value, fallback = '') {
    return String(value || fallback).trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(text(value), window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {}
    return '';
  }

  function workHref(item) {
    const externalLink = safeHttpUrl(item.external_link);
    if (externalLink) return externalLink;
    return `/ecos/obra/?id=${encodeURIComponent(item.id)}`;
  }

  function workTarget(item) {
    return safeHttpUrl(item.external_link) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }

  function card(item) {
    const type = escapeHtml(item.creation_type || 'Eco aprovado');
    const rating = escapeHtml(item.age_rating || 'Classificação pendente');
    const author = escapeHtml(item.author_name || 'Autor informado');
    return `
      <article class="ecos-card ecos-approved-card">
        <figure class="ecos-card__image">
          <img src="${escapeHtml(item.cover_url)}" alt="Capa de ${escapeHtml(item.title)}." width="900" height="900" loading="lazy" decoding="async">
        </figure>
        <span>${type} · ${rating}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <small>por ${author}</small>
        <p>${escapeHtml(item.short_description)}</p>
        <a class="button secondary" href="${escapeHtml(workHref(item))}"${workTarget(item)}>Ver obra</a>
      </article>
    `;
  }

  async function loadApprovedCards() {
    if (!grid) return;
    const response = await fetch('/api/ecos-approved', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Array.isArray(payload.items) || !payload.items.length) return;
    grid.innerHTML = payload.items.map(card).join('');
  }

  function renderDetail(item) {
    if (!detail) return;
    if (!item) {
      detail.innerHTML = `
        <section class="ecos-form intro-card">
          <span class="kicker">ECO NÃO ENCONTRADO</span>
          <h1>Registro indisponível</h1>
          <p>Este Eco ainda não está aprovado para visualização pública.</p>
          <a class="button secondary" href="/ecos/">Voltar para Ecos</a>
        </section>
      `;
      return;
    }

    const externalLink = safeHttpUrl(item.external_link);
    const external = externalLink
      ? `<a class="button primary" href="${escapeHtml(externalLink)}" target="_blank" rel="noopener noreferrer">Abrir link externo</a>`
      : '<button class="button secondary" type="button" disabled>Leitura pública será liberada após revisão final.</button>';

    detail.innerHTML = `
      <section class="ecos-form-intro">
        <span class="kicker">${escapeHtml(item.creation_type)} · ${escapeHtml(item.age_rating)}</span>
        <h1>${escapeHtml(item.title)}</h1>
        <p>por ${escapeHtml(item.author_name)}</p>
      </section>
      <article class="ecos-form">
        <figure class="ecos-card__image">
          <img src="${escapeHtml(item.cover_url)}" alt="Capa de ${escapeHtml(item.title)}." width="900" height="900" loading="lazy" decoding="async">
        </figure>
        <p>${escapeHtml(item.short_description)}</p>
        <p class="ecos-form-help">Arquivos privados do Ecos de Hélicon não são expostos nesta visualização local. PDFs privados continuam protegidos em ecos-files.</p>
        ${external}
      </article>
    `;
  }

  async function loadApprovedDetail() {
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      renderDetail(null);
      return;
    }

    const response = await fetch(`/api/ecos-approved?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    renderDetail(response.ok && payload.ok ? payload.item : null);
  }

  loadApprovedCards().catch(() => {});
  loadApprovedDetail().catch(() => renderDetail(null));
})();
