import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { adsMetadata, purchaseEvent, sendPurchase } from '../lib/freela-openai-ads.js';
import handler from '../api/freela.js';
const now = Date.now();
const metadata = { product: 'freela-na-vida-real', ...adsMetadata({ consent: true, oppref: 'opaque_AD-ref=' }) };
const stripe = { id: 'cs_test_conversion', livemode: false, payment_status: 'paid', mode: 'payment', currency: 'brl', amount_total: 1499, metadata };
const pix = { id: 123456, live_mode: false, status: 'approved', payment_method_id: 'pix', currency_id: 'BRL', transaction_amount: 14.99, date_approved: new Date(now).toISOString(), metadata };
const env = { OPENAI_ADS_MODE: 'validate', OPENAI_ADS_PIXEL_ID: 'test-pixel', OPENAI_ADS_CAPI_KEY: 'test-only' };

test('approved Stripe and Pix produce BRL cents, no PII, stable per-purchase event IDs', () => {
  for (const [provider, payment] of [['stripe', stripe], ['mercadopago', pix]]) {
    const a = purchaseEvent(provider, { ...payment, customer_email: 'private@example.com', payer: { email: 'private@example.com' } }, now);
    assert.equal(a.type, 'order_created'); assert.equal(a.data.amount, 1499); assert.equal(a.data.currency, 'BRL');
    assert.equal(a.oppref, 'opaque_AD-ref='); assert.equal(a.opt_out, true); assert.equal(a.user, undefined);
    assert.equal(a.id, purchaseEvent(provider, payment, now + 500).id);
    assert.ok(!JSON.stringify(a).includes('private@example.com'));
    assert.ok(!JSON.stringify(a).includes(String(payment.id)));
  }
  assert.notEqual(purchaseEvent('stripe', stripe, now).id, purchaseEvent('mercadopago', pix, now).id);
});

test('pending, unpaid, refunded, wrong product/currency/amount and missing consent are not sales', () => {
  for (const changes of [{ payment_status: 'unpaid' }, { currency: 'usd' }, { amount_total: 1 }, { mode: 'subscription' }, { metadata: {} }, { metadata: { ...metadata, product: 'other' } }]) assert.equal(purchaseEvent('stripe', { ...stripe, ...changes }, now), null);
  for (const changes of [{ status: 'pending' }, { status: 'in_process' }, { status: 'refunded' }, { transaction_amount: 1 }, { currency_id: 'USD' }, { date_approved: null }, { metadata: {} }]) assert.equal(purchaseEvent('mercadopago', { ...pix, ...changes }, now), null);
});

test('opaque attribution survives metadata splitting; no consent means no attribution', () => {
  const oppref = 'gAAAAA_' + 'a'.repeat(1700) + '==';
  const m = adsMetadata({ consent: true, oppref });
  assert.equal(purchaseEvent('stripe', { ...stripe, metadata: { ...metadata, ...m } }, now).oppref, oppref);
  assert.ok(Object.values(m).every(x => x.length <= 500));
  assert.deepEqual(adsMetadata({ consent: false, oppref }), {});
  for (const ref of ['bad\nref', 'a'.repeat(4001), 7]) assert.equal(adsMetadata({ consent: true, oppref: ref }).openai_ads_ref_parts, undefined);
});

test('off mode never sends; live mode blocks test payments; validate_only uses official endpoint', async () => {
  let calls = 0;
  const send = async (url, opts) => {
    calls++;
    assert.equal(url, 'https://bzr.openai.com/v1/events?pid=test-pixel');
    assert.equal(opts.headers.Authorization, 'Bearer test-only');
    const body = JSON.parse(opts.body); assert.equal(body.validate_only, true); assert.equal(body.events[0].data.amount, 1499);
    return { ok: true };
  };
  assert.equal((await sendPurchase('stripe', stripe, now, {}, send)).skipped, 'disabled');
  assert.equal((await sendPurchase('stripe', stripe, now, { ...env, OPENAI_ADS_MODE: 'live' }, send)).skipped, 'test_payment');
  assert.equal(calls, 0);
  assert.equal((await sendPurchase('stripe', stripe, now, env, send)).validatedOnly, true);
  assert.equal(calls, 1);
  assert.equal((await sendPurchase('stripe', stripe, now, { ...env, OPENAI_ADS_CAPI_KEY: '' }, send)).retry, true);
});

test('network errors and rejection request retry without changing event identity', async () => {
  assert.equal((await sendPurchase('stripe', stripe, now, env, async () => { throw Error('timeout'); })).retry, true);
  assert.equal((await sendPurchase('stripe', stripe, now, env, async () => ({ ok: false, status: 429 }))).retry, true);
});

async function call(action, body, headers = {}, query = '') {
  const req = { method: 'POST', body, url: `/api/freela.js?action=${action}${query}`, headers: { host: 'talkglobalapp.com', ...headers } };
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)); };
  const res = { setHeader() {}, end(s) { this.body = JSON.parse(s); } };
  await handler(req, res); return res;
}

