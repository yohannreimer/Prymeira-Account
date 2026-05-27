# Prymeira Talk

> SaaS de operações WhatsApp multi-empresa: inbox unificado, automações, campanhas, CRM integrado e gestão de equipes de atendimento — tudo dentro do ecossistema Prymeira.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Prymeira Talk |
| Cor primária | A definir (sem login branded ainda) |
| Product key | `talk` |
| Repo | `Wpp Interface prot` (monorepo) |
| Stack | React + TypeScript + Vite + Clerk + Prisma + Node.js |
| Elemento decorativo de login | ❌ Ainda não tem login Prymeira |

---

## O que é (visão comercial)

Prymeira Talk é a plataforma de operações WhatsApp da Prymeira para empresas que precisam gerenciar atendimento em escala. Conecta canais WhatsApp via Evolution API, centraliza conversas em um inbox de equipe, dispara campanhas para contatos, automatiza fluxos de resposta e integra com o CRM (Vincula) para contexto de cliente. Ideal para empresas com times de atendimento que usam WhatsApp como canal principal.

---

## Estrutura do repo

```
Wpp Interface prot/
  apps/
    api/        ← Backend (Node.js + Prisma + Postgres)
    web/
      src/
        app/
          auth.tsx        ← AuthProvider + AuthGate (Clerk)
          runtime-config  ← Leitura de env vars
        features/
          assistant/      ← Assistente de atendimento
          automations/    ← Fluxos automáticos
          campaigns/      ← Campanhas em massa
          channels/       ← Conexão de canais WhatsApp
          contacts/       ← Base de contatos
          crm/            ← CRM integrado
          inbox/          ← Inbox unificado de conversas
          reports/        ← Relatórios
          settings/       ← Configurações
          shell/          ← Layout e navegação
          team/           ← Gestão de equipe
  packages/
    shared/     ← Types, utils compartilhados
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel Prymeira) | — | ❌ **Falta** |
| Fallback chave Clerk ausente (branded) | `auth.tsx` | ⚠️ Só texto simples |
| Access denied / produto bloqueado | — | ❌ **Falta** |
| Inbox | `features/inbox/` | ✅ Feito |
| Canais WhatsApp | `features/channels/` | ✅ Feito |
| Contatos | `features/contacts/` | ✅ Feito |
| CRM | `features/crm/` | ✅ Feito |
| Campanhas | `features/campaigns/` | ✅ Feito |
| Automações | `features/automations/` | ✅ Feito |
| Assistente | `features/assistant/` | ✅ Feito |
| Equipe | `features/team/` | ✅ Feito |
| Relatórios | `features/reports/` | ✅ Feito |
| Landing page pública | — | ❌ **Falta** |

---

## Auth pattern (atual)

```
AuthProvider (ClerkProvider)
  └── AuthGate
        ├── SignedIn  → children (app)
        └── SignedOut → div.center-state + <SignInButton mode="modal">
```

**Problemas:**
- Login é um botão modal genérico — sem nenhum branding Prymeira
- Não há verificação de `product_key=talk` via account-api
- Não há página de access denied com redirect para o Hub

---

## Integração Evolution API

- Modo real (`EVOLUTION_MODE=real`): conecta WhatsApp de verdade via Evolution
- Modo simulado (padrão local): cria canais demo, QR simulado, mensagens de teste
- Real mode precisa: `EVOLUTION_API_BASE_URL` + `EVOLUTION_API_KEY`

---

## Conexões

- **Hub:** Clerk auth central + `product_key=talk` para verificação de acesso
- **Vincula CRM:** integração de contatos/contexto de cliente
- **Evolution API:** provider de WhatsApp (externo)
- **Operis:** check-ins via WhatsApp (Operis usa WhatsApp como canal de notificação)

---

## O que falta

- [ ] Login page com branding Prymeira (dark, split-panel) — `/prymeira-login`
- [ ] Implementar `access-check?product_key=talk` no AuthGate
- [ ] Access denied page com auto-redirect para Hub
- [ ] Landing page pública
- [ ] Adicionar à pasta `Locais/Prymeira/` ✅ (feito)
