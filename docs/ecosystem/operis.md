# Operis

> Execution OS — sistema operacional pessoal para execução estratégica: planejamento diário em blocos de tempo, rituais semanais, hábitos com gamificação e check-ins via WhatsApp.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Operis |
| Cor primária | `#f97316` orange |
| RGB | `249,115,22` |
| Product key | `operis` |
| Repo | `operis-access-redirect` (monorepo) |
| Stack | React + TypeScript + Vite + Clerk |
| Elemento decorativo de login | Focus blocks com horários (blocos de tempo, agenda do dia) |

---

## Estrutura do repo

```
operis-access-redirect/
  apps/
    web/
      src/
        App.tsx          ← Root + login (FocusBlocksDecoration embutida)
        pages/
          dashboard.tsx
          hoje.tsx
          amanha.tsx
          agenda.tsx
          projetos.tsx
          tarefas.tsx
          habitos.tsx
          notas.tsx
          ritual.tsx
          gamificacao.tsx
          inbox.tsx
          configuracoes.tsx
          workspaces.tsx
        components/
        features/
    api/
    worker/
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel, dark, focus blocks) | `App.tsx` | ✅ Feito |
| Dashboard | `pages/dashboard.tsx` | ✅ Feito |
| Hoje | `pages/hoje.tsx` | ✅ Feito |
| Amanhã | `pages/amanha.tsx` | ✅ Feito |
| Agenda | `pages/agenda.tsx` | ✅ Feito |
| Projetos | `pages/projetos.tsx` | ✅ Feito |
| Tarefas | `pages/tarefas.tsx` | ✅ Feito |
| Hábitos | `pages/habitos.tsx` | ✅ Feito |
| Notas | `pages/notas.tsx` | ✅ Feito |
| Ritual semanal | `pages/ritual.tsx` | ✅ Feito |
| Gamificação | `pages/gamificacao.tsx` | ✅ Feito |
| Inbox | `pages/inbox.tsx` | ✅ Feito |
| Configurações | `pages/configuracoes.tsx` | ✅ Feito |
| Workspaces | `pages/workspaces.tsx` | ✅ Feito |
| Access denied / produto bloqueado | — | ❓ A verificar |
| Landing page pública | — | ❌ **Falta** |

---

## Auth pattern

```
App.tsx
  ├── SignedOut  → Login layout (FocusBlocksDecoration, orange #f97316)
  └── SignedIn   → AuthSync → Router → pages
```

**Nota:** Precisa verificar se o `AuthSync` faz access-check via `account-api` ou apenas sincroniza o token Clerk.

---

## Conexões

- **Hub:** token Clerk usado para autenticação nas chamadas à API
- **WhatsApp:** check-ins e notificações via worker
- **Hub:** a verificar se implementa `access-check?product_key=operis`

---

## O que falta

- [ ] Confirmar se `AuthSync` verifica product_key via `account-api`
- [ ] Criar/verificar página de access denied com auto-redirect (seguir padrão dos outros apps)
- [ ] Landing page pública
