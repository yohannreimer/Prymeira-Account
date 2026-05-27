# Prymeira — Checklist de Padrões por App

Este documento é a fonte da verdade para saber se cada app atende os requisitos mínimos do ecossistema Prymeira.

**Como usar:** Quando for trabalhar em um app, olhe a coluna dele. Tudo ❌ é dívida técnica. Quando terminar uma tarefa, atualize este arquivo.

---

## Matriz de status

| Padrão | Hub | Flowcut | Fluvia | Velio | Vincula CRM | Operis | Talk |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Auth & Acesso** | | | | | | | |
| Clerk autenticação | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verifica `product_key` via account-api | — | ✅¹ | ✅ | ✅ | ✅ | ✅ | ✅³ |
| Multi-workspace (dados isolados por empresa) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Páginas de entrada** | | | | | | | |
| Login branded (split-panel Prymeira) | ✅² | ✅ | ✅ | ✅ | ✅ | ✅ | ✅³ |
| Fallback: chave Clerk ausente (branded) | — | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️⁴ |
| Access denied com auto-redirect ao Hub | — | ✅¹ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Landing page pública | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Produto** | | | | | | | |
| App principal funcional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documentação técnica (`docs/ecosystem/`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Symlink em `Locais/Prymeira/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legenda:** ✅ Feito · ❌ Falta · ⚠️ Parcial · — Não se aplica

> ¹ **Flowcut** faz access-check e redirect **no servidor** (não no client React). O server Node.js chama `account-api /access-check?product_key=media` a cada request; se negado devolve `{ code: "product_access_denied" }` e o client captura e redireciona para `hub/acesso-negado`. Funciona corretamente em produção.
>
> ² **Hub** tem login split-panel customizado com CSS classes (`login-brand`, `login-form-panel`). Visual diferente dos outros apps: painel esquerdo dark com fonte serif e gold, painel direito cream/claro com Clerk. Não segue exatamente o design system inline-styles dos outros apps, mas é branded e funcional.
>
> ³ **Prymeira Talk** tem login split-panel Prymeira completo em `apps/web/src/app/auth.tsx`: accent emerald `#34d399`, decoração de chat bubbles, `by Prymeira` eyebrow, Clerk `<SignIn>` com appearance dark. `TalkAccessDenied.tsx` tem `window.location.assign(hubUrl)` com auto-redirect ao Hub e botão "Voltar ao Hub" como fallback.
>
> ⁴ **Prymeira Talk** — fallback quando `VITE_CLERK_PUBLISHABLE_KEY` está ausente ainda exibe texto puro (`Configure VITE_CLERK_PUBLISHABLE_KEY.`) sem branding. Arquivo: `apps/web/src/app/auth.tsx`.

---

## Detalhamento por padrão

### 1. Login branded (dark split-panel Prymeira)

Todo app precisa de uma página de login que segue o design system Prymeira:
- Fundo dark `#0a0a09`
- Painel esquerdo: gradiente escuro com tom da cor do app, logo, headline, chips, elemento decorativo único
- Painel direito: Clerk `<SignIn>` com appearance dark
- "by Prymeira" eyebrow no topo esquerdo
- Fade-in com 60ms de delay
- Inline styles only, system fonts

**Referência:** `~/.claude/skills/prymeira-login/`

| App | Status | Arquivo | Elemento decorativo |
|---|---|---|---|
| Flowcut | ✅ | `src/client/PrymeiraAuthGate.tsx` | Timeline clips (vídeo) |
| Fluvia | ✅ | `apps/frontend/src/pages/LoginPage.tsx` | Ondas SVG (caixa) |
| Velio | ✅ | `apps/frontend/src/pages/LoginPage.tsx` | Brackets + dots (ordens) |
| Vincula CRM | ✅ | `src/components/atomic-crm/prymeira/PrymeiraAccessGate.tsx` | Funil de barras (pipeline) |
| Operis | ✅ | `apps/web/src/pages/sign-in-page.tsx` | Focus blocks (agenda) |
| Hub | ✅² | `apps/hub-web/src/App.tsx` (CSS classes) | Círculos concêntricos + serif gold |
| Prymeira Talk | ✅ | `apps/web/src/app/auth.tsx` | Chat bubbles (conversas) |

---

### 2. Access denied com auto-redirect ao Hub

Quando o usuário está autenticado mas não tem o produto liberado, o app deve:
1. Verificar `account-api /access-check?product_key=X` com o token Clerk
2. Se negado → mostrar página branded (logo, mensagem)
3. Chamar `window.location.assign(hubUrl)` automaticamente (não esperar clique)
4. Ter um botão "Voltar ao Hub" como fallback manual

**Referência:** `Locais/Plataforma Modular/apps/frontend/src/pages/NoProductAccessPage.tsx`

| App | Status | Arquivo |
|---|---|---|
| Fluvia | ✅ | `apps/frontend/src/pages/NoProductAccessPage.tsx` |
| Velio | ✅ | `apps/frontend/src/pages/NoProductAccessPage.tsx` (mesmo) |
| Vincula CRM | ✅ | `src/components/atomic-crm/prymeira/PrymeiraAccessDenied.tsx` |
| Operis | ✅ | `apps/web/src/components/auth-sync.tsx` |
| Flowcut | ✅¹ | `src/server/prymeira/tenant.ts` + `src/client/api.ts` |
| Prymeira Talk | ✅ | `apps/web/src/app/TalkAccessDenied.tsx` |

---

### 3. Verificação de product_key via account-api

O app deve chamar `GET /access-check?product_key=X` para confirmar que o usuário tem o produto liberado.

| App | Product key | Onde | Status |
|---|---|---|---|
| Fluvia | `financeiro` | Client (AuthSync) | ✅ |
| Velio | `orquestrador` | Client (AuthSync) | ✅ |
| Vincula CRM | `crm` | Client (PrymeiraAccessGate) | ✅ |
| Operis | `operis` | Client (auth-sync.tsx) | ✅ |
| Flowcut | `media` | **Server** (tenant.ts) | ✅¹ |
| Prymeira Talk | `talk` | **Server** (auth-context.ts) | ✅³ |

---

### 4. Landing page pública

Página de marketing acessível sem login. Apresenta o produto, funcionalidades e CTA para assinar.

| App | Status | Arquivo |
|---|---|---|
| Flowcut | ✅ | `src/client/FlowcutLandingPage.tsx` — rota `/landing` |
| Fluvia / Velio | ✅ | `apps/frontend/src/pages/LandingPage.tsx` — rota `/landing` |
| Vincula CRM | ✅ | `src/components/atomic-crm/landing/VinculaLandingPage.tsx` — rota `/landing` |
| Operis | ✅ | `apps/web/src/pages/landing-page.tsx` — rota `/landing` |
| Prymeira Talk | ✅ | `apps/web/src/app/TalkLandingPage.tsx` — rota `/landing` |
| Hub | ❌ | Planos em `docs/superpowers/plans/2026-05-18-landing-pages.md`, não implementado |

---

## Prioridades de dívida técnica

### 🟡 Média (UX ruim mas funciona)
1. **Prymeira Talk** — fallback de chave Clerk ausente exibe texto puro (`Configure VITE_CLERK_PUBLISHABLE_KEY.`) sem branding. Arquivo: `apps/web/src/app/auth.tsx`

### 🟢 Baixa (melhoria futura)
2. **Hub** — sem landing page pública. Planos de design existem em `docs/superpowers/plans/2026-05-18-landing-pages.md`
3. **Hub** — login usa CSS externo (`styles.css`); poderia migrar para inline styles como os outros apps
