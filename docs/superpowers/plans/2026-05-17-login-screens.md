# Login Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as telas de login dos três apps do ecossistema Prymeira (Fluvia, Velio, Operis) por um split-screen 42/58 com identidade visual própria por app, mantendo o form Clerk intacto.

**Architecture:** Cada app recebe um painel esquerdo brandado (gradiente, elemento decorativo, nome do app com tipografia própria, logo Prymeira pequena) + painel direito branco com logo Prymeira principal e o `<SignIn>` do Clerk com card/header ocultados. Fluvia e Velio vivem no mesmo repo (Plataforma Modular) e escolhem o tema pelo hostname. Operis recebe uma página dedicada nova.

**Tech Stack:** React 18, TypeScript, Clerk v5 (`@clerk/clerk-react`), Vite, CSS inline styles, Google Fonts via CSS `@import`

---

## Mapa de arquivos

### Repo: Plataforma Modular (`/Users/yohannreimer/Downloads/Locais/Plataforma Modular`)

| Ação | Arquivo |
|---|---|
| CRIAR | `apps/frontend/src/pages/login-themes.ts` |
| CRIAR | `apps/frontend/src/pages/login-decorations.tsx` |
| CRIAR | `apps/frontend/src/pages/login-fonts.css` |
| MODIFICAR | `apps/frontend/src/pages/LoginPage.tsx` |

### Repo: Operis (`/Users/yohannreimer/Downloads/operis-dev/operis`)

| Ação | Arquivo |
|---|---|
| COPIAR (manual) | `apps/web/public/prymeira-logo.png` |
| CRIAR | `apps/web/src/pages/sign-in-fonts.css` |
| CRIAR | `apps/web/src/pages/sign-in-page.tsx` |
| MODIFICAR | `apps/web/src/App.tsx` |

---

## Task 1 — Plataforma Modular: tema e decorações

**Files:**
- Create: `apps/frontend/src/pages/login-themes.ts`
- Create: `apps/frontend/src/pages/login-decorations.tsx`
- Create: `apps/frontend/src/pages/login-fonts.css`

- [ ] **Step 1: Criar `login-themes.ts`**

```typescript
// apps/frontend/src/pages/login-themes.ts

export type AppTheme = {
  name: string;
  tagline: [string, string];
  gradient: string;
  nameColor: string;
  taglineColor: string;
  separatorColor: string;
  separatorHeight: number;
  fontFamily: string;
  nameLetterSpacing: string;
  nameTextTransform: 'none' | 'uppercase';
  prymeiraLogoOpacity: number;
  decorativeElement: 'waves' | 'brackets-dots';
  clerkPrimaryColor: string;
  clerkButtonTextColor: string;
};

const themes: Record<string, AppTheme> = {
  fluvia: {
    name: 'Fluvia',
    tagline: ['Gestão', 'Financeira'],
    gradient: 'linear-gradient(175deg, #05192d 0%, #0a3d6b 50%, #0d52a0 100%)',
    nameColor: '#ffffff',
    taglineColor: 'rgba(255,255,255,0.38)',
    separatorColor: 'rgba(255,255,255,0.25)',
    separatorHeight: 2,
    fontFamily: "'DM Serif Display', serif",
    nameLetterSpacing: '-0.5px',
    nameTextTransform: 'none',
    prymeiraLogoOpacity: 0.4,
    decorativeElement: 'waves',
    clerkPrimaryColor: '#0a3d6b',
    clerkButtonTextColor: '#ffffff',
  },
  velio: {
    name: 'Velio',
    tagline: ['Gestão', 'Técnica'],
    gradient: 'linear-gradient(175deg, #0b0b08 0%, #14120a 50%, #1e1806 100%)',
    nameColor: '#f0c040',
    taglineColor: 'rgba(240,192,64,0.28)',
    separatorColor: 'rgba(240,192,64,0.3)',
    separatorHeight: 2,
    fontFamily: "'Space Grotesk', sans-serif",
    nameLetterSpacing: '-1px',
    nameTextTransform: 'none',
    prymeiraLogoOpacity: 0.28,
    decorativeElement: 'brackets-dots',
    clerkPrimaryColor: '#1a1204',
    clerkButtonTextColor: '#f0c040',
  },
};

/**
 * Detecta o tema pelo hostname do deploy.
 * velio.prymeiradigital.com.br → velio
 * fluvia.prymeiradigital.com.br (e localhost) → fluvia
 */
export function getAppTheme(): AppTheme {
  const hostname = window.location.hostname;
  if (hostname.includes('velio')) return themes.velio;
  return themes.fluvia;
}
```

