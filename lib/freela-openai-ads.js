import crypto from 'node:crypto';

// Official CAPI: https://developers.openai.com/ads/conversions-api
// No contact details, IP addresses, payment tokens or buyer IDs are sent.
export function adsMetadata(input = {}) {
  if (input?.consent !== true) return {};
  const metadata = { openai_ads_consent: 'granted' };
  const ref = input.oppref;
  if (typeof ref === 'string' && ref.length > 0 && ref.length <= 4000 && !/[\x00-\x20\x7f]/.test(ref)) {
    // Stripe limits each metadata value to 500 characters. Never truncate oppref.
    metadata.openai_ads_ref_parts = String(Math.ceil(ref.length / 500));
    for (let i = 0; i < ref.length; i += 500) metadata[`openai_ads_ref_${i / 500}`] = ref.slice(i, i + 500);
  }
  return metadata;
}

function clickReference(metadata) {
  const count = Number(metadata.openai_ads_ref_parts);
  if (!Number.isInteger(count) || count < 1 || count > 8) return undefined;
  const parts = Array.from({ length: count }, (_, i) => metadata[`openai_ads_ref_${i}`]);
  if (parts.some(p => typeof p !== 'string' || !p || p.length > 500)) return undefined;
  const value = parts.join('');
  return /[\x00-\x20\x7f]/.test(value) ? undefined : value;
}

export function purchaseEvent(provider, payment, timestampMs) {
  const metadata = payment?.metadata || {};
  if (metadata.openai_ads_consent !== 'granted') return null;
  const product = metadata.product;
  const pt = product === 'freela-na-vida-real';
  const es = product === 'freelance-en-la-vida-real' && metadata.language === 'es';
  if (!pt && !es) return null;
  let amount;
  if (provider === 'stripe') {
    if (!payment.id?.startsWith('cs_') || payment.payment_status !== 'paid' || payment.mode !== 'payment' || payment.currency !== 'brl') return null;
    amount = payment.amount_total;
    if (!(pt ? [1499, 4700, 5700] : [1499]).includes(amount)) return null;
  } else if (provider === 'mercadopago') {
    if (!pt || !/^\d+$/.test(String(payment.id)) || payment.status !== 'approved' || payment.payment_method_id !== 'pix' || payment.currency_id !== 'BRL' || Number(payment.transaction_amount) !== 14.99) return null;
    amount = Math.round(Number(payment.transaction_amount) * 100);
    timestampMs = Date.parse(payment.date_approved);
  } else return null;
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) return null;
  const event = {
    id: 'tg_' + crypto.createHash('sha256').update(`${provider}:${payment.id}:order_created`).digest('hex'),
    type: 'order_created', timestamp_ms: timestampMs,
    source_url: `https://talkglobalapp.com${es ? '/es/freelance-en-la-vida-real/' : '/freela-na-vida-real/'}`,
    // opt_out restricts future user-level personalization, not purchase measurement.
    // Measurement consent is checked independently above before any event is built.
    action_source: 'web', opt_out: true,
    data: { type: 'contents', amount, currency: 'BRL', contents: [{ id: product, quantity: 1, content_type: 'product' }] }
  };
  const oppref = clickReference(metadata);
  if (oppref) event.oppref = oppref;
  return event;
}

export async function sendPurchase(provider, payment, timestampMs, env = process.env, send = fetch) {
  const mode = env.OPENAI_ADS_MODE || 'off';
  if (!['validate', 'live'].includes(mode)) return { skipped: 'disabled' };
  const event = purchaseEvent(provider, payment, timestampMs);
  if (!event) return { skipped: 'ineligible' };
  // Live conversions require an explicitly live provider payment, never a fixture.
  const live = provider === 'stripe' ? payment.livemode === true : payment.live_mode === true;
  if (mode === 'live' && !live) return { skipped: 'test_payment' };
  if (!env.OPENAI_ADS_PIXEL_ID || !env.OPENAI_ADS_CAPI_KEY) return { retry: true, reason: 'missing_config' };
  const age = Date.now() - event.timestamp_ms;
  if (age > 7 * 86400000 || age < -600000) return { skipped: 'outside_api_time_window' };
  try {
    const response = await send(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(env.OPENAI_ADS_PIXEL_ID)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_ADS_CAPI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: mode !== 'live', integration_source: 'talkglobal_freela', events: [event] }),
      signal: AbortSignal.timeout(4000)
    });
    // Non-2xx is retried by the payment provider webhook. Keep the same event ID.
    // Never log the response body, attribution reference, credentials or buyer data.
    return response.ok ? { sent: true, validatedOnly: mode !== 'live' } : { retry: true, reason: `http_${response.status}` };
  } catch { return { retry: true, reason: 'network' }; }
}
