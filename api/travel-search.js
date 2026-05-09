import { createClient } from '@supabase/supabase-js';

const TEXT_LIMIT = 140;

function cleanText(value, limit = TEXT_LIMIT) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function cleanDate(value) {
  const text = cleanText(value, 16);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanInteger(value, fallback = 1) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 1), 20);
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'Metodo nao permitido' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    const origin = cleanText(body.origin);
    const destination = cleanText(body.destination);

    if (!origin || !destination) {
      return response.status(400).json({ ok: false, error: 'Origem e destino sao obrigatorios' });
    }

    const payload = {
      origin,
      destination,
      budget: cleanText(body.budget, 40),
      start_date: cleanDate(body.start_date),
      end_date: cleanDate(body.end_date),
      travel_style: cleanText(body.travel_style, 60),
      output_language: cleanText(body.output_language || 'pt-BR', 20),
      travelers: cleanInteger(body.travelers),
      estimated_cost: body.estimated_cost && typeof body.estimated_cost === 'object' ? body.estimated_cost : {},
      result: body.result && typeof body.result === 'object' ? body.result : {},
      affiliate_source: 'talkglobal-travel',
      plan: 'free'
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('travel_searches')
        .insert(payload)
        .select('id')
        .single();

      if (!error) {
        return response.status(201).json({ ok: true, mode: 'saved', id: data?.id });
      }

      console.warn('travel-search insert skipped', { code: error.code, message: error.message });
    }

    return response.status(202).json({
      ok: true,
      mode: 'accepted',
      id: crypto.randomUUID(),
      message: 'Busca recebida.'
    });
  } catch (error) {
    console.error('travel-search failed', { message: error?.message });
    return response.status(500).json({ ok: false, error: 'Nao foi possivel processar a busca agora' });
  }
}