- [ ] **Step 2: Criar `login-decorations.tsx`**

```tsx
// apps/frontend/src/pages/login-decorations.tsx

export function WavesDecoration() {
  return (
    <>
      {/* Círculos concêntricos — canto superior direito */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
          top: -40, right: -35, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 70, height: 70, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.04)',
          top: -10, right: -5, pointerEvents: 'none',
        }}
      />
      {/* Ondas SVG — fundo do painel */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          opacity: 0.08, pointerEvents: 'none',
        }}
        viewBox="0 0 140 90"
        xmlns="http://www.w3.org/2000/svg"
        height="120"
        width="100%"
        preserveAspectRatio="none"
      >
        <path
          d="M-10,55 C20,20 50,75 80,45 C110,15 130,60 155,35"
          stroke="white" strokeWidth="12" fill="none" strokeLinecap="round"
        />
        <path
          d="M-10,72 C25,40 55,88 85,62 C115,36 135,72 155,52"
          stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"
        />
        <path
          d="M-10,85 C30,60 60,95 90,75 C120,55 138,82 155,68"
          stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"
        />
      </svg>
    </>
  );
}

export function BracketsDotsDecoration() {
  return (
    <>
      {/* Dot grid âmbar */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(circle, rgba(240,192,64,0.07) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      {/* Colchete — canto superior direito */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 16, right: 16, width: 20, height: 20,
          borderTop: '1.5px solid rgba(240,192,64,0.25)',
          borderRight: '1.5px solid rgba(240,192,64,0.25)',
          pointerEvents: 'none',
        }}
      />
      {/* Colchete — canto inferior esquerdo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 16, left: 16, width: 20, height: 20,
          borderBottom: '1.5px solid rgba(240,192,64,0.18)',
          borderLeft: '1.5px solid rgba(240,192,64,0.18)',
          pointerEvents: 'none',
        }}
      />
      {/* Colchete — canto inferior direito */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 16, right: 16, width: 20, height: 20,
          borderBottom: '1.5px solid rgba(240,192,64,0.12)',
          borderRight: '1.5px solid rgba(240,192,64,0.12)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

type DecorationProps = { type: 'waves' | 'brackets-dots' };

export function LoginDecoration({ type }: DecorationProps) {
  if (type === 'waves') return <WavesDecoration />;
  return <BracketsDotsDecoration />;
}
```

- [ ] **Step 3: Criar `login-fonts.css`**

```css
/* apps/frontend/src/pages/login-fonts.css */
/* Carregado apenas na página de login — não afeta o bundle principal */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500&family=Sora:wght@700&family=Space+Grotesk:wght@500;600;700&display=swap');
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Plataforma Modular"
git add apps/frontend/src/pages/login-themes.ts \
        apps/frontend/src/pages/login-decorations.tsx \
        apps/frontend/src/pages/login-fonts.css
git commit -m "feat(login): add theme config and decorative elements for Fluvia/Velio"
```

---

## Task 2 — Plataforma Modular: reescrever LoginPage

**Files:**
- Modify: `apps/frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de `LoginPage.tsx`**

```tsx
// apps/frontend/src/pages/LoginPage.tsx
import { SignIn } from '@clerk/clerk-react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import { getAppTheme } from './login-themes';
import { LoginDecoration } from './login-decorations';
import './login-fonts.css';

