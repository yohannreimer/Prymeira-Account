# Fluvia

> Gestão financeira completa para PMEs brasileiras: DRE, fluxo de caixa, contas a pagar/receber, conciliação bancária.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Fluvia |
| Cor primária | `#0a3d6b` navy blue |
| Product key | `financeiro` |
| Repo | `Plataforma Modular` → `apps/frontend` |
| Stack | React + TypeScript + Vite + Clerk |
| Elemento decorativo de login | Ondas SVG (representa fluxo de caixa) |

---

## Estrutura no repo

```
Plataforma Modular/
  apps/
    frontend/
      src/
        pages/
          LoginPage.tsx           ← Login (theme-driven, serve Fluvia + Velio)
          NoProductAccessPage.tsx ← Fallback / access denied (auto-redirect)
          DashboardPage.tsx
          ClientsPage.tsx
          ClientDetailPage.tsx
          CohortsPage.tsx
          CohortDetailPage.tsx
          LicensesPage.tsx
          LicenseProgramsPage.tsx
          PlanningPage.tsx
          ImplementationPage.tsx
          CalendarPage.tsx
          AdminPage.tsx
          InternalDocsPage.tsx
          RecruitmentPage.tsx
        pages/
          login-themes.ts         ← Define cores/gradiente/fonte por hostname
          login-decorations.tsx   ← Componentes decorativos (waves, brackets)
    backend/
      ...
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel, dark navy, ondas) | `LoginPage.tsx` + theme `fluvia` | ✅ Feito |
| Access denied (auto-redirect Hub) | `NoProductAccessPage.tsx` | ✅ Feito |
| Dashboard | `DashboardPage.tsx` | ✅ Feito |
| Clientes | `ClientsPage.tsx` + `ClientDetailPage.tsx` | ✅ Feito |
| Turmas / Cohorts | `CohortsPage.tsx` + `CohortDetailPage.tsx` | ✅ Feito |
| Licenças | `LicensesPage.tsx` + `LicenseProgramsPage.tsx` | ✅ Feito |
| Planejamento | `PlanningPage.tsx` | ✅ Feito |
| Implementação | `ImplementationPage.tsx` | ✅ Feito |
| Calendário | `CalendarPage.tsx` | ✅ Feito |
| Admin | `AdminPage.tsx` | ✅ Feito |
| Docs internas | `InternalDocsPage.tsx` | ✅ Feito |
| Recrutamento | `RecruitmentPage.tsx` | ✅ Feito |

---

## Auth pattern

```
(LoginPage detecta tema via hostname)
ClerkProvider
  ├── !isSignedIn  → LoginPage (tema fluvia: navy + ondas)
  ├── !hasAccess   → NoProductAccessPage → window.location.assign(hubUrl)
  └── isAllowed    → App shell → children
```

---

## Nota: Fluvia e Velio compartilham o mesmo frontend

O `LoginPage.tsx` detecta o tema pelo hostname:
- `fluvia.prymeiradigital.com.br` → tema `fluvia`
- `velio.prymeiradigital.com.br` → tema `velio`

---

## Conexões

- **Hub:** chama `account-api /access-check?product_key=financeiro`
- **Hub:** redireciona para hub em caso de acesso negado

---

## O que falta

- [ ] Verificar se todas as páginas financeiras (DRE, conciliação) estão finalizadas
- [ ] Landing page pública (página de marketing)
