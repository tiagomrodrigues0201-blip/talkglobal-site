import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/ads-validation.js';

test('diagnostic is disabled in production and cannot submit live sales', async () => {
 const keys=['VERCEL_ENV','OPENAI_ADS_MODE','OPENAI_ADS_PIXEL_ID','OPENAI_ADS_CAPI_KEY'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]])); const oldFetch=globalThis.fetch;
 const requests=[];
 globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,status:200};};
 const call=async(method='POST',origin='https://preview.test')=>{const res={setHeader(){},end(body){this.body=body;}}; await handler({method,headers:{host:'preview.test',origin},body:{validate_only:false}},res);return res;};
 try{
  Object.assign(process.env,{VERCEL_ENV:'production',OPENAI_ADS_MODE:'validate',OPENAI_ADS_PIXEL_ID:'test',OPENAI_ADS_CAPI_KEY:'test'});
  assert.equal((await call()).statusCode,404);assert.equal(requests.length,0);
  process.env.VERCEL_ENV='preview';process.env.OPENAI_ADS_MODE='live';assert.equal((await call()).statusCode,404);
  process.env.OPENAI_ADS_MODE='validate'; assert.equal((await call('POST','https://other.test')).statusCode,403);
  assert.equal((await call('POST','invalid')).statusCode,403);
  await call('GET'); assert.equal(requests.length,0);
  const result=await call(); assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).validate_only,true);
  assert.equal(requests.length,2);assert.ok(requests.every(r=>r.validate_only===true&&r.events[0].opt_out===true));
 }finally{globalThis.fetch=oldFetch;for(const k of keys)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});
