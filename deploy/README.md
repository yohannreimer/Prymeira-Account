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
ADMIN_EMAILS=yohannreimer20@gmail.com
ADMIN_ACTION_TOKEN=uma_senha_extra_forte_para_acoes_admin
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

O Hub recebe a publishable key em runtime pelo Portainer. Nao precisa colocar `VITE_CLERK_PUBLISHABLE_KEY` no GitHub Actions para buildar a imagem.
