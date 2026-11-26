import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import handler from "../api/freela.js";

const KEY = "TEST_fake_key_does_not_contact_mercadopago";
function request(action, method="GET", data, extra="") {
  return { method, url: `/api/freela.js?action=${action}${extra}`,
    headers: {host:"localhost:3000"}, body: data };
}
function response() {
  return { statusCode:200, headers:{}, setHeader(k,v){this.headers[k]=v;},
    end(body=""){this.body=body;this.data=body?JSON.parse(body):undefined;} };
}
async function invoke(action,method="GET",body,extra="") {
  const res=response();
  await handler(request(action,method,body,extra),res);
  return res;
}
function checkoutToken(ref) {
  return crypto.createHmac("sha256",KEY).update(`freela-checkout-pro:${ref}`).digest("hex");
}
function payment(overrides={}) {
  return {id:12345,status:"approved",live_mode:true,currency_id:"BRL",
    payment_method_id:"visa",payment_type_id:"credit_card",transaction_amount:19.9,
    external_reference:"freela-na-vida-real:fixed-test-nonce",
    ...overrides};
}
const originalFetch=globalThis.fetch;
const before=Object.fromEntries(["MERCADOPAGO_ACCESS_TOKEN","VERCEL_ENV","MERCADOPAGO_ALLOW_PREVIEW_CHECKOUT","SITE_URL","OPENAI_ADS_MODE","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"].map(k=>[k,process.env[k]]));
test.before(()=>{process.env.MERCADOPAGO_ACCESS_TOKEN=KEY;process.env.OPENAI_ADS_MODE="off";delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
test.after(()=>{globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});

test("preview does not create live checkout accidentally",async()=>{
  process.env.VERCEL_ENV="preview"; delete process.env.MERCADOPAGO_ALLOW_PREVIEW_CHECKOUT;
  globalThis.fetch=async()=>{throw Error("Unexpected provider request")};
  const r=await invoke("mercadopago-checkout","POST",{product:"freela-na-vida-real"});
  assert.equal(r.statusCode,503);
});

test("checkout preference contains exactly R$ 19.90 and safe return URL",async()=>{
  process.env.VERCEL_ENV="production";process.env.SITE_URL="https://talkglobalapp.com";
  let captured;
  globalThis.fetch=async (url,opts)=>{
    if (url.endsWith('/v1/payment_methods')) return {ok:true,json:async()=>[
      {id:'pix',payment_type_id:'bank_transfer'}, {id:'visa',payment_type_id:'credit_card'},
      {id:'bolbradesco',payment_type_id:'ticket'}, {id:'account_money',payment_type_id:'account_money'}
    ]};
    assert.equal(url,"https://api.mercadopago.com/checkout/preferences");
    captured=JSON.parse(opts.body);
    return {ok:true,json:async()=>({init_point:"https://www.mercadopago.com.br/checkout/v1/redirect"})};
  };
  const r=await invoke("mercadopago-checkout","POST",{product:"freela-na-vida-real"});
  assert.equal(r.statusCode,200);
  assert.equal(r.data.value,19.9);
  assert.equal(captured.items[0].unit_price,19.9);
  assert.equal(captured.items[0].currency_id,"BRL");
  assert.deepEqual(captured.payment_methods, {excluded_payment_methods:[{id:'bolbradesco'}]});
  assert.match(r.data.resume_url,/reference=freela-na-vida-real/);
  assert.equal(captured.back_urls.success.startsWith("https://talkglobalapp.com/freela-na-vida-real/mercadopago/"),true);
  assert.equal(new URL(captured.back_urls.success).searchParams.get("checkout_token"),checkoutToken(captured.external_reference));
});

test("never trusts payment status without Mercado Pago server verification",async()=>{
  process.env.VERCEL_ENV="production";
  const ref="freela-na-vida-real:fixed-test-nonce";
  const qs=`&payment_id=12345&checkout_token=${checkoutToken(ref)}`;
  for(const bad of [
    {status:"pending"},{status:"rejected"},{live_mode:false},
    {transaction_amount:14.99},{transaction_amount:0.01},{currency_id:"USD"},
    {external_reference:"another-product:123"},
    {payment_method_id:"cash",payment_type_id:"ticket"}
  ]){
    globalThis.fetch=async()=>({ok:true,json:async()=>payment(bad)});
    const r=await invoke("mercadopago-checkout-status","GET",undefined,qs);
    if(bad.external_reference){assert.equal(r.statusCode,403);continue;}
    assert.equal(r.statusCode,200);
    assert.equal(r.data.paid,false,JSON.stringify(bad));
    assert.equal(r.data.download_url,undefined);
  }
});

test("approved live Pix and credit-card payments enable only their own download URLs",async()=>{
  for (const good of [
    {payment_method_id:"pix",payment_type_id:"bank_transfer"},
    {payment_method_id:"visa",payment_type_id:"credit_card"}
  ]) {
    const p=payment(good),token=checkoutToken(p.external_reference);
    globalThis.fetch=async()=>({ok:true,json:async()=>p});
    const r=await invoke("mercadopago-checkout-status","GET",undefined,`&payment_id=12345&checkout_token=${token}`);
    assert.equal(r.statusCode,200);
    assert.equal(r.data.paid,true);
    assert.ok(r.data.download_url.includes("mp_checkout_token="));
  }
});

test("wrong token never grants download, including approved payment",async()=>{
  globalThis.fetch=async()=>({ok:true,json:async()=>payment()});
  const invalid="a".repeat(64);
  const status=await invoke("mercadopago-checkout-status","GET",undefined,`&payment_id=12345&checkout_token=${invalid}`);
  assert.equal(status.statusCode,403);
  const download=await invoke("download","GET",undefined,`&mp_payment_id=12345&mp_checkout_token=${invalid}`);
  assert.equal(download.statusCode,403);
});

test("Pix creation uses new price, QR creation alone never grants access",async()=>{
  process.env.VERCEL_ENV="production";
  let amount;
  globalThis.fetch=async (url, opts)=>{
    if(url.endsWith("/v1/payments") && opts.method==="POST"){
      amount=JSON.parse(opts.body).transaction_amount;
      return {ok:true,json:async()=>({id:67890,status:"pending",point_of_interaction:{transaction_data:{qr_code:"123",qr_code_base64:"dGVzdA=="}}})};
    }
    throw Error("Unexpected provider URL");
  };
  const r=await invoke("pix","POST",{product:"freela-na-vida-real",email:"buyer@example.com"});
  assert.equal(r.statusCode,200);
  assert.equal(amount,19.9);
  assert.equal(r.data.amount,"R$19,90");
  assert.equal(r.data.status,"pending");
});


test('Spanish Mercado Pago preference charges 19.90, preserves consent, and returns in Spanish',async()=>{
 process.env.FREELA_ES_ENABLED='true';process.env.FREELA_ES_PRODUCT_OBJECT='freela/es/Kit_ES.zip';process.env.VERCEL_ENV='production';
 let preference;
 globalThis.fetch=async(url,opts)=>{preference=JSON.parse(opts.body);return {ok:true,json:async()=>({init_point:'https://www.mercadopago.com.br/checkout/v1/redirect'})};};
 const r=await invoke('mercadopago-checkout','POST',{product:'freelance-en-la-vida-real',openai_ads:{consent:true,oppref:'opaque-es'}});
 assert.equal(r.statusCode,200);assert.equal(r.data.value,19.9);
 assert.equal(preference.items[0].unit_price,19.9);assert.equal(preference.items[0].currency_id,'BRL');
 assert.equal(preference.metadata.product,'freelance-en-la-vida-real');assert.equal(preference.metadata.language,'es');
 assert.equal(preference.metadata.openai_ads_ref_0,'opaque-es');assert.match(preference.back_urls.success,/\/es\/freelance-en-la-vida-real\/mercadopago\//);
 const p=payment({external_reference:preference.external_reference,metadata:preference.metadata});
 globalThis.fetch=async()=>({ok:true,json:async()=>p});
 const token=checkoutToken(p.external_reference);
 const paid=await invoke('mercadopago-checkout-status','GET',undefined,`&payment_id=12345&checkout_token=${token}`);
 assert.equal(paid.data.paid,true);assert.equal(paid.data.language,'es');assert.equal(paid.data.product_slug,'freelance-en-la-vida-real');
 for(const bad of [{transaction_amount:14.99},{status:'pending'},{metadata:{product:'freela-na-vida-real',language:'pt'}}]){
  globalThis.fetch=async()=>({ok:true,json:async()=>({...p,...bad})});
  const r=await invoke('mercadopago-checkout-status','GET',undefined,`&payment_id=12345&checkout_token=${token}`);
  assert.equal(r.data.paid,false);
 }
 delete process.env.FREELA_ES_ENABLED;delete process.env.FREELA_ES_PRODUCT_OBJECT;
});
