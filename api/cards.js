import { createClient } from '@supabase/supabase-js';

const FIRST_GIFT_SLUG = 'airi_festival_lights';
const FIRST_GIFT_CARD = {
  id: null,
  slug: 'airi_festival_lights',
  title: 'Airi Kurohana — Festival de Luzes',
  character: 'Airi Kurohana',
  rarity: 'Especial',
  release_type: 'weekly_gift',
  week: 1,
  image_path: '/public/cards/airi_festival_lights.png',
  active: true
};

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase backend incompleto: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body || '{}');
    } catch {
      return {};
    }
  }

  return await new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    request.on('error', reject);
  });
}

async function getUserFromRequest(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function normalizeCard(card, ownedIds) {
  const owned = ownedIds.has(card.id);
  return {
    id: card.id,
    slug: card.slug,
    title: card.title,
    character: card.character,
    rarity: card.rarity,
    release_type: card.release_type,
    week: card.week,
    image_path: card.image_path,
    active: card.active,
    owned
  };
}

async function listCards(request, response) {
  const supabase = getSupabaseAdmin();
  const user = await getUserFromRequest(supabase, request);

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, slug, title, character, rarity, release_type, week, image_path, active')
    .eq('active', true)
    .order('week', { ascending: true })
    .order('created_at', { ascending: true });

  if (cardsError) {
    if (String(cardsError.message || '').includes("public.cards")) {
      return sendJson(response, 200, {
        ok: true,
        authenticated: Boolean(user),
        setupRequired: true,
        cards: [normalizeCard(FIRST_GIFT_CARD, new Set())]
      });
    }
    return sendJson(response, 500, { ok: false, error: 'cards_unavailable', message: cardsError.message });
  }

  const ownedIds = new Set();
  if (user) {
    const { data: userCards, error: ownedError } = await supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', user.id);

    if (ownedError) {
      return sendJson(response, 500, { ok: false, error: 'user_cards_unavailable', message: ownedError.message });
    }

    userCards.forEach((row) => ownedIds.add(row.card_id));
  }

  return sendJson(response, 200, {
    ok: true,
    authenticated: Boolean(user),
    cards: cards.map((card) => normalizeCard(card, ownedIds))
  });
}

async function claimCard(request, response) {
  const supabase = getSupabaseAdmin();
  const user = await getUserFromRequest(supabase, request);
  if (!user) {
    return sendJson(response, 401, { ok: false, error: 'login_required' });
  }

  const body = await readBody(request);
  const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : FIRST_GIFT_SLUG;

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, slug, title, character, rarity, release_type, week, image_path, active')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (cardError || !card) {
    if (String(cardError?.message || '').includes("public.cards")) {
      return sendJson(response, 503, {
        ok: false,
        error: 'setup_required',
        message: 'O cofre está publicado, mas as tabelas de cartas ainda precisam ser ativadas no Supabase.'
      });
    }
    return sendJson(response, 404, { ok: false, error: 'card_not_found' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('user_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', card.id)
    .maybeSingle();

  if (existingError) {
    return sendJson(response, 500, { ok: false, error: 'claim_lookup_failed', message: existingError.message });
  }

  if (existing) {
    return sendJson(response, 200, {
      ok: true,
      granted: false,
      alreadyOwned: true,
      card: normalizeCard(card, new Set([card.id]))
    });
  }

  const { error: insertError } = await supabase
    .from('user_cards')
    .insert({
      user_id: user.id,
      card_id: card.id,
      grant_reason: card.release_type || 'weekly_gift'
    });

  if (insertError && insertError.code !== '23505') {
    return sendJson(response, 500, { ok: false, error: 'claim_failed', message: insertError.message });
  }

  return sendJson(response, 201, {
    ok: true,
    granted: !insertError,
    alreadyOwned: insertError?.code === '23505',
    card: normalizeCard(card, new Set([card.id]))
  });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return await listCards(request, response);
    if (request.method === 'POST') return await claimCard(request, response);

    response.setHeader('Allow', 'GET, POST');
    return sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      error: 'server_error',
      message: error.message || 'Erro interno no cofre de cartas.'
    });
  }
}
