import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import handler from '../api/freela.js';
import { adsMetadata, purchaseEvent, sendPurchase } from '../lib/freela-openai-ads.js';
import { identifyKit } from '../lib/freela-license.js';
import { checkoutPaymentMethods } from '../lib/freela-payment-policy.js';

const key = 'TEST_local_only_never_a_merchant_credential';
const ref = 'freela-na-vida-real:12345678-1234-4234-8234-123456789abc';
const signed = crypto.createHmac('sha256',key).update('freela-checkout-pro:'+ref).digest('hex');
const payment = overrides => ({id:12345,status:'approved',live_mode:true,currency_id:'BRL',transaction_amount:19.9,
  payment_method_id:'visa',payment_type_id:'credit_card',external_reference:ref,
  date_approved:new Date().toISOString(),metadata:{product:'freela-na-vida-real'},...overrides});
function res() { return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.raw=v;this.data=v?JSON.parse(v):undefined;}}; }
async function invoke(action,query='',body,headers={}) {
  const response=res();
  await handler({url:'/api/freela.js?action='+action+query,method:body?'POST':'GET',headers:{host:'localhost',...headers},body},response);
  return response;
}
const saved={...process.env}, realFetch=globalThis.fetch;
test.before(()=>{process.env.MERCADOPAGO_ACCESS_TOKEN=key;process.env.MERCADOPAGO_WEBHOOK_SECRET='local_webhook';process.env.OPENAI_ADS_MODE='off';process.env.VERCEL_ENV='production';});
test.after(()=>{globalThis.fetch=realFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);});

