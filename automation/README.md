# Automação diária de artigos

Esta automação cria 2 propostas de artigos por dia, pesquisa fontes recentes e envia um email de aprovação via Resend.

Antes de escrever qualquer artigo, o gerador exige:

- pelo menos 3 fontes reais dos últimos 3 dias;
- pelo menos 3 fatos concretos extraídos das fontes;
- sinal editorial suficiente para justificar uma matéria.

Se uma pauta não tiver novidade real, ela é descartada e o sistema tenta outro tema permitido.

Nada é publicado automaticamente. O site só é alterado quando `automation/approval.json` estiver com:

```json
{
  "status": "approved"
}
```

## Configuração

Crie um arquivo `.env` com:

```env
RESEND_API_KEY=sua_chave_resend
APPROVAL_EMAIL=seu_email@dominio.com
SITE_URL=https://www.talkglobalapp.com
```

## Comandos

Gerar 2 propostas e enviar email:

```bash
npm run generate
```

Aprovar manualmente depois de revisar o email:

```bash
npm run approve
```

Publicar os artigos aprovados:

```bash
npm run publish
```

## Agendamento diário

No seu computador ou servidor, rode:

```bash
crontab -e
```

Exemplo para gerar propostas todos os dias às 08:00:

```cron
0 8 * * * cd "/CAMINHO/DA/PASTA/DO/SITE" && npm run generate >> automation/automation.log 2>&1
```

## Segurança editorial

- O gerador pesquisa fontes antes de escrever.
- O gerador não escreve artigo com menos de 3 fontes recentes.
- O gerador descarta pautas sem fatos concretos suficientes.
- O artigo inclui uma seção de fontes no final.
- O email inclui copy para Instagram e prompt de imagem no padrão TalkGlobal.
- A publicação é bloqueada enquanto o status estiver `pending`.
- O comando `publish` cria HTML, atualiza `posts.js`, atualiza `sitemap.xml`, faz `git add .`, `git commit` e `git push origin main`.
- Revise sempre o email antes de rodar `npm run approve`.

## Teste sem email

Para testar geração sem enviar email:

```bash
node automation/generateArticles.js --skipEmail
```
