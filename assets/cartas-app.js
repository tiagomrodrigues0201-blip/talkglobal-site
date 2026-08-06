const state = {
  client: null,
  session: null,
  cards: [],
  deckIds: [],
  deck: [],
  synergies: [],
  progression: null,
  battleId: null,
  battle: null,
  backendUrl: '',
  mockApi: null
};

const $ = (selector) => document.querySelector(selector);

function setStatus(message, type = 'neutral') {
  const node = $('[data-card-status]');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = type;
}

function toast(message) {
  const node = $('[data-card-toast]');
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
  window.setTimeout(() => { node.hidden = true; }, 5200);
}

function setLoading(button, loading, label) {
  if (!button) return;
  button.dataset.loading = loading ? 'true' : 'false';
  button.textContent = loading ? (label || 'Salvando...') : (button.dataset.defaultLabel || button.textContent);
  button.disabled = loading || button.disabled;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function api(action, payload = {}, method = 'POST') {
  if (state.mockApi) {
    return state.mockApi.handle(action, payload, method);
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (state.session?.access_token) headers.set('Authorization', `Bearer ${state.session.access_token}`);
  const base = state.backendUrl ? state.backendUrl.replace(/\/+$/, '') : '';
  const request = mapApiRequest(action, payload, method);
  const response = await fetch(`${base}${request.path}`, {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.message || data.error || 'A API de cartas recusou a ação.');
  return data;
}

function mapApiRequest(action, payload, method) {
  if (!state.backendUrl) {
    return {
      method,
      path: method === 'GET' ? `/api/cards?action=${encodeURIComponent(action)}` : '/api/cards',
      body: method === 'GET' ? null : { action, ...payload }
    };
  }

  if (action === 'catalog') return { method: 'GET', path: '/cartas/catalog' };
  if (action === 'state') return { method: 'GET', path: '/cartas/me' };
  if (action === 'initial-cards') return { method: 'POST', path: '/cartas/initial-cards', body: { photoData: payload.photoData || '' } };
  if (action === 'save-deck') return { method: 'POST', path: '/cartas/deck', body: { cardIds: payload.cardIds || [] } };
  if (action === 'start-tutorial') return { method: 'POST', path: '/cartas/battle/tutorial', body: {} };
  if (action === 'battle-action') {
    return {
      method: 'POST',
      path: `/cartas/battle/${encodeURIComponent(payload.battleId)}/action`,
      body: { action: payload.battleAction || { type: 'attack' } }
    };
  }
  return { method, path: '/api/cards', body: { action, ...payload } };
}

function setAuthUi() {
  const form = $('[data-card-login-form]');
  const signOut = $('[data-card-signout]');
  const user = $('[data-card-user]');
  const email = state.session?.user?.email || '';
  if (form) form.hidden = Boolean(state.session);
  if (signOut) signOut.hidden = !state.session;
  if (user) {
    user.hidden = !state.session;
    user.textContent = email ? `Conectado: ${email}` : '';
  }
}

function rarityClass(card) {
  const rarity = String(card.rarity || 'comum').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['comum', 'rara', 'lendaria', 'mitica'].includes(rarity) ? rarity : 'comum';
}

function statMarkup(card) {
  return [
    ['ATK', card.atk],
    ['DEF', card.def],
    ['SPD', card.spd],
    ['ENG', card.eng],
    ['HP', card.hp]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${Number(value || 0)}</dd></div>`).join('');
}

function cardRole(card) {
  const archetype = String(card.archetype || '').toLowerCase();
  if (archetype.includes('sentinela')) return 'sentinela';
  if (archetype.includes('duelista')) return 'duelista';
  if (archetype.includes('guard')) return 'guardiao';
  return 'default';
}

function demoArtSvg(card, size = 'card') {
  const role = cardRole(card);
  const element = String(card.element || '').toLowerCase();
  const id = `art-${escapeHtml(card.id || card.characterName || 'card')}-${size}`;
  const palettes = {
    solar: ['#f7d36d', '#b85e28', '#1b1711'],
    metal: ['#aeb8bf', '#5f6f77', '#12181a'],
    vento: ['#8ee7dd', '#2d8da8', '#10202a'],
    aqua: ['#8dd7ff', '#1f70aa', '#0d1824'],
    ignis: ['#ff9c5c', '#b72f2b', '#1b0e0a'],
    umbra: ['#a893ff', '#3a2f63', '#090711']
  };
  const [primary, secondary, dark] = palettes[element] || palettes.solar;
  const weapon = role === 'sentinela'
    ? '<path class="weapon" d="M206 172 C226 188 226 232 206 252 C186 232 186 188 206 172Z"/><path class="weapon-line" d="M206 184 L206 240"/>'
    : role === 'duelista'
      ? '<path class="weapon-line" d="M182 190 C232 156 246 246 186 238"/><path class="weapon-line" d="M188 196 L214 224"/>'
      : '<path class="weapon-line" d="M92 248 L192 126"/><path class="weapon" d="M186 116 L204 118 L194 134Z"/>';
  const posture = role === 'duelista'
    ? '<path class="body" d="M112 194 C134 174 168 178 184 206 L168 300 L106 300Z"/>'
    : role === 'sentinela'
      ? '<path class="body" d="M112 188 C138 168 178 172 198 198 L178 300 L104 300Z"/>'
      : '<path class="body" d="M102 198 C130 166 174 166 196 202 L176 300 L98 300Z"/>';
  return `
    <svg class="cartas-demo-art cartas-demo-art--${escapeHtml(role)}" viewBox="0 0 300 420" role="img" aria-label="Arte demonstrativa de ${escapeHtml(card.characterName)}">
      <defs>
        <radialGradient id="${id}-aura" cx="50%" cy="28%" r="58%">
          <stop offset="0%" stop-color="${primary}" stop-opacity=".95"/>
          <stop offset="58%" stop-color="${secondary}" stop-opacity=".46"/>
          <stop offset="100%" stop-color="${dark}" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="${id}-ground" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${secondary}" stop-opacity=".82"/>
          <stop offset="100%" stop-color="${dark}" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="300" height="420" fill="url(#${id}-ground)"/>
      <circle class="aura" cx="150" cy="142" r="112" fill="url(#${id}-aura)"/>
      <path class="particle" d="M46 74 H70 M230 88 H262 M38 218 H68 M220 292 H270"/>
      <path class="cape" d="M92 178 C62 232 58 322 88 390 C118 356 130 280 124 204Z"/>
      ${posture}
      <circle class="head" cx="148" cy="136" r="38"/>
      <path class="visor" d="M126 138 C140 130 158 130 174 138"/>
      ${weapon}
      <path class="base-glow" d="M78 330 C120 310 188 310 230 330 C206 362 106 362 78 330Z"/>
    </svg>
  `;
}

function cardArt(card) {
  if (card.imageUrl) return `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.characterName)}">`;
  return demoArtSvg(card);
}

function renderCards() {
  const grid = $('[data-card-grid]');
  if (!grid) return;
  if (!state.session) {
    grid.innerHTML = '<article class="cartas-empty">Entre na conta para carregar sua coleção.</article>';
    return;
  }
  if (!state.cards.length) {
    grid.innerHTML = '<article class="cartas-empty">Você ainda não tem cartas. Envie uma foto para criar as 3 iniciais.</article>';
    return;
  }
  const selected = new Set(state.deckIds);
  grid.innerHTML = state.cards.map((card) => `
    <article class="cartas-game-card rarity-${rarityClass(card)} ${selected.has(card.id) ? 'is-selected' : ''}" data-card-id="${escapeHtml(card.id)}">
      <button class="cartas-card-select" type="button" data-toggle-card="${escapeHtml(card.id)}" aria-pressed="${selected.has(card.id) ? 'true' : 'false'}" aria-label="${selected.has(card.id) ? 'Remover' : 'Selecionar'} ${escapeHtml(card.characterName)} do baralho">
        <span class="cartas-selected-badge" aria-hidden="true">${selected.has(card.id) ? '✓ Selecionada' : 'Selecionar'}</span>
        <div class="cartas-game-card__top">
          <strong>${escapeHtml(card.characterName)}</strong>
          <span>${escapeHtml(card.rarityLabel)} · Nv. ${card.level}</span>
        </div>
        <div class="cartas-game-card__art">${cardArt(card)}</div>
        <div class="cartas-game-card__body">
          <p>${escapeHtml(card.archetype)} · ${escapeHtml(card.element)}</p>
          <dl>${statMarkup(card)}</dl>
          <div class="cartas-card-traits">
            <span><b>Poder</b>${escapeHtml(card.power)}</span>
            <span><b>Arma</b>${escapeHtml(card.weapon)}</span>
            <span><b>Habilidade</b>${escapeHtml(card.ability)}</span>
          </div>
        </div>
      </button>
      <button class="cartas-detail-trigger" type="button" data-card-detail="${escapeHtml(card.id)}">Ver detalhes</button>
    </article>
  `).join('');
  renderSelectionUi();
}

function renderDeck() {
  const deck = $('[data-deck]');
  if (!deck) return;
  if (!state.deck.length) {
    deck.innerHTML = '<p>Selecione 3 cartas para formar o baralho.</p>';
    return;
  }
  deck.innerHTML = state.deck.map((card, index) => `
    <article>
      <span>${index + 1}</span>
      <strong>${escapeHtml(card.characterName)}</strong>
      <small>${escapeHtml(card.element)} · ${escapeHtml(card.weapon)}</small>
    </article>
  `).join('');
}

function renderSynergies() {
  const node = $('[data-synergies]');
  if (!node) return;
  if (!state.synergies.length) {
    node.innerHTML = '<p>Nenhuma sinergia ativa no baralho atual.</p>';
    return;
  }
  node.innerHTML = state.synergies.map((synergy) => `
    <article>
      <strong>${escapeHtml(synergy.name)}</strong>
      <p>${escapeHtml(synergy.description)}</p>
      <small>${bonusText(synergy.bonus)}</small>
    </article>
  `).join('');
}

function bonusText(bonus = {}) {
  const entries = Object.entries(bonus).filter(([, value]) => Number(value || 0) !== 0);
  return entries.length ? entries.map(([key, value]) => `+${value} ${key.toUpperCase()}`).join(' · ') : 'Bônus especial';
}

function renderSelectionUi() {
  const count = state.deckIds.length;
  const summary = $('[data-selection-summary]');
  const saveState = $('[data-save-state]');
  const saveButton = $('[data-save-deck]');
  if (summary) summary.textContent = `${count} de 3 cartas selecionadas`;
  if (saveState) saveState.textContent = count === 3 ? 'Baralho pronto para salvar.' : 'Selecione exatamente 3 cartas.';
  if (saveButton) {
    saveButton.dataset.defaultLabel = saveButton.dataset.defaultLabel || saveButton.textContent;
    saveButton.disabled = count !== 3;
    saveButton.classList.toggle('is-ready', count === 3);
  }
}

function renderProgression() {
  const node = $('[data-progression]');
  if (!node) return;
  const progression = state.progression || {};
  node.innerHTML = `
    <strong>Nível ${Number(progression.level_unlocked || 1)}</strong>
    <span>${progression.tutorial_completed ? 'Tutorial concluído' : 'Tutorial pendente'}</span>
    <span>${Number(progression.victories || 0)} vitórias</span>
  `;
}

function renderBattle() {
  const wrapper = $('[data-battle]');
  if (!wrapper || !state.battle) return;
  wrapper.hidden = false;
  const player = state.battle.player.deck[state.battle.activePlayerIndex] || state.battle.player.deck.find((card) => card.currentHp > 0);
  const enemy = state.battle.enemy.deck[state.battle.activeEnemyIndex] || state.battle.enemy.deck.find((card) => card.currentHp > 0);
  $('[data-player-active]').innerHTML = combatantMarkup('Sua carta', player);
  $('[data-enemy-active]').innerHTML = combatantMarkup('Máquina', enemy);
  $('[data-battle-log]').innerHTML = state.battle.log.slice(-8).reverse().map((item) => `<li>${escapeHtml(item.message)}</li>`).join('');
  const select = $('[data-switch-select]');
  select.innerHTML = state.battle.player.deck.map((card, index) => `<option value="${index}">${escapeHtml(card.characterName)} (${card.currentHp} HP)</option>`).join('');
}

function combatantMarkup(label, card) {
  if (!card) return '<article class="cartas-combatant"><strong>Sem carta ativa</strong></article>';
  return `
    <article class="cartas-combatant">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(card.characterName)}</strong>
      <p>${escapeHtml(card.rarityLabel)} · ${escapeHtml(card.element)} · ${escapeHtml(card.weapon)}</p>
      <meter min="0" max="${card.hp}" value="${card.currentHp}"></meter>
      <small>${card.currentHp}/${card.hp} HP · ${card.eng} ENG</small>
    </article>
  `;
}

function syncPayload(payload) {
  const source = payload.state || payload;
  state.cards = source.cards || state.cards;
  state.deck = source.deck || state.deck;
  state.deckIds = source.deckIds || state.deckIds;
  state.synergies = source.synergies || state.synergies;
  state.progression = source.progression || state.progression;
  renderCards();
  renderDeck();
  renderSynergies();
  renderProgression();
  renderSelectionUi();
}

async function loadState() {
  if (!state.session) {
    syncPayload({ cards: [], deck: [], deckIds: [], synergies: [], progression: null });
    return;
  }
  const payload = await api('state', {}, 'GET');
  syncPayload(payload);
}

function readPhotoAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function initSupabase() {
  if (isMockMode()) {
    const mod = await import('/assets/cartas-test-mock.js');
    state.mockApi = mod.createCartasMockApi();
    state.session = { access_token: 'mock-token', user: { email: 'teste-local@talkglobal.test' } };
    const note = $('[data-mock-note]');
    if (note) note.hidden = false;
    setAuthUi();
    await loadState();
    return;
  }

  if (!window.supabase?.createClient) throw new Error('Cliente Supabase não carregou.');
  const response = await fetch('/api/auth-config', { cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Configuração de autenticação indisponível neste ambiente.');
  }
  const config = await response.json();
  if (!config.configured) throw new Error(config.message || 'Supabase Auth não configurado.');
  state.backendUrl = String(config.backendUrl || '').replace(/\/+$/, '');
  state.client = window.supabase.createClient(config.supabaseUrl, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data } = await state.client.auth.getSession();
  state.session = data?.session || null;
  setAuthUi();
  await loadState().catch((error) => setStatus(error.message, 'error'));
  state.client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session || null;
    setAuthUi();
    await loadState().catch((error) => setStatus(error.message, 'error'));
  });
}

function isMockMode() {
  const params = new URLSearchParams(window.location.search);
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) && params.get('mockCartas') === '1';
}

