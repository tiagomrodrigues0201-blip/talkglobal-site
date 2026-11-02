import { sendPurchase, adsMetadata } from '../lib/freela-openai-ads.js';

// Preview-only diagnostic. The real key never leaves the Vercel function.
// No request body can select a destination, enable live mode, or supply buyer data.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (process.env.VERCEL_ENV !== 'preview' || process.env.OPENAI_ADS_MODE !== 'validate') {
    res.statusCode = 404; return res.end();
  }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validação CAPI — prévia</title><h1>Validar conexão com a CAPI</h1><p>Somente validate_only. Não cria pagamentos nem registra vendas. A chave permanece no servidor.</p><form method="post"><button type="submit">Validar Stripe e Pix sem registrar vendas</button></form></html>');
  }
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end(); }
  const origin = req.headers.origin;
  let sameOrigin = false;
  try { sameOrigin = new URL(origin).host === req.headers.host; } catch {}
  if (!sameOrigin) { res.statusCode = 403; return res.end(); }
  const now = Date.now();
  const metadata = { product: 'freela-na-vida-real', ...adsMetadata({ consent: true }) };
  const env = { ...process.env, OPENAI_ADS_MODE: 'validate' };
  const stripe = await sendPurchase('stripe', { id: 'cs_test_talkglobal_capi_validation', livemode: false, payment_status: 'paid', mode: 'payment', currency: 'brl', amount_total: 1499, metadata }, now, env);
  const pix = await sendPurchase('mercadopago', { id: '999999999', live_mode: false, status: 'approved', payment_method_id: 'pix', currency_id: 'BRL', transaction_amount: 14.99, date_approved: new Date(now).toISOString(), metadata }, now, env);
  res.statusCode = stripe.validatedOnly && pix.validatedOnly ? 200 : 502;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ validate_only: true, stripe, pix }));
}
