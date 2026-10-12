import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as helpers from '../lib/freela-license.js';
globalThis.__esLicenseHelpers=helpers;
const signed=[];
globalThis.__esStorage=()=>({storage:{from:()=>({
 download:async(object)=>{signed.push(object);return {error:{}};},
})}});
const source=(await readFile(new URL('../api/freela.js',import.meta.url),'utf8'))
 .replace('import { createClient } from "@supabase/supabase-js";','const createClient=globalThis.__esStorage;')
 .replace('import { purchaseLicense, licensedProductUrl } from "../lib/freela-license.js";','const {purchaseLicense,licensedProductUrl}=globalThis.__esLicenseHelpers;');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function call(action,{method='GET',body,query=''}={}){
 const req={method,body,url:'/api/freela.js?action='+action+query,headers:{host:'talkglobalapp.com'}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v?JSON.parse(v):null;}};
 await handler(req,res);return res;
}
test('language isolation and Spanish review gate',async(t)=>{
 const previousFetch=globalThis.fetch;
 const keys=['FREELA_ES_ENABLED','FREELA_ES_PRODUCT_OBJECT','STRIPE_FREELA_ES_PRICE_ID','STRIPE_SECRET_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SITE_URL'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{STRIPE_SECRET_KEY:'test',SUPABASE_URL:'https://private.test',SUPABASE_SERVICE_ROLE_KEY:'test',SITE_URL:'https://talkglobalapp.com'});
 const es={id:'cs_test_es',metadata:{product:'freelance-en-la-vida-real',language:'es'},payment_status:'paid',mode:'payment',currency:'brl',amount_total:1499};
 try{
  await t.test('unreviewed ES cannot open checkout',async()=>{
   delete process.env.FREELA_ES_ENABLED;globalThis.fetch=async()=>{throw new Error('Must not call Stripe');};
   assert.equal((await call('checkout',{method:'POST',body:{product:'freelance-en-la-vida-real'}})).statusCode,503);
  });
  await t.test('Spanish session uses its own price, metadata and Spanish return page',async()=>{
   Object.assign(process.env,{FREELA_ES_ENABLED:'true',FREELA_ES_PRODUCT_OBJECT:'freela/es/Kit_ES.zip',STRIPE_FREELA_ES_PRICE_ID:'price_es'});
   globalThis.fetch=async(url,opts)=>{const p=new URLSearchParams(opts.body);assert.equal(p.get('line_items[0][price]'),'price_es');assert.equal(p.get('metadata[product]'),'freelance-en-la-vida-real');assert.equal(p.get('metadata[language]'),'es');assert.equal(p.get('locale'),'es');assert.ok(p.get('success_url').includes('/es/freelance-en-la-vida-real/gracias/'));return {ok:true,json:async()=>({url:'https://checkout.test',amount_total:1499,currency:'brl'})};};
   assert.equal((await call('checkout',{method:'POST',body:{product:'freelance-en-la-vida-real'}})).statusCode,200);
  });
  await t.test('paid Spanish status identifies Spanish edition',async()=>{
   globalThis.fetch=async()=>({ok:true,json:async()=>es});const r=await call('status',{query:'&session_id=cs_test_es'});assert.equal(r.body.language,'es');assert.equal(r.body.product_slug,'freelance-en-la-vida-real');
  });
  await t.test('Spanish payment only reads Spanish private object',async()=>{
   globalThis.fetch=async()=>({ok:true,json:async()=>es});signed.length=0;const r=await call('download',{query:'&session_id=cs_test_es'});assert.equal(r.statusCode,503);assert.deepEqual(signed,['freela/es/Kit_ES.zip']);
  });
  await t.test('missing Spanish kit never falls back to Portuguese',async()=>{
   delete process.env.FREELA_ES_PRODUCT_OBJECT;signed.length=0;const r=await call('download',{query:'&session_id=cs_test_es'});assert.equal(r.statusCode,503);assert.deepEqual(signed,[]);
  });
  await t.test('changing a query parameter cannot change a Portuguese purchase',async()=>{
   globalThis.fetch=async()=>({ok:true,json:async()=>({...es,metadata:{product:'freela-na-vida-real'}})});signed.length=0;await call('download',{query:'&session_id=cs_test_pt&language=es'});assert.deepEqual(signed,['freela/Freela_na_Vida_Real_Kit.zip']);
  });
  for(const changes of [{payment_status:'unpaid'},{amount_total:1},{currency:'usd'},{metadata:{product:'freelance-en-la-vida-real',language:'pt'}}]){
   await t.test('invalid Spanish payment is denied',async()=>{globalThis.fetch=async()=>({ok:true,json:async()=>({...es,...changes})});signed.length=0;assert.equal((await call('download',{query:'&session_id=cs_test_es'})).statusCode,403);assert.deepEqual(signed,[]);});
  }
 }finally{globalThis.fetch=previousFetch;for(const k of keys)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});
