import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { purchaseLicense, identifyKit, licensedProductUrl } from '../lib/freela-license.js';

const doc = await PDFDocument.create();
doc.addPage([420, 600]);
doc.addPage([420, 600]);
const pdf = await doc.save();
const original = zipSync({ 'ebook.pdf': pdf, 'bonus/prompts.pdf': pdf, 'hours.xlsx': strToU8('untouched-sheet') });
const license = purchaseLicense('stripe', { id: 'cs_test_buyer_one', customer_details: { name: 'Tiago Monteiro', email: 'secret@example.com' } });

test('license is stable per purchase, distinct per provider and excludes sensitive details', () => {
  assert.deepEqual(license, purchaseLicense('stripe', { id: 'cs_test_buyer_one', customer_details: { name: 'Tiago Monteiro' } }));
  assert.notEqual(license.code, purchaseLicense('pix', { id: 'cs_test_buyer_one' }).code);
  assert.equal(license.firstName, 'Tiago');
  assert.equal(purchaseLicense('pix', { id: '123', payer: { email: 'private@example.com' } }).firstName, '');
});

test('both PDFs gain a separate footer without altering non-PDF files', async () => {
  const files = unzipSync(await identifyKit(original, license));
  assert.deepEqual(files['hours.xlsx'], strToU8('untouched-sheet'));
  for (const path of ['ebook.pdf', 'bonus/prompts.pdf']) {
    const marked = await PDFDocument.load(files[path]);
    assert.equal(marked.getPageCount(), 2);
    assert.equal(marked.getPage(0).getHeight(), 618);
    assert.ok(marked.getSubject().includes(license.code));
  }
  const notice = new TextDecoder().decode(files['Freela_na_Vida_Real/LICENCA_DE_USO.txt']);
  assert.ok(notice.includes(license.code));
  assert.ok(!notice.includes('cs_test') && !notice.includes('@'));
});

test('fresh delivery uploads a marked ZIP and private mapping before signing; next request reuses it', async () => {
  const objects = new Map();
  let sourceDownloads = 0;
  const storage = {
    download: async () => { sourceDownloads++; return { data: new Blob([original]) }; },
    upload: async (path, data) => { objects.set(path, data); return {}; },
    createSignedUrl: async (path, ttl) => {
      assert.equal(ttl, 300);
      return objects.has(path) ? { data: { signedUrl: 'https://private.test/' + path } } : { error: { status: 404 } };
    }
  };
  const url = await licensedProductUrl(storage, 'original.zip', license, 300);
  assert.ok(url.includes('/licensed/v1/') && url.includes(license.code));
  assert.equal(objects.size, 2);
  const zip = [...objects].find(([path]) => path.endsWith('.zip'))[1];
  assert.notDeepEqual(zip, Buffer.from(original));
  assert.equal(await licensedProductUrl(storage, 'original.zip', license, 300), url);
  assert.equal(objects.size, 2);
  assert.equal(sourceDownloads, 2);
});

test('missing source, invalid kit and upload errors fail closed instead of signing the original', async () => {
  await assert.rejects(identifyKit(zipSync({ 'empty.txt': strToU8('no pdf') }), license));
  await assert.rejects(licensedProductUrl({ download: async () => ({ error: {} }) }, 'original.zip', license, 300));
  await assert.rejects(licensedProductUrl({
    download: async () => ({ data: new Blob([original]) }),
    createSignedUrl: async () => ({ error: {} }),
    upload: async () => ({ error: {} })
  }, 'original.zip', license, 300));
});
