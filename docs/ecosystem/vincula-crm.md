# Vincula CRM

> CRM para gestão de relacionamentos com clientes: pipeline de vendas, funil de leads, gestão de contatos e relatórios.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Vincula CRM |
| Cor primária | `#8b5cf6` violet |
| RGB | `139,92,246` |
| Product key | `crm` |
| Repo | `atomic-crm-main` (standalone) |
| Stack | React + TypeScript + Vite + Clerk + react-admin + Supabase |
| Elemento decorativo de login | Funil de barras decrescentes (estágios do pipeline CRM) |

---

## Estrutura do repo

```
atomic-crm-main/
  src/
    App.tsx                              ← Root (MissingClerkConfig + ClerkProvider)
    components/
      atomic-crm/
        prymeira/
          PrymeiraAccessGate.tsx         ← Login (VinculaLoginLayout) + access gate
          PrymeiraAccessDenied.tsx       ← Fallback / produto bloqueado (auto-redirect)
          PrymeiraAccessContext.tsx      ← Context com dados do usuário autenticado
          accountApi.ts                  ← Chamadas à account-api
          types.ts
        root/
          CRM.tsx                        ← App shell principal (react-admin)
        providers/
          supabase/                      ← Data provider + auth token
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel, dark violet, funil) | `PrymeiraAccessGate.tsx` (`VinculaLoginLayout`) | ✅ Feito |
| Fallback chave Clerk ausente | `App.tsx` (`MissingClerkConfig`) | ✅ Feito |
| Access denied / produto bloqueado (auto-redirect) | `PrymeiraAccessDenied.tsx` | ✅ Feito |
| CRM principal (contatos, pipeline, deals) | `CRM.tsx` via react-admin | ✅ Feito |
| Landing page pública | — | ❌ **Falta** |

---

## Auth pattern

```
App.tsx
  ├── !clerkKey    → MissingClerkConfig (branded dark page)
  └── ClerkProvider
        └── PrymeiraAccessGate
              ├── !isLoaded     → Loading spinner
              ├── !isSignedIn   → VinculaLoginLayout (login page)
              ├── loading       → Loading spinner
              ├── error         → PrymeiraAccessDenied (sem redirect)
              ├── denied        → PrymeiraAccessDenied → window.location.assign(Hub)
              └── allowed       → PrymeiraAccessProvider → CRM
```

---

## Conexões

- **Hub:** chama `account-api /customers/sync` ao logar (sincroniza usuário)
- **Hub:** chama `account-api /access-check?product_key=crm` (verifica acesso)
- **Hub:** redireciona para `hub-web/access-denied` se acesso negado
- **Supabase:** data provider principal do react-admin (token Clerk → JWT Supabase)

---

## O que falta

- [ ] Landing page pública de marketing
- [ ] Verificar se Supabase row-level security está alinhado com workspace_id
