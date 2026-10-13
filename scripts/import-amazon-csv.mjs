import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const input=process.argv[2] || "data/amazon-products.csv";
const output="data/amazon-products.json";
function parseCSV(text){
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
 else if(c===","&&!quoted){row.push(field);field="";}
 else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field="";}
 else field+=c;}
 if(quoted)throw Error("CSV com aspas não fechadas");
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 const cols=rows.shift().map(x=>x.trim());
 return rows.map((r,i)=>{if(r.length!==cols.length)throw Error("Quantidade de colunas incorreta na linha "+(i+2));return Object.fromEntries(cols.map((c,j)=>[c,r[j].trim()]));});
}
const allowed=new Set(["trabalho","viagem","criacao","leitura","outros"]);
const items=parseCSV(await readFile(input,"utf8"));const seen=new Set();
const products=items.filter(x=>x.active!=="false"&&x.active!=="0").map((item,i)=>{
 const id=item.id||"";if(!/^[a-z0-9-]{3,80}$/.test(id)||seen.has(id))throw Error("ID inválido/repetido na linha "+(i+2));seen.add(id);
 if(!allowed.has(item.category))throw Error("Categoria inválida: "+item.category);
 if(!item.title||!item.for_whom||!item.why||!item.limitations)throw Error("Texto obrigatório incompleto: "+id);
 if(item.experience&&!["usamos","pesquisado"].includes(item.experience))throw Error("Experiência inválida: "+id);
 if(item.url&&!/^https:\/\/(www\.)?amazon\.com\.br\//.test(item.url))throw Error("Link não é Amazon Brasil: "+id);
 if(item.url){const u=new URL(item.url);if(u.searchParams.get("tag")!=="talkglobal0a-20")throw Error("Link sem tag correta: "+id);}
 if(item.image_url)throw Error("Imagens não são importadas sem comprovação de licença/API: "+id);
 return {id,title:item.title,category:item.category,forWhom:item.for_whom,why:item.why,limitations:item.limitations,experience:item.experience||"pesquisado",url:item.url||"",active:true,demonstration:item.demonstration==="true"};
});
await mkdir(dirname(resolve(output)),{recursive:true});
await writeFile(output,JSON.stringify({schemaVersion:1,products},null,2)+"\n");
console.log("Catálogo validado e atualizado: "+products.length+" itens em "+output);
