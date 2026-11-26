// Preview-only diagnostics; optional synthetic delivery probe cleans its own files.
// Never exposes credentials,
// buyer records, filenames, download links, or product contents. Never charges.
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { identifyKit } from './freela-license.js';
import { sendPurchase, adsMetadata } from './freela-openai-ads.js';
import { probePrivateDelivery } from './freela-delivery-probe.js';

export async function readiness(env=process.env, send=fetch, options={}) {
  const checks={};
  try {
    const response=await send('https://api.mercadopago.com/users/me',{
      headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`},signal:AbortSignal.timeout(8000)});
    const merchant=await response.json();
    checks.mercadoPago={authenticated:response.ok,brazil:merchant.site_id==='MLB',testAccount:Array.isArray(merchant.tags)&&merchant.tags.includes('test_user')};
  } catch { checks.mercadoPago={authenticated:false}; }
  try {
    const response=await send('https://api.mercadopago.com/v1/payment_methods',{
      headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`},signal:AbortSignal.timeout(8000)});
    const methods=await response.json();
    if(!response.ok||!Array.isArray(methods))throw Error('Unavailable');
    checks.methods={pix:methods.some(m=>m.id==='pix'),card:methods.some(m=>['credit_card','debit_card'].includes(m.payment_type_id))};
  } catch { checks.methods={pix:false,card:false}; }
  try {
    const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const bucketName=env.FREELA_PRODUCT_BUCKET||'private-products';
    const bucket=client.storage.from(bucketName);
    const details=await client.storage.getBucket(bucketName);
    const bucketPrivate=!details.error&&details.data?.public===false;
    const {data,error}=await bucket.download(env.FREELA_PRODUCT_OBJECT||'freela/Freela_na_Vida_Real_Kit.zip');
    if(error||!data||data.size>20*1024*1024)throw Error('Unavailable');
    const bytes=new Uint8Array(await data.arrayBuffer()),files=unzipSync(bytes);
    const counts={pdf:0,xlsx:0,docx:0},pages=[];
    for(const [name,contents] of Object.entries(files)) {
      if(/\.pdf$/i.test(name)){counts.pdf++;pages.push((await PDFDocument.load(contents)).getPageCount());}
      if(/\.xlsx$/i.test(name))counts.xlsx++;
      if(/\.docx$/i.test(name))counts.docx++;
    }
    const marked=unzipSync(await identifyKit(bytes,{code:'TG-PREVIEW-VALIDATION',firstName:'',language:'pt'}));
    let markedCount=0;
    for(const [name,contents] of Object.entries(marked))if(/\.pdf$/i.test(name)){
      const doc=await PDFDocument.load(contents);
      if(doc.getSubject()?.includes('TG-PREVIEW-VALIDATION'))markedCount++;
    }
    const object=env.FREELA_PRODUCT_OBJECT||'freela/Freela_na_Vida_Real_Kit.zip';
    const publicUrl=env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/'+encodeURIComponent(bucketName)+'/'+object.split('/').map(encodeURIComponent).join('/');
    const anonymous=await send(publicUrl,{signal:AbortSignal.timeout(8000)});
    checks.privateKit={readable:true,bucketPrivate,anonymousDownloadBlocked:!anonymous.ok,bytes:data.size,counts,ebook66Pages:pages.includes(66),personalizationVerified:markedCount===counts.pdf&&markedCount>0};
    if(options.deliveryProbe===true&&bucketPrivate&&!anonymous.ok)checks.delivery=await probePrivateDelivery(bucket,send);
  } catch { checks.privateKit={readable:false}; }
  const fixture={id:String(Date.now()),status:'approved',live_mode:false,payment_method_id:'pix',currency_id:'BRL',transaction_amount:19.9,
    date_approved:new Date().toISOString(),metadata:{product:'freela-na-vida-real',...adsMetadata({consent:true})}};
  // Hard-code validate mode even if the preview was misconfigured as live.
  checks.openAI=await sendPurchase('mercadopago',fixture,undefined,{...env,OPENAI_ADS_MODE:'validate',VERCEL_ENV:'preview'},send);
  return {preview_only:true,real_charges:false,product_contents_exposed:false,checks};
}
