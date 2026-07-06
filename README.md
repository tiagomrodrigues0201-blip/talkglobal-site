# talkglobal-site
Site oficial do TalkGlobal

## Deploy seguro

Nunca publique o site rodando `npx vercel --prod` diretamente.

O deploy de producao deve sair de um checkout completo, limpo e versionado:

```bash
npm run deploy:prod
```

Esse comando bloqueia automaticamente:

- deploy feito de `/tmp`, `/private/tmp` ou pastas temporarias;
- deploy com `sparse-checkout` ativo;
- deploy com arquivos locais nao commitados;
- deploy quando arquivos criticos do site estao ausentes, como `/index.html`, `/manga/index.html`, `/artigos/index.html`, `sitemap.xml`, `robots.txt`, paginas legais e assets principais.

Depois do deploy, o script confere rotas publicas obrigatorias em `https://talkglobalapp.com`, incluindo home, manga, artigos, paginas legais, `ads.txt`, `robots.txt` e `sitemap.xml`.

Se qualquer etapa falhar, nada deve ser considerado publicado.
