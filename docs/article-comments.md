# Comentários dos artigos

Cada artigo recebe o formulário automaticamente ao executar `node scripts/sync-home-editorial.mjs`. O workflow editorial também mantém os novos artigos cobertos.

Os leitores enviam nome/apelido e comentário, sem cadastro ou e-mail. Somente `approved` aparece no site. Todo envio começa como `pending`.

## Aprovar ou remover

Abra o projeto **talkglobal** no Supabase: https://supabase.com/dashboard/project/czbesfihizljntvldgmh/editor

Na tabela `article_comments`, filtre `status` por `pending`. Confira `article_path`, `name` e `content`. Troque `status` para `approved` para publicar ou `rejected` para ocultar. Também é possível excluir um registro. Não aprove spam, dados pessoais ou ofensas. A página pública mostra a alteração no próximo carregamento.

## Proteções

A API usa a credencial de servidor existente. O navegador não acessa a tabela diretamente. Nenhum endereço de e-mail é coletado. O limite é de 5 envios por dia por origem e intervalo de um minuto. Para isso, um HMAC diário do IP é mantido separadamente por até dois dias, sem armazenar o IP original na tabela. A limpeza acontece a cada envio. Há um campo armadilha e toda saída é renderizada como texto, nunca HTML. A moderação continua necessária.

## Infraestrutura

SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários. Se o projeto Supabase estiver pausado, restaure-o antes de usar os comentários. Nunca coloque a chave de serviço no cliente. Não troque a conta de produção pela conta de testes.
