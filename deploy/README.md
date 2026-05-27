# Prymeira Account Deploy

Este stack publica somente o Hub em:

```txt
https://hub.prymeiradigital.com.br
```

A Account API fica interna no Swarm e o Hub encaminha chamadas para ela por:

```txt
https://hub.prymeiradigital.com.br/api
```

## Variaveis no Portainer

Configure no stack:

```txt
PRYMEIRA_POSTGRES_PASSWORD=troque_essa_senha
CLERK_SECRET_KEY=sk_test_ou_sk_live
CLERK_PUBLISHABLE_KEY=pk_test_ou_pk_live
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ou_pk_live
ADMIN_EMAILS=yohannreimer20@gmail.com
ADMIN_ACTION_TOKEN=uma_senha_extra_forte_para_acoes_admin
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_START_MONTHLY=price_...
STRIPE_PRICE_START_ANNUAL=price_...
STRIPE_PRICE_EMPRESA_MONTHLY=price_...
STRIPE_PRICE_EMPRESA_ANNUAL=price_...
STRIPE_PRICE_EMPRESA_PRO_MONTHLY=price_...
STRIPE_PRICE_EMPRESA_PRO_ANNUAL=price_...
STRIPE_PRICE_SUITE_MONTHLY=price_...
STRIPE_PRICE_SUITE_ANNUAL=price_...
STRIPE_PRICE_OPERIS_MONTHLY=price_...
STRIPE_PRICE_OPERIS_ANNUAL=price_...
STRIPE_PRICE_MEDIA_MONTHLY=price_...
STRIPE_PRICE_MEDIA_ANNUAL=price_...
```

Antes de subir o stack, crie o volume externo uma vez no manager:

```bash
docker volume create prymeira_account_postgres_data
```

## GitHub Container Registry

As imagens esperadas pelo compose sao:

```txt
ghcr.io/yohannreimer/prymeira-account-api:latest
ghcr.io/yohannreimer/prymeira-hub-web:latest
```

O Hub recebe a publishable key em runtime pelo Portainer. Use o mesmo valor `pk_...` em `CLERK_PUBLISHABLE_KEY` e `VITE_CLERK_PUBLISHABLE_KEY`. Nao precisa colocar `VITE_CLERK_PUBLISHABLE_KEY` no GitHub Actions para buildar a imagem.

Se `STRIPE_SECRET_KEY` nao estiver configurada no stack, a API responde `Checkout is not configured.` ao clicar em assinar.

Configure o webhook do Stripe em `https://hub.prymeiradigital.com.br/api/webhook/stripe`
com estes eventos:

```txt
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```
