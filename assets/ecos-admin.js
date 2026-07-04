(() => {
  const SECRET_KEY = 'ecos_admin_secret';
  const VALID_STATUSES = ['approved', 'rejected', 'test', 'deleted'];

  const state = {
    secret: sessionStorage.getItem(SECRET_KEY) || '',
    submissions: [],
    activeId: '',
    loading: false
  };

  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    test: 'Test',
    deleted: 'Deleted'
  };

  const actions = [
    ['approved', 'Approve', 'primary'],
    ['rejected', 'Reject', 'secondary'],
    ['test', 'Test', 'secondary'],
    ['deleted', 'Deleted', 'secondary']
  ];

  const get = (selector) => document.querySelector(selector);

  function text(value, fallback = '') {
    return String(value || fallback).trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(value) {
    const raw = text(value);
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {}
    return '';
  }

  function formatDate(value) {
    const raw = text(value);
    if (!raw) return 'Data indisponível';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  function statusClass(status) {
    return `is-${text(status, 'pending').replace(/_/g, '-')}`;
  }

  function setMessage(message, tone = '') {
    const node = get('[data-admin-message]');
    if (!node) return;
    node.textContent = message || '';
    node.dataset.tone = tone;
    node.hidden = !message;
  }

  function setLoading(value) {
    state.loading = Boolean(value);
    document.querySelectorAll('[data-admin-status], [data-admin-refresh], [data-admin-login]').forEach((node) => {
      node.disabled = state.loading;
    });
  }

  async function api(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${state.secret}`,
      ...(options.headers || {})
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(path, {
      ...options,
      headers,
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || 'Não foi possível concluir a ação.');
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function renderShell() {
    const login = get('[data-admin-login-panel]');
    const app = get('[data-admin-app]');
    if (login) login.hidden = Boolean(state.secret);
    if (app) app.hidden = !state.secret;
  }

  function renderCounts() {
    const count = state.submissions.length;
    const pending = get('[data-admin-count="pending"]');
    if (pending) pending.textContent = String(count);
  }

  function renderList() {
    const list = get('[data-admin-list]');
    if (!list) return;

    if (!state.submissions.length) {
      list.innerHTML = `
        <div class="ecos-admin-empty">
          <span class="kicker">SEM PENDENTES</span>
          <h2>Nenhum envio pending agora</h2>
          <p>Quando alguém enviar uma obra pelo Ecos, ela aparecerá aqui para revisão.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.submissions.map((item) => `
      <button class="ecos-admin-item ${item.id === state.activeId ? 'is-active' : ''}" type="button" data-admin-item="${escapeHtml(item.id)}">
        <span class="ecos-admin-status ${statusClass(item.status)}">${escapeHtml(labels[item.status] || item.status)}</span>
        <strong>${escapeHtml(item.title || 'Sem título')}</strong>
        <small>${escapeHtml(item.author_name || 'Autor não informado')} · ${escapeHtml(item.creation_type || 'Tipo não informado')} · ${escapeHtml(item.age_rating || 'Classificação pendente')}</small>
        <small>${escapeHtml(formatDate(item.created_at))}</small>
      </button>
    `).join('');
  }

  function renderDetailPlaceholder() {
    const detail = get('[data-admin-detail]');
    if (!detail) return;
    detail.innerHTML = `
      <div class="ecos-admin-empty">
        <span class="kicker">REVIEW</span>
        <h2>Selecione um envio</h2>
        <p>A capa, o arquivo temporário e os dados editoriais aparecerão aqui.</p>
      </div>
    `;
  }

  function renderDetail(item) {
    const detail = get('[data-admin-detail]');
    if (!detail) return;
    if (!item) {
      renderDetailPlaceholder();
      return;
    }

    const coverUrl = safeUrl(item.cover_signed_url || item.cover_url);
    const fileUrl = safeUrl(item.file_signed_url);
    const externalLink = safeUrl(item.external_link);
    const socialUrl = safeUrl(item.author_social);

    detail.innerHTML = `
      <header class="ecos-admin-detail-head">
        <span class="ecos-admin-status ${statusClass(item.status)}">${escapeHtml(labels[item.status] || item.status)}</span>
        <h2>${escapeHtml(item.title || 'Sem título')}</h2>
        <p>${escapeHtml(item.short_description || 'Descrição não informada.')}</p>
      </header>

      <div class="ecos-admin-review-grid">
        <figure class="ecos-admin-cover">
          ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Capa enviada para ${escapeHtml(item.title)}." loading="lazy">` : '<div class="ecos-admin-cover-empty">Sem capa</div>'}
          <figcaption>Capa enviada</figcaption>
        </figure>
        <section class="ecos-admin-material">
          <span class="kicker">ARQUIVO PRIVADO</span>
          <strong>${escapeHtml(item.file_name || 'Material enviado')}</strong>
          ${fileUrl ? `<a class="button primary" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">Abrir signed URL</a>` : '<p>Arquivo indisponível para preview temporário.</p>'}
          <p>O link temporário é gerado no servidor e não expõe o caminho bruto do arquivo.</p>
        </section>
      </div>

      <dl class="ecos-admin-meta">
        <div><dt>Título</dt><dd>${escapeHtml(item.title || 'Não informado')}</dd></div>
        <div><dt>Autor</dt><dd>${escapeHtml(item.author_name || 'Não informado')}</dd></div>
        <div><dt>E-mail</dt><dd>${escapeHtml(item.author_email || 'Não informado')}</dd></div>
        <div><dt>Tipo</dt><dd>${escapeHtml(item.creation_type || 'Não informado')}</dd></div>
        <div><dt>Classificação</dt><dd>${escapeHtml(item.age_rating || 'Não informada')}</dd></div>
        <div><dt>Data</dt><dd>${escapeHtml(formatDate(item.created_at))}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(labels[item.status] || item.status)}</dd></div>
        <div><dt>Rede social</dt><dd>${socialUrl ? `<a href="${escapeHtml(socialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(socialUrl)}</a>` : 'Não informada'}</dd></div>
        <div><dt>Link externo</dt><dd>${externalLink ? `<a href="${escapeHtml(externalLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(externalLink)}</a>` : 'Não informado'}</dd></div>
      </dl>

      <div class="ecos-admin-actions" aria-label="Ações editoriais">
        ${actions.map(([status, label, tone]) => `
          <button class="button ${tone}" type="button" data-admin-status="${status}">${label}</button>
        `).join('')}
      </div>
    `;
  }

  async function loadList() {
    if (!state.secret) return;
    setLoading(true);
    setMessage('Carregando envios pendentes...');
    try {
      const payload = await api('/api/ecos-admin-submissions');
      state.submissions = Array.isArray(payload.items) ? payload.items : [];
      state.activeId = state.submissions[0]?.id || '';
      renderCounts();
      renderList();
      renderDetailPlaceholder();
      setMessage(state.submissions.length ? 'Envios pendentes carregados.' : 'Nenhum envio pending no momento.', 'success');
    } catch (error) {
      if (error.status === 401 || error.status === 403) logout('Senha administrativa inválida.');
      else setMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    if (!id) return;
    state.activeId = id;
    renderList();
    setLoading(true);
    setMessage('Gerando preview temporário...');
    try {
      const payload = await api(`/api/ecos-admin-submission?id=${encodeURIComponent(id)}`);
      renderDetail(payload.item);
      setMessage('Envio aberto para revisão.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
      renderDetailPlaceholder();
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status) {
    if (!VALID_STATUSES.includes(status) || !state.activeId) return;
    setLoading(true);
    setMessage(`Atualizando status para ${labels[status]}...`);
    try {
      await api('/api/ecos-admin-status', {
        method: 'POST',
        body: JSON.stringify({ id: state.activeId, status })
      });
      setMessage(`Status atualizado para ${labels[status]}.`, 'success');
      await loadList();
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function logout(message = '') {
    sessionStorage.removeItem(SECRET_KEY);
    state.secret = '';
    state.submissions = [];
    state.activeId = '';
    renderShell();
    renderCounts();
    renderList();
    renderDetailPlaceholder();
    setMessage(message);
  }

  function bind() {
    const form = get('[data-admin-login-form]');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = form.querySelector('[name="adminSecret"]');
        const secret = text(input?.value);
        if (!secret) {
          setMessage('Informe o ADMIN_SECRET para continuar.', 'error');
          return;
        }
        state.secret = secret;
        sessionStorage.setItem(SECRET_KEY, secret);
        renderShell();
        await loadList();
      });
    }

    document.addEventListener('click', (event) => {
      const itemButton = event.target.closest('[data-admin-item]');
      if (itemButton) loadDetail(itemButton.dataset.adminItem);

      const statusButton = event.target.closest('[data-admin-status]');
      if (statusButton) updateStatus(statusButton.dataset.adminStatus);

      if (event.target.closest('[data-admin-refresh]')) loadList();
      if (event.target.closest('[data-admin-logout]')) logout('Sessão local encerrada.');
    });
  }

  function init() {
    bind();
    renderShell();
    renderCounts();
    renderDetailPlaceholder();
    if (state.secret) loadList();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
