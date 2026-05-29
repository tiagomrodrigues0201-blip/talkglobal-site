const FIRST_GIFT_SLUG = 'ren_natal';
const UNLOCK_MESSAGE = 'Você desbloqueou uma carta colecionável: Ren Natal.';
const DEFAULT_CARDS = [{
  slug: 'ren_natal',
  title: 'Ren Natal',
  character: 'Ren Hazama',
  rarity: 'Especial',
  release_type: 'weekly_gift',
  week: 1,
  image_path: '/public/cards/ren_natal.png',
  active: true,
  owned: false
}];

const state = {
  client: null,
  session: null,
  cards: []
};

const selectors = {
  form: '[data-card-login-form]',
  email: '[data-card-email]',
  status: '[data-card-status]',
  grid: '[data-card-grid]',
  signOut: '[data-card-signout]',
  user: '[data-card-user]',
  toast: '[data-card-toast]'
};

function getElement(selector) {
  return document.querySelector(selector);
}

function setStatus(message, type = 'neutral') {
  const status = getElement(selectors.status);
  if (!status) return;
  status.textContent = message || '';
  status.dataset.state = type;
}

function showToast(message) {
  const toast = getElement(selectors.toast);
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 8200);
}

function setAuthUi() {
  const form = getElement(selectors.form);
  const signOut = getElement(selectors.signOut);
  const user = getElement(selectors.user);
  const email = state.session?.user?.email || '';

  if (form) form.hidden = Boolean(state.session);
  if (signOut) signOut.hidden = !state.session;
  if (user) {
    user.hidden = !state.session;
    user.textContent = email ? `Acesso reconhecido: ${email}` : '';
  }
}

function cardMarkup(card) {
  const owned = Boolean(card.owned);
  const imagePath = card.image_path || '/public/cards/ren_natal.png';
  const stateLabel = owned ? 'Desbloqueada' : 'Bloqueada';

  return `
    <article class="collectible-card ${owned ? 'is-owned' : 'is-locked'}">
      <div class="collectible-card__frame">
        <figure class="watermarked-image collectible-card__image" oncontextmenu="return false">
          <img src="${imagePath}" alt="${owned ? `${card.title}, carta colecionável de ${card.character}` : 'Carta colecionável bloqueada de HESIDIO'}" draggable="false" loading="lazy" decoding="async">
          <span class="watermarked-image__pattern" aria-hidden="true">HESIDIO · @hesidio</span>
          <span class="watermarked-image__diagonal" aria-hidden="true">HESIDIO</span>
          <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
        </figure>
      </div>
      <div class="collectible-card__body">
        <span>${stateLabel} // Semana ${card.week}</span>
        <h2>${owned ? card.title : 'Registro lacrado'}</h2>
        <p>${owned ? `${card.character} · Raridade ${card.rarity}` : 'Faça login para receber o primeiro presente semanal do arquivo HESIDIO.'}</p>
        <small>${card.release_type === 'weekly_gift' ? 'Presente semanal' : 'Arquivo especial'}</small>
      </div>
    </article>
  `;
}

function renderCards() {
  const grid = getElement(selectors.grid);
  if (!grid) return;

  if (!state.cards.length) {
    grid.innerHTML = `
      <article class="collectible-card is-locked">
        <div class="collectible-card__body">
          <span>COFRE VAZIO</span>
          <h2>Nenhuma carta ativa foi encontrada.</h2>
          <p>O arquivo ainda não respondeu. Verifique a estrutura do Supabase antes de publicar novas cartas.</p>
        </div>
      </article>
    `;
    return;
  }

  grid.innerHTML = state.cards.map(cardMarkup).join('');
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (state.session?.access_token) {
    headers.set('Authorization', `Bearer ${state.session.access_token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || 'O cofre recusou a solicitação.');
  }
  return payload;
}

async function loadCards() {
  try {
    const payload = await apiFetch('/api/cards', { method: 'GET' });
    state.cards = Array.isArray(payload.cards) ? payload.cards : DEFAULT_CARDS;
    renderCards();
  } catch (error) {
    state.cards = DEFAULT_CARDS;
    renderCards();
    throw error;
  }
}

async function claimFirstGift() {
  if (!state.session) return;
  const payload = await apiFetch('/api/cards', {
    method: 'POST',
    body: JSON.stringify({ slug: FIRST_GIFT_SLUG })
  });

  if (payload.granted) {
    showToast(UNLOCK_MESSAGE);
    setStatus(UNLOCK_MESSAGE, 'success');
  }
}

async function refreshAfterAuth() {
  setAuthUi();
  if (state.session) {
    await claimFirstGift().catch((error) => setStatus(error.message, 'error'));
  }
  await loadCards();
}

async function initSupabase() {
  if (!window.supabase?.createClient) {
    setStatus('O cliente de login ainda não carregou. Recarregue a página em alguns segundos.', 'error');
    state.cards = DEFAULT_CARDS;
    renderCards();
    return;
  }

  let config = { configured: false };
  try {
    const configResponse = await fetch('/api/auth-config', { cache: 'no-store' });
    const contentType = configResponse.headers.get('content-type') || '';
    config = contentType.includes('application/json') ? await configResponse.json() : { configured: false };
  } catch {
    config = { configured: false };
  }

  if (!config.configured) {
    setStatus('O Auth separado das cartas HESIDIO ainda precisa ser configurado.', 'error');
    state.cards = DEFAULT_CARDS;
    renderCards();
    return;
  }

  state.client = window.supabase.createClient(config.supabaseUrl, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const { data } = await state.client.auth.getSession();
  state.session = data?.session || null;
  await refreshAfterAuth();

  state.client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session || null;
    await refreshAfterAuth().catch((error) => setStatus(error.message, 'error'));
  });
}

function bindLogin() {
  const form = getElement(selectors.form);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = getElement(selectors.email)?.value?.trim();
    if (!email || !state.client) return;

    setStatus('Enviando chave de acesso...', 'neutral');

    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://talkglobalapp.com/cartas'
      }
    });

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Chave enviada. Abra seu e-mail para acessar o cofre.', 'success');
  });
}

function bindSignOut() {
  const signOut = getElement(selectors.signOut);
  if (!signOut) return;

  signOut.addEventListener('click', async () => {
    if (!state.client) return;
    await state.client.auth.signOut();
    state.session = null;
    setStatus('Acesso encerrado.', 'neutral');
    await refreshAfterAuth().catch((error) => setStatus(error.message, 'error'));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindLogin();
  bindSignOut();
  setAuthUi();

  try {
    await initSupabase();
  } catch (error) {
    setStatus(error.message || 'O cofre de cartas não respondeu.', 'error');
    renderCards();
  }
});
