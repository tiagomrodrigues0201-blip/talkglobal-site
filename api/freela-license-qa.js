import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {purchaseLicense,licensedProductUrl} from '../lib/freela-license.js';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','private, no-store');
 const token=String(req.headers['authorization']||'').replace(/^Bearer /,'');
 if(process.env.VERCEL_ENV!=='preview'||Date.now()>1791393674035||crypto.createHash('sha256').update(token).digest('hex')!=='4b15e261954c505da1bba04a5aaae118d63aa018b7ec1cb84683872a4e363aba') {res.statusCode=404;return res.end();}
 const storage=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY).storage.from('private-products');
 const license=purchaseLicense('stripe',{id:'cs_test_talkglobal_license_20261007',customer_details:{name:'Tiago Teste'}});
 try {
  const url=await licensedProductUrl(storage,'freela/Freela_na_Vida_Real_Kit.zip',license,300);
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({url,code:license.code}));
 }catch(e) { const probe=await storage.download('freela/Freela_na_Vida_Real_Kit.zip');res.statusCode=500;res.end(JSON.stringify({error:e.message,sourceError:probe.error?.message,sourceStatus:probe.error?.statusCode}));}
}
