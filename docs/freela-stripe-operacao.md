# Operação Stripe do Freela na Vida Real

## Regra principal

A Vercel deve ser a fonte principal das variáveis de produção. O ambiente local deve ser sincronizado com `vercel env pull` quando necessário.

Não copiar secrets para o frontend, commits, logs ou respostas. Não commitar `.env`, `.env.local`, o ebook ou os bônus.

## Ambientes

- `development`: Stripe test mode, usado para validar a integração local.
- `preview`: Stripe test mode, usado para validar a branch antes de produção.
- `production`: Stripe live mode, bloqueado até aprovação explícita.

## Integração Vercel + Stripe

Preferir a integração oficial da Stripe no Vercel Marketplace quando o CLI estiver autenticado:

```bash
vercel integration add stripe
vercel env pull .env.local
```

Essa integração pode provisionar credenciais e injetar variáveis no projeto. Variáveis específicas do produto, como `STRIPE_FREELA_LAUNCH_PRICE_ID`, continuam sendo gerenciadas pelo script do projeto.

## Automação do produto

O script `scripts/freela-stripe-setup.mjs` cria ou localiza:

- produto `Freela na Vida Real`;
- preço de lançamento `R$14,99`;
- webhook quando uma URL for informada.

Ele não cria preço regular sem valor confirmado.

Exemplo para desenvolvimento, depois de autenticar com Stripe test mode:

```bash
npm run freela:stripe:dev -- --webhook-url https://sua-url.ngrok-free.app/api/freela-webhook --launch-ends-at 2026-08-31T23:59:59-03:00 --sync-vercel
```

Exemplo para preview, depois de existir uma URL de preview:

```bash
npm run freela:stripe:preview -- --webhook-url https://sua-preview.vercel.app/api/freela-webhook --launch-ends-at 2026-08-31T23:59:59-03:00 --sync-vercel
```

Produção exige aprovação explícita e chave live:

```bash
npm run freela:stripe:production:prepare -- --production-approved --webhook-url https://talkglobalapp.com/api/freela-webhook --launch-ends-at 2026-08-31T23:59:59-03:00 --regular-price-cents VALOR_CONFIRMADO --sync-vercel
```

## Variáveis

- `SITE_URL=https://talkglobalapp.com`
- `STRIPE_SECRET_KEY`
- `STRIPE_FREELA_LAUNCH_PRICE_ID`
- `STRIPE_FREELA_REGULAR_PRICE_ID`
- `STRIPE_FREELA_WEBHOOK_SECRET`
- `FREELA_LAUNCH_ENDS_AT`
- `FREELA_PRODUCT_BUCKET=private-products`
- `FREELA_PRODUCT_OBJECT=freela/Freela_na_Vida_Real_Kit.zip`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Segurança da entrega

O download do kit passa por `/api/freela-download`, que consulta a Checkout Session na Stripe e só cria uma URL temporária do Supabase Storage se o pagamento, produto, moeda e valor forem válidos.
