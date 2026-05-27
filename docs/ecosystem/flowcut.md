# Flowcut

> Plataforma de produção de vídeo: upload, corte com IA, transcrição, legendas e publicação no YouTube — tudo num fluxo único.

---

## Identidade

| Campo | Valor |
|---|---|
| Nome | Flowcut (Prymeira Flowcut) |
| Cor primária | `#fcc009` gold |
| RGB | `252,192,9` |
| Product key | `media` |
| Repo | `MediaFactory-SaaS` |
| Stack | React + TypeScript + Vite + Clerk + Node.js |
| Elemento decorativo de login | Timeline clips (blocos retangulares simulando trilha de vídeo) |

---

## Estrutura do repo

```
MediaFactory-SaaS/
  src/
    client/
      PrymeiraAuthGate.tsx   ← Login + auth gate
      App.tsx                ← Root
      GuidedShell.tsx        ← App shell (fluxo guiado)
      steps/                 ← Etapas do fluxo de produção
      components/
      api.ts
    server/
      ...
```

---

## Páginas / telas

| Tela | Arquivo | Status |
|---|---|---|
| Login (split-panel, dark, timeline clips) | `PrymeiraAuthGate.tsx` | ✅ Feito |
| Fallback chave Clerk ausente | `PrymeiraAuthGate.tsx` (`MissingKeyPanel`) | ✅ Feito |
| App shell (GuidedShell) | `GuidedShell.tsx` | ✅ Feito |
| Etapas de produção | `steps/` | ✅ Feito |
| Access denied / produto bloqueado | — | ❌ **Falta** |

---

## Auth pattern

```
PrymeiraAuthGate (ClerkProvider)
  ├── SignedOut  → FlowcutLoginLayout
  └── SignedIn   → ApiAuthBridge → children (GuidedShell)
```

**Atenção:** Flowcut **não verifica** product_key via `account-api`.
Acesso é controlado apenas pelo Clerk — qualquer usuário autenticado entra.
Isso é diferente dos outros apps (Fluvia, Velio, Vincula CRM) que fazem o check.

---

## Conexões

- **Hub:** token Clerk é configurado via `configureApiAuth()` para chamadas ao servidor
- **YouTube API:** publicação direta de vídeos
- **IA de corte:** processamento server-side

---

## O que falta

- [ ] Implementar `access-check` via `account-api` (product_key: `media`)
- [ ] Criar `AccessDenied` page com auto-redirect para o Hub (seguir padrão do Vincula CRM)
- [ ] Adicionar `ClerkLoading` skeleton no auth panel (atualmente usa `SignedOut` sem skeleton)