function bindEvents() {
  $('[data-card-login-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.mockApi) {
      state.session = { access_token: 'mock-token', user: { email: $('[data-card-email]')?.value?.trim() || 'teste-local@talkglobal.test' } };
      setAuthUi();
      await loadState();
      return setStatus('Mock local conectado.', 'success');
    }
    const email = $('[data-card-email]')?.value?.trim();
    if (!email || !state.client) return;
    setStatus('Enviando link de acesso...', 'neutral');
    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://talkglobalapp.com/cartas/' }
    });
    setStatus(error ? error.message : 'Link enviado. Abra seu e-mail para entrar.', error ? 'error' : 'success');
  });

  $('[data-card-signout]')?.addEventListener('click', async () => {
    await state.client?.auth.signOut();
    state.session = null;
    setAuthUi();
    await loadState();
  });

  $('[data-photo-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.session) return setStatus('Entre na conta antes de criar cartas.', 'error');
    setStatus('Criando cartas iniciais...', 'neutral');
    const photoData = await readPhotoAsDataUrl($('[data-photo-input]')?.files?.[0]);
    const payload = await api('initial-cards', { photoData });
    syncPayload(payload);
    setStatus(payload.created ? 'Três cartas comuns criadas.' : 'Você já usou sua geração gratuita inicial.', payload.created ? 'success' : 'neutral');
    toast(payload.created ? 'Seu baralho inicial está pronto.' : 'As cartas iniciais já existem.');
  });

  $('[data-card-grid]')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toggle-card]');
    if (!button) return;
    const id = button.dataset.toggleCard;
    if (state.deckIds.includes(id)) {
      state.deckIds = state.deckIds.filter((cardId) => cardId !== id);
    } else if (state.deckIds.length < 3) {
      state.deckIds.push(id);
    } else {
      setStatus('O baralho já tem 3 cartas. Remova uma carta antes de selecionar outra.', 'error');
      toast('Limite de 3 cartas no baralho.');
      return;
    }
    state.deck = state.deckIds.map((cardId) => state.cards.find((card) => card.id === cardId)).filter(Boolean);
    state.synergies = [];
    renderCards();
    renderDeck();
    renderSynergies();
    renderSelectionUi();
  });

  $('[data-save-deck]')?.addEventListener('click', async () => {
    if (state.deckIds.length !== 3) return setStatus('Escolha exatamente 3 cartas.', 'error');
    const button = $('[data-save-deck]');
    button.dataset.defaultLabel = button.dataset.defaultLabel || button.textContent;
    button.disabled = true;
    button.textContent = 'Salvando...';
    try {
      const payload = await api('save-deck', { cardIds: state.deckIds });
      syncPayload(payload);
      setStatus('Baralho salvo com sinergias recalculadas.', 'success');
      toast('Baralho salvo.');
    } finally {
      button.textContent = button.dataset.defaultLabel;
      renderSelectionUi();
    }
  });

  $('[data-card-grid]')?.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-card-detail]');
    if (!trigger) return;
    openCardDetail(trigger.dataset.cardDetail);
  });

  $('[data-start-battle]')?.addEventListener('click', async () => {
    const payload = await api('start-tutorial');
    state.battleId = payload.battleId;
    state.battle = payload.state;
    renderBattle();
    setStatus('Tutorial iniciado.', 'success');
  });

  document.querySelectorAll('[data-battle-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.battleId) return;
      const type = button.dataset.battleAction;
      const cardIndex = Number($('[data-switch-select]')?.value || 0);
      const payload = await api('battle-action', { battleId: state.battleId, battleAction: { type, cardIndex } });
      state.battle = payload.state;
      renderBattle();
      if (payload.winner) {
        setStatus(payload.winner === 'player' ? 'Tutorial vencido. Nível 2 liberado.' : 'A máquina venceu. Tente novamente.', payload.winner === 'player' ? 'success' : 'error');
        await loadState().catch(() => {});
      }
    });
  });

  $('[data-card-detail-close]')?.addEventListener('click', closeCardDetail);
  $('[data-card-detail-modal]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeCardDetail();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCardDetail();
  });
}

