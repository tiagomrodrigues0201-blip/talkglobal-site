import crypto from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { unzipSync, zipSync, strToU8 } from 'fflate';

export function purchaseLicense(provider, payment) {
  if (!['stripe', 'pix'].includes(provider) || !payment?.id) throw new Error('Invalid purchase');
  const code = 'TG-' + crypto.createHash('sha256').update(`${provider}:${payment.id}`).digest('hex').slice(0, 20).toUpperCase();
  const name = provider === 'stripe' ? payment.customer_details?.name : payment.payer?.first_name;
  // Never place an email, CPF or the bearer checkout ID in the delivered files.
  const firstName = String(name || '').trim().split(/\s+/)[0].normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z '-]/g, '').slice(0, 32).trim();
  return { code, firstName, provider, paymentId: String(payment.id) };
}

export async function identifyPdf(bytes, license) {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const label = `Uso pessoal${license.firstName ? ' - Licenciado para ' + license.firstName : ''} - Pedido ${license.code}`;
  for (const page of doc.getPages()) {
    const crop = page.getCropBox();
    const media = page.getMediaBox();
    const bottom = Math.min(media.y, crop.y - 18);
    page.setMediaBox(media.x, bottom, media.width, media.y + media.height - bottom);
    page.setCropBox(crop.x, crop.y - 18, crop.width, crop.height + 18);
    const size = Math.min(6.5, (crop.width - 20) / font.widthOfTextAtSize(label, 1));
    page.drawRectangle({ x: crop.x, y: crop.y - 18, width: crop.width, height: 18, color: rgb(1, 1, 1) });
    page.drawText(label, { x: crop.x + (crop.width - font.widthOfTextAtSize(label, size)) / 2,
      y: crop.y - 11, size, font, color: rgb(0.35, 0.35, 0.35) });
  }
  doc.setSubject(`Uso pessoal - Pedido ${license.code}`);
  return doc.save();
}

export async function identifyKit(bytes, license) {
  const files = unzipSync(bytes);
  let identified = 0;
  for (const path of Object.keys(files)) {
    if (/\.pdf$/i.test(path)) {
      files[path] = await identifyPdf(files[path], license);
      identified++;
    }
  }
  if (!identified) throw new Error('No PDF in the product kit');
  files['Freela_na_Vida_Real/LICENCA_DE_USO.txt'] = strToU8(
    `Freela na Vida Real\nUso pessoal - Pedido ${license.code}\n` +
    (license.firstName ? `Licenciado para ${license.firstName}.\n` : '') +
    'Material para uso pessoal. Nao e permitida a redistribuicao ou revenda.\n');
  return zipSync(files, { level: 6 });
}

export async function licensedProductUrl(storage, sourceObject, license, ttl) {
  const { data: original, error } = await storage.download(sourceObject);
  if (error || !original || original.size > 20 * 1024 * 1024) throw new Error('Private source unavailable');
  const bytes = new Uint8Array(await original.arrayBuffer());
  const version = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const base = `freela/licensed/v1/${version}/${license.code}`;
  const object = `${base}/Freela_na_Vida_Real_Kit.zip`;
  const cached = await storage.createSignedUrl(object, ttl, { download: 'Freela_na_Vida_Real_Kit.zip' });
  if (!cached.error && cached.data?.signedUrl) return cached.data.signedUrl;
  const kit = await identifyKit(bytes, license);
  // The mapping remains private, outside the buyer's ZIP, for tracing a license.
  const mapping = await storage.upload(`${base}/purchase.json`, Buffer.from(JSON.stringify(license)),
    { contentType: 'application/json', cacheControl: '0', upsert: true });
  if (mapping.error) throw new Error('Private license mapping failed');
  const uploaded = await storage.upload(object, Buffer.from(kit),
    { contentType: 'application/zip', cacheControl: '0', upsert: true });
  if (uploaded.error) throw new Error('Private licensed upload failed');
  const signed = await storage.createSignedUrl(object, ttl, { download: 'Freela_na_Vida_Real_Kit.zip' });
  if (signed.error || !signed.data?.signedUrl) throw new Error('Private licensed link failed');
  return signed.data.signedUrl;
}
