(()=>{
 const root=document.querySelector('[data-article-comments]');if(!root)return;
 const app=root.querySelector('[data-comments-app]');
 const article=new URL(document.querySelector('link[rel="canonical"]').href).pathname;
 app.innerHTML=`<form data-comment-form><label for="comment-name">Seu nome ou apelido</label><input id="comment-name" name="name" autocomplete="nickname" required minlength="2" maxlength="60"><label for="comment-content">Seu comentário</label><textarea id="comment-content" name="content" required minlength="3" maxlength="2000" rows="5" aria-describedby="comment-limit"></textarea><small id="comment-limit">Até 2.000 caracteres. Seu nome e comentário ficarão públicos após aprovação.</small><div class="comment-trap" aria-hidden="true"><label>Deixe vazio<input name="website" tabindex="-1" autocomplete="off"></label></div><button type="submit">Enviar comentário</button><p data-send-status role="status" aria-live="polite"></p></form><h3>Comentários</h3><div data-comment-list aria-live="polite"></div><button type="button" data-more hidden>Ver mais comentários</button>`;
 const form=app.querySelector('form'),status=app.querySelector('[data-send-status]'),list=app.querySelector('[data-comment-list]'),more=app.querySelector('[data-more]');let offset=0;
 async function request(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível completar agora. Tente novamente.');return data;}
 async function load(){more.disabled=true;try{
 const data=await request(`/api/article-comments?article=${encodeURIComponent(article)}&offset=${offset}`);
 if(!offset)list.replaceChildren();
 if(!data.comments.length&&!offset)list.textContent='Ainda não há comentários publicados. Você pode começar a conversa.';
 for(const c of data.comments){const item=document.createElement('div');item.className='reader-comment';const name=document.createElement('strong');name.textContent=c.name;const time=document.createElement('time');time.dateTime=c.created_at;time.textContent=new Date(c.created_at).toLocaleDateString('pt-BR');const p=document.createElement('p');p.textContent=c.content;item.append(name,time,p);list.append(item);}
 offset+=data.comments.length;more.hidden=!data.hasMore;
 }catch{if(!offset){list.replaceChildren(document.createTextNode('Não conseguimos carregar os comentários agora. '));const retry=document.createElement('button');retry.type='button';retry.textContent='Tentar novamente';retry.onclick=load;list.append(retry);}}finally{more.disabled=false;}}
 more.onclick=load;load();
 form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Enviando…';try{await request('/api/article-comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article,name:form.elements.name.value,content:form.elements.content.value,website:form.elements.website.value})});form.reset();status.textContent='Comentário recebido! Ele aparecerá aqui depois da aprovação. Obrigado por participar.';}catch(err){status.textContent=err.name==='TimeoutError'?'A confirmação demorou. Aguarde um pouco antes de tentar novamente.':err.message;}finally{button.disabled=false;}});
})();
