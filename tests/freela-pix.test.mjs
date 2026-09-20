import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

// Exercise the real handler, replacing only its external storage dependency.
const source = await readFile(new URL('../api/freela.js', import.meta.url), 'utf8');
let signedUrls = 0;
globalThis.__freelaTestStorage = () => ({ storage: { from: () => ({
  createSignedUrl: async () => {
    signedUrls++;
    return { data: { signedUrl: 'https://storage.example.test/private-kit?signature=test' } };
  }
}) } });
const isolatedSource = source.replace('import { createClient } from "@supabase/supabase-js";',
  'const createClient = globalThis.__freelaTestStorage;');
const { default: handler } = await import('data:text/javascript;base64,' + Buffer.from(isolatedSource).toString('base64'));

async function call(action, { method = 'GET', body, query = '' } = {}) {
  const req = { method, body, url: '/api/freela.js?action=' + action + query, headers: { host: 'talkglobalapp.com' } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(v) { this.raw = v; } };
  await handler(req, res);
  return { status: res.statusCode, headers: res.headers, body: res.raw ? JSON.parse(res.raw) : null };
}

test('Pix creation, confirmation and delivery; existing card checkout', async (t) => {
  const keys = ['MERCADOPAGO_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_FREELA_LAUNCH_PRICE_ID', 'FREELA_LAUNCH_ENDS_AT'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const previousFetch = globalThis.fetch;
  Object.assign(process.env, {
    MERCADOPAGO_ACCESS_TOKEN: 'unit-test-token', SUPABASE_URL: 'https://storage.example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'unit-test-storage', SITE_URL: 'https://talkglobalapp.com',
    STRIPE_SECRET_KEY: 'unit-test-stripe', STRIPE_FREELA_LAUNCH_PRICE_ID: 'price_test'
  });
  delete process.env.FREELA_LAUNCH_ENDS_AT;
  const paymentId = '123456789';
  const token = crypto.createHmac('sha256', 'unit-test-token').update('freela-pix:' + paymentId).digest('hex');
  const query = '&payment_id=' + paymentId + '&payment_token=' + token;
  const downloadQuery = '&mp_payment_id=' + paymentId + '&payment_token=' + token;
  const paid = { id: paymentId, status: 'approved', payment_method_id: 'pix', currency_id: 'BRL', transaction_amount: 14.99, metadata: { product: 'freela-na-vida-real' } };
  const mockPayment = payment => { globalThis.fetch = async () => ({ ok: true, json: async () => payment }); };
  try {
    await t.test('invalid email cannot create a charge', async () => {
      globalThis.fetch = async () => { throw new Error('Unexpected provider call'); };
      const r = await call('pix', { method: 'POST', body: { product: 'freela-na-vida-real', email: 'invalid' } });
      assert.equal(r.status, 400);
    });
    await t.test('amount is server-controlled and QR plus private access token are returned', async () => {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.mercadopago.com/v1/payments');
        const sent = JSON.parse(options.body);
        assert.equal(sent.transaction_amount, 14.99);
        assert.equal(sent.payment_method_id, 'pix');
        assert.ok(options.headers['X-Idempotency-Key']);
        return { ok: true, json: async () => ({ ...paid, status: 'pending', point_of_interaction: { transaction_data: { qr_code: 'test-pix', qr_code_base64: 'test-base64' } } }) };
      };
      const r = await call('pix', { method: 'POST', body: { product: 'freela-na-vida-real', email: 'buyer@example.com', amount: 0.01 } });
      assert.equal(r.status, 200);
      assert.equal(r.body.qr_code, 'test-pix');
      assert.equal(r.body.payment_token, token);
    });
    await t.test('missing or altered access tokens are rejected before provider lookup', async () => {
      globalThis.fetch = async () => { throw new Error('Unexpected provider call'); };
      assert.equal((await call('pix-status', { query: '&payment_id=' + paymentId })).status, 403);
      assert.equal((await call('download', { query: '&mp_payment_id=' + paymentId + '&payment_token=' + '0'.repeat(64) })).status, 403);
    });
    for (const [name, changes] of Object.entries({ pending: { status: 'pending' }, refunded: { status: 'refunded' }, wrongAmount: { transaction_amount: 0.01 }, wrongProduct: { metadata: { product: 'other' } }, wrongCurrency: { currency_id: 'USD' } })) {
      await t.test(name + ' never unlocks the product', async () => {
        mockPayment({ ...paid, ...changes });
        const before = signedUrls;
        assert.equal((await call('pix-status', { query })).body.approved, false);
        assert.equal((await call('download', { query: downloadQuery })).status, 403);
        assert.equal(signedUrls, before);
      });
    }
    await t.test('confirmed Pix unlocks a protected download', async () => {
      mockPayment(paid);
      const r = await call('pix-status', { query });
      assert.equal(r.body.approved, true);
      assert.ok(r.body.download_url.includes('payment_token=' + token));
      const d = await call('download', { query: downloadQuery });
      assert.equal(d.status, 302);
      assert.equal(d.headers['Cache-Control'], 'private, no-store, max-age=0');
      assert.equal(signedUrls, 1);
    });
    await t.test('Stripe checkout keeps its price and analytics response', async () => {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
        assert.equal(new URLSearchParams(options.body).get('line_items[0][price]'), 'price_test');
        return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/test', amount_total: 1499, currency: 'brl' }) };
      };
      const r = await call('checkout', { method: 'POST', body: { product: 'freela-na-vida-real' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.value, 14.99);
      assert.equal(r.body.currency, 'BRL');
    });
    await t.test('existing Stripe status remains available', async () => {
      mockPayment({ metadata: { product: 'freela-na-vida-real' }, payment_status: 'paid', mode: 'payment', currency: 'brl', amount_total: 1499, id: 'cs_test' });
      const r = await call('status', { query: '&session_id=cs_test' });
      assert.equal(r.body.paid, true);
    });
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    delete globalThis.__freelaTestStorage;
  }
});
