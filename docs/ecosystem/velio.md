# Velio

> Gestão técnica de equipes em campo: ordens de serviço, kanban, apontamento de horas, agendamento de técnicos e portal do cliente.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Velio |
| Cor primária | `#f0c040` amber |
| Product key | `orquestrador` |
| Repo | `Plataforma Modular` → `apps/frontend` (mesmo repo que Fluvia) |
| Stack | React + TypeScript + Vite + Clerk |
| Elemento decorativo de login | Brackets `[ ]` + dot grid (representa ordens de serviço estruturadas) |

---

## Estrutura no repo

Velio e Fluvia **compartilham o mesmo `apps/frontend`**. O tema é detectado pelo hostname em runtime via `login-themes.ts`.

```
Plataforma Modular/apps/frontend/src/pages/
  LoginPage.tsx           ← Serve Fluvia (navy+ondas) e Velio (amber+brackets)
  NoProductAccessPage.tsx ← Serve ambos (auto-redirect Hub)
  TechniciansPage.tsx     ← Específico do Velio
  ClientsPage.tsx         ← Compartilhado
  CalendarPage.tsx        ← Compartilhado
  ...
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel, dark olive, brackets-dots) | `LoginPage.tsx` + theme `velio` | ✅ Feito |
| Access denied (auto-redirect Hub) | `NoProductAccessPage.tsx` | ✅ Feito |
| Dashboard | `DashboardPage.tsx` | ✅ Feito |
| Clientes | `ClientsPage.tsx` + `ClientDetailPage.tsx` | ✅ Feito |
| Técnicos | `TechniciansPage.tsx` | ✅ Feito |
| Turmas / Cohorts | `CohortsPage.tsx` + `CohortDetailPage.tsx` | ✅ Feito |
| Calendário | `CalendarPage.tsx` | ✅ Feito |
| Planejamento | `PlanningPage.tsx` | ✅ Feito |

---

## Auth pattern

Idêntico ao Fluvia — ver [fluvia.md](./fluvia.md#auth-pattern).

---

## Conexões

- **Hub:** chama `account-api /access-check?product_key=orquestrador`
- Redireciona para Hub em caso de acesso negado
- Mesmo frontend que Fluvia — separação apenas por hostname no deploy

---

## O que falta

- [ ] Landing page pública
- [ ] Verificar se todas as páginas de campo (atendimentos, histórico) estão finalizadas