test('legacy Pix never grants sandbox, pending, refunded or charged-back access',async()=>{
  const token=crypto.createHmac('sha256',key).update('freela-pix:12345').digest('hex');
  for(const bad of [{live_mode:false},{status:'pending'},{status:'refunded'},{status:'charged_back'},{transaction_amount:0.01}]){
    globalThis.fetch=async()=>({ok:true,json:async()=>payment({payment_method_id:'pix',...bad})});
    const status=await invoke('pix-status','&payment_id=12345&payment_token='+token);
    assert.equal(status.data.approved,false);assert.equal(status.data.download_url,undefined);
    assert.equal((await invoke('download','&mp_payment_id=12345&payment_token='+token)).statusCode,403);
  }
});
test('legacy Stripe rejects test sessions for Portuguese and Spanish',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_isolated_fixture';
  for(const language of ['pt','es']){
    globalThis.fetch=async()=>({ok:true,json:async()=>({id:'cs_test_fixture',livemode:false,mode:'payment',payment_status:'paid',currency:'brl',amount_total:1499,
      metadata:language==='es'?{product:'freelance-en-la-vida-real',language:'es'}:{product:'freela-na-vida-real'}})});
    assert.equal((await invoke('status','&session_id=cs_test_fixture')).data.paid,false);
    assert.equal((await invoke('download','&session_id=cs_test_fixture')).statusCode,403);
  }
});
test('recovery without a payment ID requires the matching signed reference and rechecks provider status',async()=>{
  const calls=[];
  globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>String(url).includes('/search?')?{results:[payment()]}:payment()};};
  const recovered=await invoke('mercadopago-checkout-status','&reference='+encodeURIComponent(ref)+'&checkout_token='+signed);
  assert.equal(recovered.data.paid,true);assert.equal(calls.length,2);assert.match(calls[1],/\/v1\/payments\/12345$/);
  const count=calls.length;
  assert.equal((await invoke('mercadopago-checkout-status','&reference='+encodeURIComponent(ref)+'&checkout_token='+'0'.repeat(64))).statusCode,403);
  assert.equal(calls.length,count);
});
test('recovery of pending or absent payments never exposes a download',async()=>{
  for(const results of [[],[payment({status:'pending'})]]){
    globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('/search?')?{results}:payment({status:'pending'})});
    const r=await invoke('mercadopago-checkout-status','&reference='+encodeURIComponent(ref)+'&checkout_token='+signed);
    assert.equal(r.data.paid,false);assert.equal(r.data.download_url,undefined);
  }
});
test('search result cannot authorize a different reference',async()=>{
  globalThis.fetch=async()=>({ok:true,json:async()=>({results:[payment({external_reference:'other:123'})]})});
  const r=await invoke('mercadopago-checkout-status','&reference='+encodeURIComponent(ref)+'&checkout_token='+signed);
  assert.equal(r.data.paid,false);
});
function webhookHeaders(id='12345') {
  const ts=String(Date.now()), request='local_request';
  return {'x-request-id':request,'x-signature':`ts=${ts},v1=${crypto.createHmac('sha256','local_webhook').update(`id:${id};request-id:${request};ts:${ts};`).digest('hex')}`};
}
test('webhook rejects missing signatures and a body ID different from signed ID',async()=>{
  globalThis.fetch=async()=>{throw Error('Unauthorized event must not query provider');};
  assert.equal((await invoke('mercadopago-webhook','&data.id=12345',{type:'payment',data:{id:12345}})).statusCode,401);
  assert.equal((await invoke('mercadopago-webhook','&data.id=12345',{type:'payment',data:{id:54321}},webhookHeaders())).statusCode,400);
});
test('authentic Pix, card and mandatory account-balance notifications acknowledge fulfilled once verified',async()=>{
  for(const method of [{payment_method_id:'pix',payment_type_id:'bank_transfer'}, {},{payment_method_id:'account_money',payment_type_id:'account_money'}]){
    globalThis.fetch=async()=>({ok:true,json:async()=>payment(method)});
    const r=await invoke('mercadopago-webhook','&data.id=12345',{type:'payment',data:{id:12345}},webhookHeaders());
    assert.equal(r.statusCode,200);assert.equal(r.data.fulfilled,true);
  }
});
test('signed webhook cannot fulfill pending, sandbox, wrong product, currency or value',async()=>{
  for(const bad of [{status:'pending'},{live_mode:false},{transaction_amount:1},{currency_id:'USD'},{external_reference:'another-product:123',metadata:{product:'another'}}]){
    globalThis.fetch=async()=>({ok:true,json:async()=>payment(bad)});
    const r=await invoke('mercadopago-webhook','&data.id=12345',{type:'payment',data:{id:12345}},webhookHeaders());
    assert.equal(r.data.fulfilled,false);
  }
});
test('payment exclusions use real merchant IDs and never invent account_money exclusions',()=>{
  const config=checkoutPaymentMethods([{id:'pix',payment_type_id:'bank_transfer'},{id:'visa',payment_type_id:'credit_card'},
    {id:'bolbradesco',payment_type_id:'ticket'},{id:'other_bank_transfer',payment_type_id:'bank_transfer'},
    {id:'account_money',payment_type_id:'account_money'}]);
  assert.deepEqual(config,{excluded_payment_methods:[{id:'bolbradesco'},{id:'other_bank_transfer'}]});
  assert.throws(()=>checkoutPaymentMethods([]));
});
test('all legacy live charge creation is blocked on a preview',async()=>{
  process.env.VERCEL_ENV='preview';process.env.STRIPE_SECRET_KEY='sk_live_fake';process.env.STRIPE_FREELA_LAUNCH_PRICE_ID='price_fixture';
  globalThis.fetch=async()=>{throw Error('Preview must not create live provider objects');};
  for(const action of ['checkout','mercadopago-checkout','pix']) assert.equal((await invoke(action,'',{product:'freela-na-vida-real',email:'test@example.invalid'})).statusCode,503);
  process.env.VERCEL_ENV='production';
});
test('conversions preserve opaque oppref, cents, consent and stable deduplication ID',async()=>{
  const opaque='X'.repeat(1201)+'_-test';
  const p=payment({metadata:{product:'freela-na-vida-real',...adsMetadata({consent:true,oppref:opaque})}});
  const event=purchaseEvent('mercadopago',p);
  assert.equal(event.oppref,opaque);assert.equal(event.data.amount,1990);assert.equal(event.data.currency,'BRL');assert.equal(event.opt_out,true);
  assert.equal(purchaseEvent('mercadopago',p).id,event.id);
  assert.equal(purchaseEvent('mercadopago',{...p,status:'pending'}),null);
  assert.equal(purchaseEvent('mercadopago',payment()),null);
  let sent;
  const result=await sendPurchase('mercadopago',p,undefined,{OPENAI_ADS_MODE:'live',VERCEL_ENV:'preview',OPENAI_ADS_PIXEL_ID:'fixture',OPENAI_ADS_CAPI_KEY:'fake'},async(url,options)=>{sent=JSON.parse(options.body);return {ok:true};});
  assert.equal(sent.validate_only,true);assert.equal(result.sent,true);
  assert.equal((await sendPurchase('mercadopago',{...p,live_mode:false},undefined,{OPENAI_ADS_MODE:'live'})).skipped,'test_payment');
});

