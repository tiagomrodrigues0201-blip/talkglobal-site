# Translated with TalkGlobal AI - teste isolado

Página: `/teste-tradutor/`

O que já funciona no navegador:
- upload/drag-and-drop de MP4, MOV e WEBM;
- validação de tipo, tamanho e duração para plano free;
- preview local do vídeo;
- seleção de idioma final;
- seleção de estilo de legenda;
- simulação de processamento com etapas;
- geração e download de arquivo `.srt` real;
- download do MP4 original como demo, deixando claro que o render final entra no backend.

O que está preparado:
- `supabase-schema.sql` para histórico de traduções;
- `/api/translate-video.js` como rota mock para futuro job assíncrono;
- pontos de UI para freemium, watermark, HD, prioridade, estilos premium e histórico.

Arquitetura recomendada:
1. Frontend cria um job no Supabase.
2. Supabase Storage recebe o vídeo original.
3. Worker assíncrono baixa o arquivo com URL assinada.
4. OpenAI transcreve o áudio e gera segmentos com timestamps.
5. OpenAI traduz preservando intenção, emoção, contexto, expressões idiomáticas e adaptação cultural.
6. Backend gera `.srt`.
7. FFmpeg renderiza legenda embutida, watermark free e MP4 final.
8. Supabase Storage salva MP4 final e SRT.
9. Stripe controla recursos premium: remover watermark, HD, prioridade, vídeos longos e histórico.