test('signed Stripe/MP webhooks: approved only; duplicates retain ID; failures retry; invalid signatures never send', async () => {
  const oldFetch = globalThis.fetch;
  const keys = [...Object.keys(env), 'STRIPE_FREELA_WEBHOOK_SECRET', 'MERCADOPAGO_WEBHOOK_SECRET', 'MERCADOPAGO_ACCESS_TOKEN'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, env, { STRIPE_FREELA_WEBHOOK_SECRET: 'stripe-test', MERCADOPAGO_WEBHOOK_SECRET: 'mp-test', MERCADOPAGO_ACCESS_TOKEN: 'mp-token' });
  const events = []; let reject = false; let currentPix = pix;
  globalThis.fetch = async (url, options) => {
    if (url.startsWith('https://api.mercadopago.com/')) return { ok: true, json: async () => currentPix };
    assert.ok(url.startsWith('https://bzr.openai.com/')); events.push(JSON.parse(options.body).events[0]);
    return { ok: !reject, status: reject ? 503 : 200 };
  };
  const stripeCall = async (payment, type = 'checkout.session.completed') => {
    const raw = JSON.stringify({ type, created: Math.floor(now / 1000), data: { object: payment } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', 'stripe-test').update(`${ts}.${raw}`).digest('hex');
    return call('webhook', raw, { 'stripe-signature': `t=${ts},v1=${sig}` });
  };
  const mpCall = async () => {
    const ts = String(Math.floor(Date.now() / 1000)); const requestId = 'request-test';
    const sig = crypto.createHmac('sha256', 'mp-test').update(`id:${pix.id};request-id:${requestId};ts:${ts};`).digest('hex');
    return call('mercadopago-webhook', { type: 'payment', data: { id: pix.id } }, { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${sig}` }, `&data.id=${pix.id}`);
  };
  try {
    assert.equal((await call('webhook', '{}')).statusCode, 400);
    assert.equal((await call('mercadopago-webhook', {})).statusCode, 401);
    await stripeCall({ ...stripe, payment_status: 'unpaid' }); currentPix = { ...pix, status: 'pending' }; await mpCall();
    assert.equal(events.length, 0);
    assert.equal((await stripeCall(stripe)).statusCode, 200);
    assert.equal((await stripeCall(stripe, 'checkout.session.async_payment_succeeded')).statusCode, 200);
    assert.equal(events[0].id, events[1].id);
    currentPix = pix; assert.equal((await mpCall()).statusCode, 200);
    assert.equal(events[2].data.amount, 1499);
    reject = true; assert.equal((await stripeCall(stripe)).statusCode, 503); assert.equal((await mpCall()).statusCode, 503);
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    assert.equal((await mpCall()).statusCode, 503); // MP lookup failure must request retry, never acknowledge a lost conversion.
  } finally { globalThis.fetch = oldFetch; for (const k of keys) if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; }
});

const browserSource = await readFile(new URL('../assets/freela/openai-attribution.js', import.meta.url), 'utf8');
function browser(storage = new Map(), search = '', navigator = {}) {
  const box = { checked: false, addEventListener(_, fn) { this.change = fn; } };
  const context = { window: {}, location: { search }, navigator, URLSearchParams, document: { querySelector: () => box }, sessionStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } };
  vm.runInNewContext(browserSource, context); return { box, get: context.window.talkglobalOpenAIAttribution };
}
test('browser: opt-in only, navigation preservation, revoke and GPC; URL reference unchanged', () => {
  const storage = new Map(); const first = browser(storage, '?oppref=gAAA%2Bopaque%3D');
  assert.equal(first.get().consent, undefined); assert.equal(storage.size, 0);
  first.box.checked = true; first.box.change(); assert.equal(first.get().oppref, 'gAAA+opaque=');
  const next = browser(storage); assert.equal(next.get().oppref, 'gAAA+opaque=');
  next.box.checked = false; next.box.change(); assert.equal(storage.size, 0); assert.equal(next.get().consent, undefined);
  const blocked = browser(storage, '?oppref=test', { globalPrivacyControl: true });
  blocked.box.checked = true; blocked.box.change(); assert.equal(blocked.get().consent, undefined);
});

test('checkout and Pix preserve attribution in provider metadata; buyer cannot change price', async () => {
  const oldFetch = globalThis.fetch;
  const keys = ['STRIPE_SECRET_KEY','STRIPE_FREELA_LAUNCH_PRICE_ID','FREELA_LAUNCH_ENDS_AT','MERCADOPAGO_ACCESS_TOKEN'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { STRIPE_SECRET_KEY:'test', STRIPE_FREELA_LAUNCH_PRICE_ID:'price_existing', MERCADOPAGO_ACCESS_TOKEN:'test' });
  delete process.env.FREELA_LAUNCH_ENDS_AT;
  const openai_ads = { consent:true, oppref:'gAAA_original=' };
  try {
    globalThis.fetch = async (url, opts) => {
      if (url.includes('stripe.com')) {
        const form = new URLSearchParams(opts.body);
        assert.equal(form.get('metadata[openai_ads_ref_0]'), openai_ads.oppref);
        assert.equal(form.get('payment_intent_data[metadata][openai_ads_ref_0]'), openai_ads.oppref);
        assert.equal(form.get('line_items[0][price]'), 'price_existing');
        return {ok:true,json:async()=>({url:'https://checkout.test',amount_total:1499,currency:'brl'})};
      }
      const sent = JSON.parse(opts.body);
      assert.equal(sent.metadata.openai_ads_ref_0, openai_ads.oppref);
      assert.equal(sent.transaction_amount,14.99);
      return {ok:true,json:async()=>({...pix,status:'pending',point_of_interaction:{transaction_data:{qr_code:'test',qr_code_base64:'test'}}})};
    };
    assert.equal((await call('checkout',{product:'freela-na-vida-real',openai_ads,amount:1})).statusCode,200);
    assert.equal((await call('pix',{product:'freela-na-vida-real',email:'test@example.com',openai_ads,amount:1})).statusCode,200);
  } finally { globalThis.fetch=oldFetch; for(const k of keys) if(previous[k]===undefined) delete process.env[k]; else process.env[k]=previous[k]; }
});