async function kitFixture() {
  const doc=await PDFDocument.create();doc.addPage([300,400]);
  return zipSync({'Freela_na_Vida_Real/Ebook.pdf':await doc.save(),'Freela_na_Vida_Real/Prompts.pdf':await doc.save(),
    'Freela_na_Vida_Real/Controle.xlsx':strToU8('isolated spreadsheet fixture')});
}
test('personalization marks every PDF, preserves kit files and excludes buyer financial details',async()=>{
  const files=unzipSync(await identifyKit(await kitFixture(),{code:'TG-TEST',firstName:'Tiago',language:'pt'}));
  assert.ok(files['Freela_na_Vida_Real/Controle.xlsx']);
  assert.match(strFromU8(files['Freela_na_Vida_Real/LICENCA_DE_USO.txt']),/TG-TEST/);
  for(const [name,bytes] of Object.entries(files)) if(name.endsWith('.pdf')){
    const pdf=await PDFDocument.load(bytes);assert.match(pdf.getSubject(),/TG-TEST/);assert.equal(pdf.getPageCount(),1);
  }
  await assert.rejects(identifyKit(zipSync({'empty.txt':strToU8('no PDF')}),{code:'TG-TEST'}));
});
test('server-to-private-storage delivery returns only a short-lived personalized ZIP; upload failure fails closed',async()=>{
  const original=await kitFixture();
  process.env.SUPABASE_URL='https://storage-test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='local_fixture_key';
  for(const fail of [false,true]){
    const stored=new Map();
    globalThis.fetch=async(input,options={})=>{
      const url=String(input);
      if(url.startsWith('https://api.mercadopago.com/')) return new Response(JSON.stringify(payment()),{status:200,headers:{'Content-Type':'application/json'}});
      const pathname=new URL(url).pathname;
      if(pathname.includes('/object/sign/')){
        const path=decodeURIComponent(pathname.split('/object/sign/private-products/')[1]);
        if(!stored.has(path))return new Response(JSON.stringify({message:'not found'}),{status:404,headers:{'Content-Type':'application/json'}});
        assert.equal(JSON.parse(options.body).expiresIn,300);
        return Response.json({signedURL:'/object/sign/private-products/'+path+'?token=fixture_expiring_token'});
      }
      const path=decodeURIComponent(pathname.split('/object/private-products/')[1]||'');
      if((options.method||'GET')==='GET') {assert.equal(path,'freela/Freela_na_Vida_Real_Kit.zip');return new Response(original);}
      if(fail)return Response.json({message:'storage failure'},{status:500});
      stored.set(path,new Uint8Array(await new Response(options.body).arrayBuffer()));
      return Response.json({Key:'private-products/'+path});
    };
    const r=await invoke('download','&mp_payment_id=12345&mp_checkout_token='+signed);
    if(fail){assert.equal(r.statusCode,503);assert.equal(r.headers.Location,undefined);continue;}
    assert.equal(r.statusCode,302);assert.match(r.headers.Location,/licensed\/v1\//);assert.match(r.headers['Cache-Control'],/no-store/);
    const kit=[...stored.entries()].find(([path])=>path.endsWith('/Freela_na_Vida_Real_Kit.zip'));
    assert.ok(kit);assert.ok(unzipSync(kit[1])['Freela_na_Vida_Real/LICENCA_DE_USO.txt']);
  }
});

test('preview diagnostics are absent in production and never read providers there',async()=>{
  process.env.VERCEL_ENV='production';
  globalThis.fetch=async()=>{throw Error('No production diagnostics');};
  assert.equal((await invoke('readiness')).statusCode,404);
});
