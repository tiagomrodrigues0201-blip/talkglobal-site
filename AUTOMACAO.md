# Automação de artigos do TalkGlobal

Use este fluxo para criar novos artigos sem montar HTML manualmente.

## 1. Escreva o artigo em Markdown

Crie um arquivo dentro de `drafts/`, por exemplo:

```text
drafts/meu-artigo.md
```

Formato aceito:

```md
Texto de abertura do artigo.

> Caixa de destaque/callout.

## Título de seção

Parágrafo da seção.

- Item de lista
- Outro item
```

## 2. Rode o gerador

Dentro da pasta do site:

```bash
node scripts/create-article.mjs \
  --title "Título da matéria" \
  --category "Tecnologia" \
  --description "Subtítulo curto e direto da matéria." \
  --slug "titulo-da-materia" \
  --theme "tech" \
  --read "5 min" \
  --source drafts/meu-artigo.md
```

Temas aceitos:

```text
remote
digital
property
tech
money
```

## 3. O que o script atualiza

O comando cria e atualiza automaticamente:

```text
blog/novo-artigo.html
index.html
blog/index.html
posts.js
sitemap.xml
robots.txt
```

## 4. Teste local

```bash
python3 -m http.server 4173
```

Abra:

```text
http://127.0.0.1:4173/
```

## Reconstruir listagens sem criar artigo

Se você editar `posts.js` manualmente ou quiser reconstruir home, blog e sitemap:

```bash
node scripts/create-article.mjs --rebuild
```
