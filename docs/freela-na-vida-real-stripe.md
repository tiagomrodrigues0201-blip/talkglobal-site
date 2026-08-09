# Freela na Vida Real: arquitetura de checkout

## Estado atual

A landing em `/freela-na-vida-real/` está pronta para revisão local, mas o checkout real continua desativado até as variáveis da Stripe serem configuradas.

Não criar produto, preço ou webhook com `STRIPE_SECRET_KEY` de produção durante testes locais. O fluxo deve ser validado primeiro com chave `sk_test_...`; depois disso, os mesmos nomes e preços podem ser replicados no modo live.

## Fluxo previsto

1. O comprador clica no CTA da landing.
2. O frontend chama `POST /api/freela-checkout` com `{ "product": "freela-na-vida-real" }`.
3. O backend usa `STRIPE_SECRET_KEY` e o preço ativo para criar uma Checkout Session.
   - Durante o lançamento: `STRIPE_FREELA_LAUNCH_PRICE_ID` para `R$14,99`.
   - Depois do lançamento: `STRIPE_FREELA_REGULAR_PRICE_ID` para `R$57,00`.
   - Enquanto a data não estiver definida, o lançamento fica ativo.
4. A Stripe redireciona o comprador.
5. A Stripe chama `POST /api/freela-webhook`.
6. O webhook valida `STRIPE_FREELA_WEBHOOK_SECRET` antes de aceitar o evento.
7. Somente depois de `checkout.session.completed` com `payment_status=paid`, a entrega deve ser registrada.
8. A página `/freela-na-vida-real/obrigado/` chama `GET /api/freela-download?session_id=...`.
9. O endpoint consulta a Stripe, confirma `payment_status=paid` e só então entrega o PDF.

## Entrega segura do produto

Não colocar ebook, ZIP ou bônus em `assets/`, `public/` ou qualquer pasta servida estaticamente.

O PDF final atual pode ficar localmente em `private-products/freela/Freela_na_Vida_Real.pdf` para testes. Essa pasta está ignorada pelo Git e não deve ser enviada para repositório público. A rota `/private-products/*` está bloqueada em `vercel.json`, e o arquivo só deve ser entregue pelo endpoint `/api/freela-download` depois da confirmação de pagamento.

Entrega recomendada:

- storage privado, por exemplo Supabase Storage privado, Vercel Blob privado ou Stripe file links com controle próprio;
- registro de pedido em banco;
- token assinado, curto, de uso único e com expiração;
- endpoint autenticado para download;
- e-mail transacional enviado apenas após pagamento confirmado.

## Variáveis necessárias

- `STRIPE_SECRET_KEY`
- `STRIPE_FREELA_LAUNCH_PRICE_ID`
- `STRIPE_FREELA_REGULAR_PRICE_ID`
- `STRIPE_FREELA_WEBHOOK_SECRET`
- `FREELA_LAUNCH_ENDS_AT`, em formato ISO, por exemplo `2026-08-31T23:59:59-03:00`
- `SITE_URL`
- futura variável de storage privado, se a entrega for pelo backend

## Observações

O produto digital foi colocado em uma pasta privada do pacote local para a função de download conseguir encontrá-lo. Em produção, a entrega continua dependendo da validação da sessão na Stripe.
