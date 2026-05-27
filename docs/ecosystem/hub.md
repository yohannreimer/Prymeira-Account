# Hub — Prymeira Account

> Central de autenticação, controle de acesso e billing de todos os produtos Prymeira.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Prymeira Hub / Prymeira Account |
| Cor | `#fcc009` gold |
| Repo | `Prymeira Account` (monorepo) |
| Product key | — (é o hub, não um produto) |
| Stack | Node.js + React + Clerk + Prisma |

---

## Estrutura do repo

```
Prymeira Account/
  apps/
    account-api/   ← REST API (auth, products, billing, admin)
    hub-web/       ← Dashboard web (React + Clerk)
  packages/
    auth/          ← Shared auth utilities (client + server)
```

---

## Páginas — hub-web

| Página | Arquivo | Status |
|---|---|---|
| Dashboard principal (listagem de produtos) | `App.tsx` | ✅ Feito |
| Access denied redirect handler | `App.tsx` (rota interna) | ✅ Feito |
| Admin panel | `AdminPanel.tsx` | ✅ Feito |
| Login / Sign up | Clerk direto (sem layout customizado) | 🚧 Sem branding Prymeira |

---

## API — account-api

| Endpoint | Descrição | Status |
|---|---|---|
| `POST /customers/sync` | Sincroniza usuário Clerk no sistema | ✅ |
| `GET /access-check?product_key=X` | Verifica se usuário tem acesso ao produto | ✅ |
| `POST /admin/*` | Rotas de administração | ✅ |

---

## Conexões

- **Todos os outros apps** consultam `account-api` para verificar acesso
- **Clerk** é o provedor de autenticação central — todos os apps usam o mesmo Clerk tenant
- Quando acesso é negado num app, o usuário é redirecionado para `hub-web/access-denied?product_key=X&reason=Y`

---

## O que falta

- [ ] Login page com branding Prymeira (atualmente é a tela padrão do Clerk)
- [ ] Página de access-denied no próprio Hub (recebendo o redirect dos outros apps)
- [ ] Documentação pública das rotas da account-api
