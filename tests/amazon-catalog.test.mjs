import { readFile } from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
const source = (await readFile("assets/affiliate-showcase.js","utf8")).replace(/^import .*;\n/gm,"");
const products = JSON.parse(await readFile("data/amazon-products.json","utf8")).products;
function element(tag) {
  return {tag,children:[],attrs:{},listeners:{},textContent:"",
    append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]},
    setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn}};
}
async function run(fail=false) {
  const ids=Object.fromEntries(["filters","catalog","catalog-status","product-search"].map(id=>[id,element("div")]));
  let calls=0;
  const context={config:{associateId:"talkglobal0a-20"},URL,Error,window:{},
    document:{getElementById:id=>ids[id],createElement:element},
    buildAffiliateUrl:title=>"https://www.amazon.com.br/s?k="+encodeURIComponent(title)+"&tag=talkglobal0a-20",
    fetch:async()=>{calls++;return {ok:!fail,json:async()=>({products})}}};
  vm.runInNewContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {ids,count:()=>calls};
}
const {ids,count}=await run();
assert.equal(count(),1);
assert.equal(ids.catalog.children.length,7,"CSV must be the only catalog source");
for (const [index,expected] of [[1,3],[2,2],[3,1],[4,1],[0,7]]) {
 const button=ids.filters.children[index];
 button.listeners.click();
 assert.equal(ids.catalog.children.length,expected);
 assert.equal(button.attrs["aria-pressed"],"true");
 assert.equal(count(),1,"filter must not reload the catalog");
}
ids["product-search"].value = "réuniões";
ids["product-search"].listeners.input();
assert.equal(ids.catalog.children.length,1,"search must normalize accents");
assert.equal(ids.catalog.children[0].children[2].textContent,"Sony WH-CH720N");
ids["product-search"].value = "produto-inexistente-987";
ids["product-search"].listeners.input();
assert.equal(ids.catalog.children.length,0);
ids["product-search"].value = "";
ids["product-search"].listeners.input();
assert.equal(ids.catalog.children.length,7);
assert.equal(count(),1);
for(const card of ids.catalog.children) {
 const link=card.children.find(child=>child.tag==="a");
 assert.equal(new URL(link.href).searchParams.get("tag"),"talkglobal0a-20");
 assert.match(link.rel,/sponsored/);
 assert.ok(link.attrs["aria-label"].includes(card.children[2].textContent));
}
const failed=await run(true);
assert.equal(failed.ids.catalog.children.length,0,"failed load must not show legacy recommendations");
assert.match(failed.ids["catalog-status"].textContent,/Não foi possível/);
console.log("Aprovado: sete cartões, cinco filtros, fetch único, links identificados e falha explícita.");
