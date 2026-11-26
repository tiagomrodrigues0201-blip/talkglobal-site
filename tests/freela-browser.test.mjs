// Browser script contracts in an isolated DOM stub. Visual QA is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=name=>fs.readFileSync(new URL('../assets/freela/'+name,import.meta.url),'utf8');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const button=()=>({disabled:false,hidden:true,dataset:{},listeners:{},addEventListener(k,f){this.listeners[k]=f},removeAttribute(){},append(){}});
test('all checkout buttons share one in-flight lock and transmit exact consent/attribution',async()=>{
  const buttons=[button(),button()],status={},requests=[],redirects=[];
  const context={crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'},URL,JSON,setTimeout:f=>f(),
    document:{querySelectorAll:()=>buttons,getElementById:()=>status},location:{assign:v=>redirects.push(v)},
    window:{talkglobalOpenAIAttribution:()=>({consent:true,oppref:'opaque-reference'}),freelaOrderAccess:{save(){}}},
    fetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:true,json:async()=>({url:'https://www.mercadopago.com.br/checkout/v1/redirect',value:19.9,currency:'BRL'})}}};
  vm.runInNewContext(source('checkout-aprovacao.js'),context);
  await Promise.all(buttons.map(b=>b.listeners.click()));
  assert.equal(requests.length,1);assert.equal(redirects.length,1);assert.equal(requests[0].openai_ads.oppref,'opaque-reference');
  assert.ok(buttons.every(b=>b.disabled));
});
test('failed checkout resets all buttons; unsafe redirects and wrong prices never navigate',async()=>{
  for(const data of [{url:'https://evil.invalid',value:19.9,currency:'BRL'},{url:'https://mercadopago.com.br/',value:1,currency:'BRL'}]){
    const buttons=[button(),button()],status={};let redirects=0;
    vm.runInNewContext(source('checkout-aprovacao.js'),{crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'},URL,JSON,
      document:{querySelectorAll:()=>buttons,getElementById:()=>status},location:{assign(){redirects++}},window:{},fetch:async()=>({ok:true,json:async()=>data})});
    await buttons[0].listeners.click();assert.equal(redirects,0);assert.ok(buttons.every(b=>!b.disabled));assert.match(status.textContent,/Não foi possível/);
  }
});
test('closing and reopening retains only a validated same-origin access URL, expiring in 30 days',()=>{
  const localStorage=storage(),window={};
  vm.runInNewContext(source('order-access.js'),{localStorage,window,location:{origin:'https://talkglobalapp.com'},URL,Date,JSON,document:{getElementById:()=>null}});
  const url='/freela-na-vida-real/mercadopago/?payment_id=12345&checkout_token='+'a'.repeat(64);
  assert.equal(window.freelaOrderAccess.save(url),true);assert.equal(window.freelaOrderAccess.load(),url);
  assert.equal(window.freelaOrderAccess.save('https://evil.invalid'+url),false);
  assert.equal(window.freelaOrderAccess.save('/api/freela-download?payment_id=12345'),false);
  localStorage.setItem('freela_order_access_v1',JSON.stringify({url,at:Date.now()-31*86400000}));
  assert.equal(window.freelaOrderAccess.load(),null);
});
test('return script accepts numeric IDs, hides pending downloads, handles approval and deduplicates purchase events',async()=>{
  const localStorage=storage();let events=0;
  for(const status of ['pending','approved','approved']){
    const nodes=Object.fromEntries(['[data-title]','[data-status]','[data-download-link]','[data-retry]'].map(k=>[k,button()]));
    let calls=0,cleared=false;
    vm.runInNewContext(source('mercadopago-return.js'),{URLSearchParams,URL,AbortSignal,localStorage,clearTimeout(){},setTimeout(){},
      location:{origin:'https://talkglobalapp.com',pathname:'/freela-na-vida-real/mercadopago/',search:'?payment_id=12345&checkout_token='+'a'.repeat(64)},
      history:{replaceState(){cleared=true}},document:{querySelector:k=>nodes[k]},window:{freelaOrderAccess:{save(){}},gtag(){events++}},
      fetch:async()=>{calls++;return {ok:true,json:async()=>({paid:status==='approved',status,value:19.9,currency:'BRL',transaction_id:'mp_12345',download_url:'/api/freela-download?mp_payment_id=12345&mp_checkout_token='+'a'.repeat(64)})}}});
    await new Promise(setImmediate);assert.equal(calls,1);assert.equal(cleared,true);
    assert.equal(nodes['[data-download-link]'].dataset.ready,status==='approved'?'true':undefined);
  }
  assert.equal(events,1);
});
test('tracking remains off without consent and clears on withdrawal or privacy signals',()=>{
  for(const restricted of [false,true]){
    const checkbox={checked:false,disabled:false,addEventListener(k,f){this.change=f}},sessionStorage=storage(),window={};
    vm.runInNewContext(source('openai-attribution.js'),{window,sessionStorage,URLSearchParams,Date,Number,JSON,
      location:{search:'?oppref=opaque-reference'},navigator:{globalPrivacyControl:restricted},document:{querySelector:()=>checkbox}});
    assert.equal(JSON.stringify(window.talkglobalOpenAIAttribution()),'{}');
    checkbox.checked=true;checkbox.change();
    assert.equal(window.talkglobalOpenAIAttribution().consent,restricted?undefined:true);
    checkbox.checked=false;checkbox.change();assert.equal(JSON.stringify(window.talkglobalOpenAIAttribution()),'{}');
  }
});
