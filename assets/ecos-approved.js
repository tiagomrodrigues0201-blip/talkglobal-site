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
    const raw = text(value);
    if (!raw) return '';

    try {
      const url = new URL(raw, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {}
    return '';
  }

  function workHref(item) {
    return `/ecos/obra/?id=${encodeURIComponent(item.id)}`;
  }

  function readerPages(item) {
    return Array.isArray(item?.reader_pages)
      ? item.reader_pages.filter((page) => safeHttpUrl(page?.url))
      : [];
  }

  function chapters(item) {
    return Array.isArray(item?.chapters)
      ? item.chapters.filter((chapter) => safeHttpUrl(chapter?.url))
      : [];
  }

  function formatBytes(value) {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return '';
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  function renderChapterList(item) {
    const items = chapters(item);
    const externalLink = safeHttpUrl(item.external_link);
    if (!items.length && !externalLink) return '';

    return `
      <section class="ecos-chapter-panel" aria-label="Capítulos disponíveis">
        <span class="kicker">LEITURA</span>
        <h2>${items.length > 1 ? 'Capítulos disponíveis' : 'Arquivo disponível'}</h2>
        ${items.length ? `
          <ol class="ecos-chapter-list">
            ${items.map((chapter, index) => {
              const number = Number(chapter.number) > 0 ? Number(chapter.number) : index + 1;
              const size = formatBytes(chapter.size);
              return `
                <li>
                  <a href="${escapeHtml(safeHttpUrl(chapter.url))}" target="_blank" rel="noopener noreferrer">
                    <span>Capítulo ${number}</span>
                    <strong>${escapeHtml(chapter.title || `Capítulo ${number}`)}</strong>
                    ${size ? `<small>${escapeHtml(size)}</small>` : ''}
                  </a>
                </li>
              `;
            }).join('')}
          </ol>
        ` : ''}
        ${externalLink ? `<a class="button secondary" href="${escapeHtml(externalLink)}" target="_blank" rel="noopener noreferrer">Abrir link externo</a>` : ''}
      </section>
    `;
  }

  function renderReader(item) {
    const pages = readerPages(item);
    if (!pages.length) {
      if (chapters(item).length || safeHttpUrl(item.external_link)) return '';
      return `
        <section class="ecos-reader-empty" aria-live="polite">
          <span class="kicker">LEITOR</span>
          <h2>Leitor ainda não disponível.</h2>
          <p>Esta obra já está aprovada, mas as páginas otimizadas para leitura vertical ainda não foram preparadas.</p>
        </section>
      `;
    }

    const title = escapeHtml(item.title || 'obra');
    const total = pages.length;
    return `
      <section class="ecos-reader" aria-label="Leitor vertical de ${title}">
        ${pages.map((page, index) => {
          const width = Number(page.width) > 0 ? Math.round(Number(page.width)) : 1200;
          const height = Number(page.height) > 0 ? Math.round(Number(page.height)) : 1800;
          return `
            <figure class="ecos-reader-page">
              <img src="${escapeHtml(safeHttpUrl(page.url))}" alt="Página ${index + 1} de ${total} de ${title}." width="${width}" height="${height}" loading="lazy" decoding="async">
            </figure>
          `;
        }).join('')}
      </section>
    `;
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
        <a class="button secondary" href="${escapeHtml(workHref(item))}">Ver detalhes</a>
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
      </article>
      ${renderChapterList(item)}
      ${renderReader(item)}
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
