import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// Every published article is featured automatically, newest first. No opt-in flag.
const source = readFileSync('assets/home-editorial.js', 'utf8');
const match = source.match(/const homeContent = (\{[\s\S]*?\n\s*\});/);
const existing = Function(`return (${match[1]})`)();
const items = new Map(existing.items.map(item => [item.link, item]));
const decode = s => s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function scan(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!file.endsWith('.html')) continue;
    const html = readFileSync(file,'utf8');
    if (/name="robots"[^>]*noindex/.test(html)) continue;
    const meta = key => decode(html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1] || '');
    const canonical = html.match(/rel="canonical" href="https:\/\/talkglobalapp.com([^"]*)"/)?.[1];
    if (!canonical || canonical === '/artigos/' || canonical === '/blog/' || canonical === '/noticias/') continue;
    let schema = {};
    for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { const value=JSON.parse(block[1]); if (/Article/.test(value['@type'])) schema=value; } catch {} }
    const published = meta('article:published_time') || schema.datePublished;
    const title = meta('og:title') || schema.headline;
    if (!published || !title || !Number.isFinite(Date.parse(published))) continue;
    const previous=items.get(canonical);
    // Preserve precise timestamps for existing editorial entries.
    items.set(canonical,{...previous,id:previous?.id || canonical.replace(/\W+/g,'-'),published:previous?.published || published,eligible:true,category:previous?.category || (canonical.startsWith('/noticias/')?'Notícia':'Artigo · Tiago'),title,text:meta('description'),image:meta('og:image'),imageAlt:previous?.imageAlt || html.match(/class="article-cover"[\s\S]*?<img[^>]*alt="([^"]*)"/)?.[1] || title,link:canonical,button:'Ler o artigo'});
  }
}
['artigos','noticias','blog'].forEach(scan);
const sorted=[...items.values()].sort((a,b)=>new Date(b.published)-new Date(a.published) || a.link.localeCompare(b.link));
const config={pinnedId:null,items:sorted};
writeFileSync('assets/home-editorial.js', source.replace(match[0],`const homeContent = ${JSON.stringify(config,null,2)};`));
const featured=sorted.slice(0,2);
function card(item) {return `<article class="feature-story" data-home-feature><a class="feature-story__media" href="${esc(item.link)}"><img src="${esc(item.image)}" alt="${esc(item.imageAlt)}" loading="eager" decoding="async"></a><div class="feature-story__copy"><span class="feature-story__category">${esc(item.category)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a class="button primary" href="${esc(item.link)}">${esc(item.button)}</a></div></article>`;}
let home=readFileSync('index.html','utf8');
if (home.includes('<!-- AUTO-FEATURED:START -->')) home=home.replace(/<!-- AUTO-FEATURED:START -->[\s\S]*?<!-- AUTO-FEATURED:END -->/,`<!-- AUTO-FEATURED:START -->\n${featured.map(card).join('\n')}\n<!-- AUTO-FEATURED:END -->`);
else home=home.replace(/<article class="feature-story" data-home-feature>[\s\S]*?<\/article>/,`<!-- AUTO-FEATURED:START -->\n${featured.map(card).join('\n')}\n<!-- AUTO-FEATURED:END -->`);
home=home.replace('A história mais recente.','Novos artigos em destaque.').replace(/home-editorial.js\?v=[^"']+/,`home-editorial.js?v=${Buffer.from(JSON.stringify(config)).toString('base64url').slice(-24)}`);
writeFileSync('index.html',home);
console.log('Destaques automáticos:',featured.map(x=>x.title).join(' | '));
