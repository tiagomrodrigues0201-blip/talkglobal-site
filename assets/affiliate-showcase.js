import { amazonAssociatesConfig as config } from "./amazon-associates.config.js";
import { buildAffiliateUrl } from "./amazon-recommendations.js";

const groups = [
  { id: "trabalho", label: "Trabalho online", keys: ["notebookStand","wirelessMouse","workHeadset","webcam","externalSsd"] },
  { id: "viagem", label: "Viagem", keys: ["universalAdapter","powerBank","travelBackpack"] },
  { id: "criacao", label: "Criação e tecnologia", keys: ["techAccessories","gamingAccessories"] },
  { id: "leitura", label: "Livros e histórias", keys: ["reading","darkFantasy","asianWorks","realEstateBooks"] },
];
const descriptions = {
 notebookStand:"Compare altura, estabilidade e ergonomia antes de escolher um suporte.",
 wirelessMouse:"Observe conforto, conexão e autonomia para longas jornadas.",
 workHeadset:"Confira compatibilidade, microfone e conforto para reuniões.",
 webcam:"Veja resolução e compatibilidade com o seu computador.",
 externalSsd:"Compare capacidade, tipo de conexão e velocidade anunciada.",
 universalAdapter:"Verifique padrões de tomada e compatibilidade elétrica do destino.",
 powerBank:"Confira capacidade em Wh e regras da companhia aérea.",
 travelBackpack:"Olhe dimensões de cabine e organização interna.",
 techAccessories:"Confira potência, portas e certificações de segurança.",
 gamingAccessories:"Compare compatibilidade com seu console ou computador.",
 reading:"Explore livros e compare edições e formatos disponíveis.",
 darkFantasy:"Procure edições de livros e mangás desse gênero.",
 asianWorks:"Descubra mangás e outras obras asiáticas disponíveis.",
 realEstateBooks:"Pesquise títulos sobre vendas, imóveis e atendimento."
};
const filters = document.getElementById("filters"), catalog = document.getElementById("catalog");
const entries = groups.flatMap(group => group.keys.map(key => ({...config.recommendations[key], key, category:group.id, label:group.label})));
let selected = "todos";
let entriesFromCSV = [];
function safeUrl(url) {
  try {const u=new URL(url);return u.protocol==="https:"&&["amazon.com.br","www.amazon.com.br"].includes(u.hostname)&&u.searchParams.get("tag")===config.associateId ? u.href : null;} catch {return null;}
}
async function loadProducts(){
 try {
  const response=await fetch("/data/amazon-products.json",{cache:"no-store"});
  if(!response.ok)return;
  const body=await response.json();
  if(!Array.isArray(body.products))return;
  entriesFromCSV=body.products.filter(p=>p.active===true&&p.title&&p.forWhom&&p.why&&p.limitations)
    .map(p=>({...p,label:groups.find(g=>g.id===p.category)?.label||"Outros",category:p.category,link:safeUrl(p.url)}));
  render();
 } catch(e){ console.warn("Catálogo: carregamento indisponível",e); }
}

function render(){
 filters.replaceChildren();
 for(const filter of [{id:"todos",label:"Tudo"},...groups]){
  const b=document.createElement("button");b.type="button";b.textContent=filter.label;b.setAttribute("aria-pressed",String(selected===filter.id));
  b.addEventListener("click",()=>{selected=filter.id;render();});filters.append(b);
 }
 catalog.replaceChildren();
 for(const item of [...entriesFromCSV,...entries].filter(item=>selected==="todos"||item.category===selected)){
  const card=document.createElement("article");card.className="card";
  const cat=document.createElement("span");cat.textContent=item.label;
  const title=document.createElement("h3");title.textContent=item.title;
  const desc=document.createElement("p");desc.textContent=item.forWhom ? "Para quem serve: "+item.forWhom+". Por que considerar: "+item.why+". Atenção: "+item.limitations+"." : (descriptions[item.key]||item.text);
  const action=document.createElement("a");action.href=item.link||buildAffiliateUrl(item.query||item.title);action.textContent=item.link?"Ver produto na Amazon":item.cta||"Pesquisar na Amazon";action.target="_blank";action.rel="sponsored noopener noreferrer";action.setAttribute("aria-label",(item.cta||"Pesquisar na Amazon")+" — publicidade, abre Amazon em nova aba");
  const note=document.createElement("small");note.textContent="Publicidade · "+(item.demonstration?"EXEMPLO ILUSTRATIVO — não é indicação de compra":item.experience==="usamos"?"Uso próprio confirmado":item.forWhom?"Pesquisa editorial, sem teste prático":"Pesquisa na Amazon");
  action.addEventListener("click",()=>{if(typeof window.gtag==="function")window.gtag("event","amazon_affiliate_click",{source:"vitrine",category:item.category,recommendation_type:item.type});});
  card.append(cat,title,desc,action,note);catalog.append(card);
 }
}
render();

loadProducts();
