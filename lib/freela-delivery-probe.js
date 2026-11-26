import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { licensedProductUrl } from './freela-license.js';

// Exercises actual storage with a harmless synthetic kit, not the paid product.
// Remove only our three unique objects, even if signing/downloading fails.
export async function probePrivateDelivery(storage, send=fetch) {
  const id=crypto.randomUUID();
  const code='TG-QA-'+id.replaceAll('-','').slice(0,20).toUpperCase();
  const source=`freela/review-fixtures/${id}.zip`;
  const doc=await PDFDocument.create();
  doc.addPage([300,400]);
  const bytes=zipSync({'QA/guide.pdf':await doc.save(),'QA/notice.txt':strToU8('Synthetic validation fixture. Not the paid ebook.')});
  const version=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const base=`freela/licensed/v1/${version}/${code}`;
  const cleanup=[source,`${base}/purchase.zip`,`${base}/Freela_na_Vida_Real_Kit.zip`];
  const result={syntheticFixture:true,uploaded:false,downloaded:false,personalized:false,cleaned:false};
  try {
    const upload=await storage.upload(source,Buffer.from(bytes),{contentType:'application/zip',upsert:false});
    if(upload.error)throw Error('Storage unavailable');
    result.uploaded=true;
    const url=await licensedProductUrl(storage,source,{code,firstName:'',provider:'preview-validation',paymentId:id},60);
    const response=await send(url,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Signed delivery failed');
    const delivered=unzipSync(new Uint8Array(await response.arrayBuffer()));
    result.downloaded=true;
    const pdf=await PDFDocument.load(delivered['QA/guide.pdf']);
    result.personalized=pdf.getSubject()?.includes(code)===true&&pdf.getPageCount()===1;
  } catch { /* Return booleans only; never disclose keys, private URLs or content. */ }
  finally {
    try {const removed=await storage.remove(cleanup);result.cleaned=!removed.error;}catch{}
  }
  return result;
}
