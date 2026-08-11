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
7. Somente depois de `checkout.session.completed` com `payment_status=paid`, o webhook aceita o evento.
8. A página `/freela-na-vida-real/obrigado/` chama `GET /api/freela-download?session_id=...`.
9. O endpoint consulta a Stripe, confirma produto, moeda, valor e `payment_status=paid`.
10. O servidor cria uma URL de cinco minutos para o kit armazenado em bucket privado do Supabase e redireciona o comprador.

## Entrega segura do produto

Não colocar ebook, ZIP ou bônus em `assets/`, `public/`, no GitHub ou em qualquer pasta servida estaticamente.

O arquivo `Freela_na_Vida_Real_Kit.zip` deve conter o PDF e todos os bônus. Ele fica no bucket privado configurado por `FREELA_PRODUCT_BUCKET`, no objeto indicado por `FREELA_PRODUCT_OBJECT`. O `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente nas variáveis de servidor da Vercel.

A entrega usa uma URL assinada com validade de cinco minutos, criada somente depois da confirmação direta da Checkout Session na Stripe.

## Variáveis necessárias

- `STRIPE_SECRET_KEY`
- `STRIPE_FREELA_LAUNCH_PRICE_ID`
- `STRIPE_FREELA_REGULAR_PRICE_ID`
- `STRIPE_FREELA_WEBHOOK_SECRET`
- `FREELA_LAUNCH_ENDS_AT`, em formato ISO, por exemplo `2026-08-31T23:59:59-03:00`
- `SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FREELA_PRODUCT_BUCKET`
- `FREELA_PRODUCT_OBJECT`

## Observações

O produto digital não faz parte do deploy nem do repositório. Em produção, a entrega depende da validação da sessão na Stripe e da existência do kit no bucket privado.
