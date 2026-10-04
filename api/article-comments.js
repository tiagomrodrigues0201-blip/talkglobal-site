import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'node:crypto';
import paths from '../lib/article-paths.js';
const articles=new Set(paths);
const send=(res,status,payload)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload));};
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Método não permitido.'});}
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return send(res,503,{error:'Comentários temporariamente indisponíveis. Tente novamente mais tarde.'});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
 if(req.method==='GET'){
 const query=new URL(req.url,'https://talkglobalapp.com').searchParams,article=query.get('article');
 if(!articles.has(article))return send(res,400,{error:'Artigo inválido.'});
 const offset=Number(query.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>10000)return send(res,400,{error:'Página inválida.'});
 const {data,error}=await db.from('article_comments').select('id,name,content,created_at').eq('article_path',article).eq('status','approved').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+20);
 if(error)throw error;return send(res,200,{comments:data.slice(0,20),hasMore:data.length>20});
 }
 const origin=req.headers.origin;if(origin&&!['https://talkglobalapp.com','https://www.talkglobalapp.com'].includes(origin))return send(res,403,{error:'Origem não permitida.'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'Formato inválido.'});
 let body=req.body;
 if(!body){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return send(res,413,{error:'Comentário muito longo.'});}body=JSON.parse(raw);}
 if(typeof body==='string'){if(Buffer.byteLength(body)>12000)return send(res,413,{error:'Comentário muito longo.'});body=JSON.parse(body);}
 if(!body||typeof body!=='object')return send(res,400,{error:'Dados inválidos.'});
 if(body.website)return send(res,202,{pending:true});
 const name=typeof body.name==='string'?body.name.trim():'',content=typeof body.content==='string'?body.content.trim():'';
 if(!articles.has(body.article)||name.length<2||name.length>60||content.length<3||content.length>2000)return send(res,400,{error:'Confira o nome (2–60 caracteres) e o comentário (3–2.000 caracteres).'});
 const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const fingerprint=createHmac('sha256',key).update(`${new Date().toISOString().slice(0,10)}:${ip}`).digest('hex');
 const {data,error}=await db.rpc('submit_article_comment',{p_article:body.article,p_name:name,p_content:content,p_fingerprint:fingerprint});
 if(error)throw error;if(data==='limited')return send(res,429,{error:'Aguarde um pouco antes de comentar novamente. O limite é de 5 envios por dia.'});
 return send(res,202,{pending:true});
 }catch(error){console.error('article-comments failure',error.code||'request_failed');return send(res,503,{error:'Não foi possível completar agora. Seu texto foi mantido; tente novamente mais tarde.'});}
}