function openCardDetail(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  const modal = $('[data-card-detail-modal]');
  if (!card || !modal) return;
  $('[data-card-detail-art]').innerHTML = cardArt(card);
  $('[data-card-detail-title]').textContent = card.characterName;
  $('[data-card-detail-rarity]').textContent = `${card.rarityLabel} · ${card.element} · ${card.archetype}`;
  $('[data-card-detail-description]').textContent = card.description || 'Carta do baralho TalkGlobal.';
  $('[data-card-detail-stats]').innerHTML = statMarkup(card);
  $('[data-card-detail-facts]').innerHTML = [
    ['Poder', card.power],
    ['Arma', card.weapon],
    ['Habilidade', card.ability],
    ['Sinergias possíveis', possibleSynergyText(card)]
  ].map(([label, value]) => `<article><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></article>`).join('');
  modal.className = `cartas-detail-modal rarity-${rarityClass(card)}`;
  modal.hidden = false;
  document.body.classList.add('has-card-modal');
  $('[data-card-detail-close]')?.focus();
}

function possibleSynergyText(card) {
  const related = state.synergies.filter((synergy) => {
    const text = `${synergy.description || ''} ${synergy.name || ''}`.toLowerCase();
    return text.includes(String(card.weaponFamily || '').toLowerCase()) || text.includes(String(card.element || '').toLowerCase());
  });
  if (related.length) return related.map((item) => item.name).join(', ');
  return 'Pode ativar bônus por arma, elemento ou trindade de elementos no baralho.';
}

function closeCardDetail() {
  const modal = $('[data-card-detail-modal]');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('has-card-modal');
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  try {
    await initSupabase();
    setStatus(state.session ? 'Conta conectada.' : 'Conecte sua conta para começar.', state.session ? 'success' : 'neutral');
  } catch (error) {
    setStatus(error.message || 'Falha ao iniciar cartas IA.', 'error');
    renderCards();
  }
});
