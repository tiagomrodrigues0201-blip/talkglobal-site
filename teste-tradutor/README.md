# Translated with TalkGlobal AI

Pagina: `/teste-tradutor/`

Fluxo real implementado:
- a interface cria um job no backend;
- o video sai do navegador direto para o Supabase Storage, sem passar pela Vercel;
- o job registra status reais no Supabase: `created`, `uploaded`, `transcribing`, `translating`, `generating_srt`, `rendering`, `completed` e `failed`;
- o backend extrai audio com FFmpeg;
- a OpenAI transcreve o audio;
- a OpenAI traduz preservando intencao, emocao, contexto e naturalidade;
- o backend gera um arquivo `.srt` com timestamps para download;
- o backend gera um `.ass` temporário para queimar legendas e watermark sem usar `drawtext`;
- o FFmpeg renderiza o MP4 com legendas;
- no plano free, o MP4 recebe watermark;
- o SRT e o MP4 final sao salvos no Supabase Storage;
- a pagina consulta o status real do job e mostra downloads quando finalizado.

Arquivos principais:
- `index.html`: interface da ferramenta;
- `app.js`: criacao do job, upload direto para Supabase, polling de status e exibicao do resultado;
- `styles.css`: visual da pagina;
- `supabase-schema.sql`: tabela e bucket recomendados;
- `/api/translate-video.js`: backend real de processamento.

Observacao operacional:
O upload ja suporta 50 MB na fase 1, mas o processamento em Vercel Serverless deve comecar com videos curtos. Para videos maiores, o mesmo modelo de job pode ser migrado para uma fila/worker dedicado sem mudar a experiencia principal da pagina.


## Upload grande

A fase 1 nao envia video para Vercel. O frontend cria o job, recebe uma URL assinada e envia o arquivo direto ao Supabase Storage. O limite inicial e 50 MB para videos curtos.

Para a fase 2, mova o processamento pesado para um worker separado em Railway, Render, Fly.io ou Google Cloud Run e use TUS/resumable upload para arquivos maiores. A Vercel deve ficar apenas com site e APIs JSON leves.
