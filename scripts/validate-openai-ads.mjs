// No purchase, no conversion saved: the official validate_only endpoint only.
import { sendPurchase, adsMetadata } from '../lib/freela-openai-ads.js';
if (!process.env.OPENAI_ADS_PIXEL_ID || !process.env.OPENAI_ADS_CAPI_KEY) {
  console.error('Configure OPENAI_ADS_PIXEL_ID and OPENAI_ADS_CAPI_KEY securely; no request sent.');
  process.exit(1);
}
const result = await sendPurchase('stripe', {
  id: 'cs_test_talkglobal_capi_validation', livemode: false, payment_status: 'paid', mode: 'payment', currency: 'brl', amount_total: 1499,
  metadata: { product: 'freela-na-vida-real', ...adsMetadata({ consent: true }) }
}, Date.now(), { ...process.env, OPENAI_ADS_MODE: 'validate' });
console.log(JSON.stringify(result));
if (!result.sent || !result.validatedOnly) process.exitCode = 1;
