import test from 'node:test';
import assert from 'node:assert/strict';
import { probePrivateDelivery } from '../lib/freela-delivery-probe.js';

for(const fail of [false,true])test(`private delivery probe cleans only its own synthetic files (failure=${fail})`,async()=>{
  const files=new Map(),removed=[];
  const storage={
    async upload(path,bytes){assert.match(path,/^freela\/(review-fixtures|licensed\/v1)\//);files.set(path,bytes);return {data:{}}},
    async download(path){return {data:new Blob([files.get(path)])}},
    async createSignedUrl(path,ttl){assert.equal(ttl,60);return files.has(path)?{data:{signedUrl:'https://storage.invalid/'+path}}:{error:{}}},
    async remove(paths){for(const path of paths){removed.push(path);files.delete(path);}return {data:{}}}
  };
  const result=await probePrivateDelivery(storage,async url=>{
    if(fail)throw Error('Isolated download failure');
    return new Response(files.get(new URL(url).pathname.slice(1)));
  });
  assert.equal(result.syntheticFixture,true);assert.equal(result.uploaded,true);
  assert.equal(result.downloaded,!fail);assert.equal(result.personalized,!fail);
  assert.equal(result.cleaned,true);assert.equal(files.size,0);assert.equal(removed.length,3);
  assert.ok(removed.every(path=>!path.includes('Freela_na_Vida_Real_Kit.zip')||path.includes('/TG-QA-')));
});