export function LoginPage() {
  const theme = getAppTheme();

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Painel esquerdo — identidade do app ── */}
      <div
        style={{
          width: '42%',
          background: theme.gradient,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Logo Prymeira — pequena, topo esquerdo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <img
            src={prymeiraLogo}
            alt="Prymeira"
            style={{ height: 18, opacity: theme.prymeiraLogoOpacity }}
          />
        </div>

        {/* Elemento decorativo específico do app */}
        <LoginDecoration type={theme.decorativeElement} />

        {/* Identidade do app — âncora no canto inferior esquerdo */}
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 42,
              color: theme.nameColor,
              lineHeight: 0.95,
              letterSpacing: theme.nameLetterSpacing,
              textTransform: theme.nameTextTransform,
              marginBottom: 10,
            }}
          >
            {theme.name}
          </div>
          <div
            style={{
              width: 24,
              height: theme.separatorHeight,
              background: theme.separatorColor,
              borderRadius: 2,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              color: theme.taglineColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.6,
            }}
          >
            {theme.tagline[0]}
            <br />
            {theme.tagline[1]}
          </div>
        </div>
      </div>

      {/* ── Painel direito — form Clerk ── */}
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 28px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Logo Prymeira — tamanho completo */}
          <img
            src={prymeiraLogo}
            alt="Prymeira"
            style={{ height: 24, display: 'block', marginBottom: 24 }}
          />

          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#111111',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            Acesso à Plataforma
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#999999',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            Entre com sua conta Prymeira para validar seus produtos.
          </p>

          {/*
           * Clerk SignIn:
           * - card e header ocultados (usamos nosso próprio heading acima)
           * - colorPrimary define a cor do botão "Continuar" por app
           * - clerkButtonTextColor define a cor do texto do botão
           */}
          <SignIn
            routing="hash"
            signUpUrl="#/sign-up"
            forceRedirectUrl="/app"
            appearance={{
              variables: {
                colorPrimary: theme.clerkPrimaryColor,
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                  padding: '0',
                  width: '100%',
                },
                header: { display: 'none' },
                formButtonPrimary: { color: theme.clerkButtonTextColor },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar visualmente — iniciar o dev server**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Plataforma Modular"
npm run dev
```

Abrir `http://localhost:5173` e confirmar:
- Split-screen 42/58 visível
- Painel esquerdo com gradiente azul (Fluvia) ou escuro-âmbar (Velio, se mudar hostname)
- Nome do app com tipografia correta no canto inferior esquerdo
- Logo Prymeira pequena no topo esquerdo
- Painel direito branco com logo Prymeira grande + heading "Acesso à Plataforma" + form Clerk sem card/header próprios
- Botão "Continuar" na cor do app

Para testar Velio localmente, adicionar temporariamente `return themes.velio` antes do `if` em `getAppTheme()`, confirmar o tema âmbar, e reverter.

- [ ] **Step 3: Commit**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Plataforma Modular"
git add apps/frontend/src/pages/LoginPage.tsx
git commit -m "feat(login): split-screen login page for Fluvia and Velio"
```

---

## Task 3 — Operis: copiar logo e criar página de sign-in

**Files:**
- Add: `apps/web/public/prymeira-logo.png` (cópia manual)
- Create: `apps/web/src/pages/sign-in-fonts.css`
- Create: `apps/web/src/pages/sign-in-page.tsx`

- [ ] **Step 1: Copiar o PNG da Prymeira para o public do Operis**

```bash
cp "/Users/yohannreimer/Downloads/Locais/Plataforma Modular/apps/frontend/src/assets/prymeira-logo.png" \
   "/Users/yohannreimer/Downloads/operis-dev/operis/apps/web/public/prymeira-logo.png"
```

O arquivo ficará acessível em runtime como `/prymeira-logo.png` (via Vite public dir).

- [ ] **Step 2: Criar `sign-in-fonts.css`**

```css
/* apps/web/src/pages/sign-in-fonts.css */
/* Carregado apenas na página de sign-in */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&family=Sora:wght@700&display=swap');
```

- [ ] **Step 3: Criar `sign-in-page.tsx`**

```tsx
// apps/web/src/pages/sign-in-page.tsx
import { SignIn } from '@clerk/clerk-react';
import './sign-in-fonts.css';

function GridGlowDecoration() {
  return (
    <>
      {/* Grid de linhas finas */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Glow roxo grande — canto inferior direito */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 65%)',
          bottom: -40, right: -30, pointerEvents: 'none',
        }}
      />
      {/* Glow roxo pequeno — centro esquerdo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 65%)',
          top: '28%', left: '5%', pointerEvents: 'none',
        }}
      />
    </>
  );
}

export function SignInPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Painel esquerdo — Operis ── */}
      <div
        style={{
          width: '42%',
          background: '#060606',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Logo Prymeira — pequena, topo esquerdo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <img
            src="/prymeira-logo.png"
            alt="Prymeira"
            style={{ height: 18, opacity: 0.22 }}
          />
        </div>

        <GridGlowDecoration />

        {/* Identidade Operis — canto inferior esquerdo */}
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 38,
              fontWeight: 500,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Operis
          </div>
          <div
            style={{
              width: 24,
              height: 1,
              background: 'rgba(139,92,246,0.5)',
              marginBottom: 10,
            }}
          />
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              color: 'rgba(139,92,246,0.5)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.6,
            }}
          >
            Execução
            <br />
            Estratégica
          </div>
        </div>
      </div>

      {/* ── Painel direito — form Clerk ── */}
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 28px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Logo Prymeira — tamanho completo */}
          <img
            src="/prymeira-logo.png"
            alt="Prymeira"
            style={{ height: 24, display: 'block', marginBottom: 24 }}
          />

          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#111111',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            Acesso à Plataforma
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#999999',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            Entre com sua conta Prymeira para validar seus produtos.
          </p>

          <SignIn
            routing="path"
            path="/sign-in"
            appearance={{
              variables: {
                colorPrimary: '#0a0a0a',
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                  padding: '0',
                  width: '100%',
                },
                header: { display: 'none' },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/yohannreimer/Downloads/operis-dev/operis"
git add apps/web/public/prymeira-logo.png \
        apps/web/src/pages/sign-in-fonts.css \
        apps/web/src/pages/sign-in-page.tsx
git commit -m "feat(login): add Operis split-screen sign-in page"
```

---

## Task 4 — Operis: conectar SignInPage no App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Adicionar import de `SignInPage` e remover `SignIn` do import do Clerk**

Localizar no topo do arquivo:
```tsx
import { ClerkLoading, ClerkLoaded, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
```

Substituir por:
```tsx
import { ClerkLoading, ClerkLoaded, SignedIn, SignedOut } from '@clerk/clerk-react';
import { SignInPage } from './pages/sign-in-page';
```

- [ ] **Step 2: Substituir o bloco `<SignedOut>` pelo novo**

Localizar:
```tsx
<SignedOut>
  <Routes>
    <Route
      path="/sign-in/*"
      element={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SignIn routing="path" path="/sign-in" />
        </div>
      }
    />
    <Route path="*" element={<Navigate to="/sign-in" replace />} />
  </Routes>
</SignedOut>
```

Substituir por:
```tsx
<SignedOut>
  <Routes>
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="*" element={<Navigate to="/sign-in" replace />} />
  </Routes>
</SignedOut>
```

- [ ] **Step 3: Verificar visualmente — iniciar o dev server**

```bash
cd "/Users/yohannreimer/Downloads/operis-dev/operis"
npm run dev
```

Abrir `http://localhost:5173/sign-in` e confirmar:
- Split-screen visível com painel esquerdo preto + grid + glow roxo
- "OPERIS" em JetBrains Mono no canto inferior esquerdo
- "Execução / Estratégica" em roxo sutil abaixo
- Logo Prymeira pequena no topo esquerdo
- Painel direito branco com logo Prymeira grande + heading + form Clerk sem card próprio
- Botão "Continuar" preto/escuro

- [ ] **Step 4: Commit**

```bash
cd "/Users/yohannreimer/Downloads/operis-dev/operis"
git add apps/web/src/App.tsx
git commit -m "feat(login): wire SignInPage into App routing"
```

---

## Task 5 — Atualizar .gitignore nos dois repos

**Files:**
- Modify: `.gitignore` em Plataforma Modular
- Modify: `.gitignore` em Operis

- [ ] **Step 1: Adicionar `.superpowers/` ao .gitignore da Plataforma Modular**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Plataforma Modular"
grep -q '\.superpowers' .gitignore || echo '.superpowers/' >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm dir"
```

- [ ] **Step 2: Adicionar `.superpowers/` ao .gitignore do Operis**

```bash
cd "/Users/yohannreimer/Downloads/operis-dev/operis"
grep -q '\.superpowers' .gitignore || echo '.superpowers/' >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm dir"
```

---

## Checklist de verificação final

Antes de considerar concluído, abrir cada app no dev server e confirmar:

| Item | Fluvia | Velio | Operis |
|---|---|---|---|
| Split-screen 42/58 visível | ☐ | ☐ | ☐ |
| Gradiente correto no painel esquerdo | ☐ | ☐ | ☐ |
| Logo Prymeira PNG (pequena) no topo esquerdo | ☐ | ☐ | ☐ |
| Elemento decorativo correto (ondas / colchetes / grid) | ☐ | ☐ | ☐ |
| Nome do app com fonte correta no canto inferior esquerdo | ☐ | ☐ | ☐ |
| Logo Prymeira PNG (grande) no painel direito | ☐ | ☐ | ☐ |
| Heading "Acesso à Plataforma" em Sora | ☐ | ☐ | ☐ |
| Form Clerk sem card/header próprios | ☐ | ☐ | ☐ |
| Botão "Continuar" na cor correta do app | ☐ | ☐ | ☐ |
| Login funciona (redireciona após auth) | ☐ | ☐ | ☐ |
