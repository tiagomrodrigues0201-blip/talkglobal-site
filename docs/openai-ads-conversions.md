# Freela — OpenAI Ads conversion measurement

Prepared 2026-11-02. No new service or recurring subscription. The integration is OFF by default.

## Official contract
- https://developers.openai.com/ads/conversions-api
- https://developers.openai.com/ads/supported-events
- https://help.openai.com/en/articles/20001409-conversion-measurement
- https://help.openai.com/en/articles/20001214-measure-results

Server POST `https://bzr.openai.com/v1/events?pid=PIXEL_ID`, Bearer CAPI key, `order_created`, `data.type=contents`, amount in minor units (1499 = BRL 14.99). Repeated provider notifications reuse the same SHA-256 event ID. OpenAI deduplicates by pixel, event type and ID. No browser purchase event, automatic form matching, contact details or IP address.

## Implemented
- PT and ES checkout scripts send optional attribution/consent to the existing endpoints.
- Optional unchecked checkbox, separate from buying. GPC/DNT disable measurement consent. Buying is unaffected by rejection or blocked browser storage.
- `oppref` is read without changing its content; retained in sessionStorage only after consent, maximum 24h (our privacy limit), then attached to Stripe session/payment-intent or MP payment metadata. Opaque references up to 4000 characters are chunked into <=500-character Stripe metadata values. Overlong/invalid references are omitted, never truncated.
- A saved consent/reference survives same-tab navigation, PT/ES switching and checkout redirects. No cross-device attribution or persistence across a closed browser session is promised. Before consent, the reference exists only on the current landing URL/in memory, not in persistent storage. Other campaign query parameters are not stripped from the landing URL, but only oppref is used for OpenAI matching.
- Only signed `checkout.session.completed`/`checkout.session.async_payment_succeeded` events with paid eligible BRL purchases, or a signed MP notification followed by an API-verified approved eligible Pix, send a conversion.
- Provider timestamps, server-controlled amounts/products, mode=live requires explicitly live payment. Pending, rejected, refunded-at-notification, unsigned, wrong amount/product/currency or missing consent do not send.
- No tracking on status/download endpoints; reloads and repeated downloads cannot create new events.
- Failed CAPI calls time out after 4 seconds and return 503 from the webhook so the provider retries. Stable IDs make acceptance followed by a network timeout safe to retry. Download remains independently authorized by the payment provider and unchanged.
- No separate durable queue: delivery recovery depends on configured provider retries/manual webhook resend within OpenAI's 7-day timestamp window. Monitor `openai_ads_delivery` logs (reason only). Previously accepted purchases later refunded are not automatically subtracted from Ads reporting; this measures approved purchases, not net revenue after refunds.
- Consent is recorded at checkout creation for that payment. Unchecking prevents new checkout sharing, not an already-started payment's metadata or already-delivered events. Privacy page explains this and provides revocation contact.

## Activate (not completed)
Account lookup confirmed Bah Viajou has no conversion sources/settings. Vercel has no OPENAI_ADS_* variables. Do not reuse the existing OPENAI_API_KEY: Ads requires its own CAPI key.
1. In Ads Manager > Conversions, create a web data source and obtain Pixel ID and its Conversions API key. Do not paste the key into chat, commits or frontend code.
2. In Vercel server-only environment settings for this project, add OPENAI_ADS_PIXEL_ID and sensitive OPENAI_ADS_CAPI_KEY. Begin in isolated preview/test with OPENAI_ADS_MODE=validate. The integration defaults to off when unset.
3. Use only Stripe/MP TEST credentials and webhook signing secrets in that preview. Existing preview MP credentials may be production credentials: never assume they are test. No payment creation is required for `node scripts/validate-openai-ads.mjs`, which always forces validate_only=true and does not save conversions.
4. Run the validation script with securely injected environment variables. Then verify provider-signed test notification -> CAPI validation, including pending Pix -> approved, duplicate and failed delivery retry. Local automated tests already cover these with mocks, but are not a real CAPI acceptance test.
5. Configure standard event order_created as the campaign conversion BEFORE eligible ad traffic. Use the exact standard event type, not just a display name such as Compra aprovada. A validation-only event does not appear as a saved sale.
6. After validation succeeds, set production OPENAI_ADS_MODE=live and redeploy. Keep preview validate/off. Confirm both existing webhook endpoints are enabled for the respective provider and relevant events, and monitor their delivery dashboards.
7. Confirm the first genuine consented purchase in event diagnostics and campaign reporting. Allow reporting processing time. Do not fabricate a sale or use a test event to claim ROAS. Inactive/missing campaign settings or earlier traffic may not be backfilled.

## Tests
`node --test tests/freela-*.test.mjs`
`npm run check:freela`
`node --check assets/freela/openai-attribution.js`
`node scripts/validate-openai-ads.mjs` (requires Ads credentials, safe validate_only)

Rollback: set OPENAI_ADS_MODE=off and redeploy. Payments/downloads retain original behavior. Existing purchases made before consent/attribution metadata cannot be attributed by this integration. No financial charge, campaign launch or ad spend is part of this work.
