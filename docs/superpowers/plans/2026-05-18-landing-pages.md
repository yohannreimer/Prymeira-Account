# Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create public `/landing` sales pages for Fluvia, Velio (Plataforma Modular repo) and Operis (operis-dev repo).

**Architecture:** Each app gets a single `LandingPage` component (no sub-components). Plataforma Modular uses one file that switches content based on `getAppTheme().name`; Operis is a standalone file. Both repos already have `lucide-react`. Route is added before any auth guard so the page is public.

**Tech Stack:** React 18, TypeScript, React Router 6, lucide-react, inline CSS-in-JS styles (no Tailwind), Vitest + Testing Library.

---

## File map

| Action | Path |
|---|---|
| Create | `apps/frontend/src/pages/LandingPage.tsx` *(Plataforma Modular)* |
| Modify | `apps/frontend/src/App.tsx` — add `/landing` route before `*` wildcard |
| Create | `apps/frontend/src/pages/LandingPage.test.tsx` |
| Create | `apps/web/src/pages/landing-page.tsx` *(Operis)* |
| Modify | `apps/web/src/App.tsx` — add `/landing` in `<SignedIn>` and `<SignedOut>` |
| Create | `apps/web/src/pages/landing-page.test.tsx` |

---

## Task 1: Plataforma Modular — LandingPage component + route

**Repo:** `/Users/yohannreimer/Downloads/Locais/Plataforma Modular`  
**Run tests with:** `cd apps/frontend && npx vitest run src/pages/LandingPage.test.tsx`

**Files:**
- Create: `apps/frontend/src/pages/LandingPage.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/pages/LandingPage.test.tsx`

---

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/pages/LandingPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage — Fluvia (default)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders Fluvia headline and CTA', () => {
    vi.stubGlobal('location', { hostname: 'fluvia.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/empresa não quebra/i);
    const ctaLinks = screen.getAllByRole('link', { name: /criar conta grátis/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    ctaLinks.forEach(link => expect(link).toHaveAttribute('href', '/'));
  });

  test('renders three pain cards', () => {
    vi.stubGlobal('location', { hostname: 'fluvia.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByText(/dre chega semanas depois/i)).toBeInTheDocument();
    expect(screen.getByText(/fluxo de caixa no excel/i)).toBeInTheDocument();
    expect(screen.getByText(/decisões grandes no chute/i)).toBeInTheDocument();
  });
});

describe('LandingPage — Velio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders Velio headline and CTA', () => {
    vi.stubGlobal('location', { hostname: 'velio.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/menos reunião/i);
    const ctaLinks = screen.getAllByRole('link', { name: /criar conta grátis/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  test('renders before/after contrast', () => {
    vi.stubGlobal('location', { hostname: 'velio.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByText(/antes/i)).toBeInTheDocument();
    expect(screen.getByText(/com velio/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd "apps/frontend" && npx vitest run src/pages/LandingPage.test.tsx
```

Expected: FAIL — `LandingPage` not found.

- [ ] **Step 3: Create LandingPage.tsx**

Create `apps/frontend/src/pages/LandingPage.tsx`:

```tsx
// apps/frontend/src/pages/LandingPage.tsx
import {
  AlertCircle, FileSpreadsheet, Flag,
  TrendingUp, ArrowLeftRight, Landmark, Receipt,
  Kanban, Target, Users, BarChart2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getAppTheme } from './login-themes';

// ─── Shared ────────────────────────────────────────────────────────────────────

function ScreenshotPlaceholder({
  width = '100%',
  height,
  label,
  tint,
  border,
}: {
  width?: string | number;
  height: string | number;
  label: string;
  tint: string;
  border: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: tint,
        border: `1px solid ${border}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 12, color: '#aaa' }}>{label}</span>
    </div>
  );
}

function PainCard({
  icon,
  title,
  sub,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: '#fff5f5',
        border: '1px solid #ffd5d5',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: '#fee2e2',
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─── Fluvia ────────────────────────────────────────────────────────────────────

function FluviaLandingPage() {
  const primary = '#0a3d6b';
  const primaryLight = '#e8f0fe';
  const accent = '#f0c040';
  const signUpUrl = '/';

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${primary}, #1565c0)`,
              borderRadius: 5,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Fluvia</span>
          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero — split 50/50 */}
      <section style={{ background: '#fff', padding: '72px 24px 64px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                background: primaryLight,
                borderRadius: 20,
                padding: '4px 14px',
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 12, color: primary, fontWeight: 700, letterSpacing: '0.04em' }}>
                Para donos de PME
              </span>
            </div>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                margin: '0 0 16px',
              }}
            >
              Empresa não quebra<br />por falta de produto.
            </h1>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
              Quebra porque o dono não olha os números.<br />O Fluvia muda isso.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={signUpUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: primary,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  width: 'fit-content',
                }}
              >
                Criar conta grátis →
              </a>
              <span style={{ fontSize: 13, color: '#999' }}>✓ Grátis pra começar · Sem cartão</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                transform: 'perspective(800px) rotateY(-8deg) rotateX(3deg)',
                boxShadow: '8px 8px 40px rgba(10,61,107,0.18)',
              }}
            >
              <div
                style={{
                  background: primary,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: 6,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  Dashboard — Fluvia
                </span>
              </div>
              <ScreenshotPlaceholder
                height={200}
                label="screenshot do dashboard"
                tint={primaryLight}
                border="#c8d8f8"
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                background: '#fff',
                border: '1px solid #e0e8ff',
                borderRadius: 10,
                padding: '10px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Lucro este mês</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>+R$12.400</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div
        style={{
          background: '#f8f9fb',
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: '#bbb',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Usado por PMEs em todo o Brasil
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center' }}>
          {[48, 38, 56, 42, 50].map((w, i) => (
            <div key={i} style={{ width: w, height: 12, background: '#ddd', borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* Problem */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            O PROBLEMA
          </p>
          <h2
            style={{
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            73% dos donos de PME não sabem<br />o lucro{' '}
            <em style={{ color: primary, fontStyle: 'normal' }}>do mês anterior.</em>
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 36, lineHeight: 1.6 }}>
            E não é por falta de inteligência. É porque o financeiro ficou espalhado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PainCard
              icon={<AlertCircle size={18} />}
              title="DRE chega semanas depois"
              sub="Do contador. Em PDF. Quando o mês já foi."
            />
            <PainCard
              icon={<FileSpreadsheet size={18} />}
              title="Fluxo de caixa no Excel"
              sub="Três abas, dois computadores, zero confiança."
            />
            <PainCard
              icon={<Flag size={18} />}
              title="Decisões grandes no chute"
              sub="Contratar, investir, cortar — sem dado nenhum."
            />
          </div>
        </div>
      </section>

      {/* Solution */}
      <section style={{ background: '#f8f9fb', padding: '80px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            A SOLUÇÃO
          </p>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            Um lugar só.<br />Tudo que o dono precisa ver.
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 36, lineHeight: 1.6 }}>
            DRE, fluxo de caixa e contas num só lugar — sem precisar virar contador.
          </p>
          <div
            style={{
              background: '#1e2535',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                background: '#2a3344',
                height: 28,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              <div
                style={{
                  flex: 1,
                  background: '#3a4455',
                  borderRadius: 4,
                  height: 12,
                  margin: '0 12px',
                }}
              />
            </div>
            <ScreenshotPlaceholder
              height={300}
              label="screenshot do fluxo de caixa"
              tint={primaryLight}
              border="#c8d8f8"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: <TrendingUp size={16} />, label: 'DRE', sub: 'em tempo real' },
              { icon: <ArrowLeftRight size={16} />, label: 'Fluxo de Caixa', sub: 'diário' },
              { icon: <Landmark size={16} />, label: 'Conciliação', sub: 'bancária' },
              { icon: <Receipt size={16} />, label: 'Contas', sub: 'a pagar/receber' },
            ].map(({ icon, label, sub }) => (
              <div
                key={label}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e8ff',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: primaryLight,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primary,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            COMO FUNCIONA
          </p>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 36px',
            }}
          >
            Tudo que você precisa ver,<br />quando você precisa ver.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                title: 'DRE automático',
                desc: 'Resultado do mês disponível a qualquer hora. Sem esperar o contador.',
              },
              {
                title: 'Fluxo de caixa em tempo real',
                desc: 'Entradas e saídas do dia. Decida com número, não com intuição.',
              },
              {
                title: 'Conciliação bancária',
                desc: 'Importe o extrato. O Fluvia cruza com seus lançamentos automaticamente.',
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                style={{
                  display: 'flex',
                  gap: 24,
                  alignItems: 'center',
                  padding: 20,
                  background: '#f8f9fb',
                  borderRadius: 10,
                }}
              >
                <ScreenshotPlaceholder
                  width={120}
                  height={80}
                  label="screenshot"
                  tint={primaryLight}
                  border="#c8d8f8"
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 14, color: '#777', lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #05192d, #0a3d6b)',
          padding: '88px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}
        >
          Comece hoje.<br />Em 5 minutos você já sabe<br />
          <span style={{ color: accent }}>onde está o dinheiro.</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
          Grátis pra começar. Sem cartão de crédito.
        </p>
        <a
          href={signUpUrl}
          style={{
            display: 'inline-flex',
            background: accent,
            borderRadius: 8,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 800,
            color: '#111',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,192,64,0.35)',
          }}
        >
          Criar conta grátis →
        </a>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#fff',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <span style={{ fontSize: 13, color: '#bbb' }}>© 2026 Prymeira · Fluvia</span>
        <span style={{ fontSize: 13, color: '#bbb' }}>Termos · Privacidade</span>
      </footer>
    </div>
  );
}

// ─── Velio ─────────────────────────────────────────────────────────────────────

function VelioLandingPage() {
  const primary = '#4c1d95';
  const primaryLight = '#ede9fe';
  const primaryMedium = '#6d28d9';
  const accent = '#f0c040';
  const signUpUrl = '/';

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${primary}, ${primaryMedium})`,
              borderRadius: 5,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Velio</span>
          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>Entrar</a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero — centrado + screenshot perspectiva */}
      <section style={{ background: '#fff', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              background: primaryLight,
              borderRadius: 20,
              padding: '4px 14px',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: primaryMedium,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              Para heads de tecnologia e engenharia
            </span>
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            Menos reunião.<br />Mais entrega.
          </h1>
          <p style={{ fontSize: 17, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
            Projetos, tarefas e times num só lugar.<br />
            Do objetivo ao resultado, sem perder o fio.
          </p>
          <div
            style={{
              display: 'inline-flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            <a
              href={signUpUrl}
              style={{
                background: primary,
                color: '#fff',
                borderRadius: 8,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Criar conta grátis →
            </a>
            <span style={{ fontSize: 14, color: '#aaa' }}>Ver demo</span>
          </div>
        </div>

        {/* Screenshot com perspectiva top-down e floating cards */}
        <div
          style={{
            maxWidth: 680,
            margin: '0 auto',
            position: 'relative',
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              transform: 'perspective(900px) rotateX(6deg)',
              boxShadow: '0 12px 48px rgba(109,40,217,0.22)',
            }}
          >
            <div
              style={{
                background: '#2a1840',
                height: 28,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              <div
                style={{ flex: 1, background: '#3a2255', borderRadius: 4, height: 12, margin: '0 12px' }}
              />
            </div>
            <ScreenshotPlaceholder
              height={260}
              label="screenshot do kanban / board"
              tint={primaryLight}
              border="#d8c8f8"
            />
          </div>
          {/* Floating card — sprint */}
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              background: '#fff',
              border: `1px solid ${primaryLight}`,
              borderRadius: 10,
              padding: '10px 16px',
              boxShadow: '0 4px 16px rgba(109,40,217,0.14)',
            }}
          >
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Sprint 12</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: primaryMedium }}>84% concluído</div>
          </div>
          {/* Floating card — avatares */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: -10,
              background: '#fff',
              border: `1px solid ${primaryLight}`,
              borderRadius: 10,
              padding: '8px 14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex' }}>
              {[primary, primaryMedium, '#8b5cf6'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: '2px solid #fff',
                    marginLeft: i > 0 ? -6 : 0,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#666' }}>3 online agora</span>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div
        style={{
          background: '#f8f7ff',
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: '#bbb',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Confiado por times de tecnologia
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center' }}>
          {[48, 38, 56, 42].map((w, i) => (
            <div key={i} style={{ width: w, height: 12, background: '#e0d8f8', borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* Problem — Before/After */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            O PROBLEMA
          </p>
          <h2
            style={{
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 32px',
            }}
          >
            Seu time sabe o que<br />precisa entregar hoje?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              style={{
                background: '#fff5f5',
                border: '1px solid #ffd5d5',
                borderRadius: 10,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c00', marginBottom: 10 }}>Antes</div>
              <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
                Tarefa no WhatsApp · Deadline por email · Status &ldquo;na reunião de sexta&rdquo;
              </div>
            </div>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>
                Com Velio
              </div>
              <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
                Board visual · Prioridades claras · Progresso em tempo real
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — grid 2x2 */}
      <section style={{ background: '#f8f7ff', padding: '80px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            FUNCIONALIDADES
          </p>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 36px',
            }}
          >
            Tudo que o seu time<br />precisa para entregar.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                icon: <Kanban size={18} />,
                title: 'Board Kanban',
                desc: 'Visualize o fluxo de trabalho inteiro',
              },
              {
                icon: <Target size={18} />,
                title: 'Sprints',
                desc: 'Planejamento e rastreamento ágil',
              },
              {
                icon: <Users size={18} />,
                title: 'Time e carga',
                desc: 'Quem faz o quê, e quando',
              },
              {
                icon: <BarChart2 size={18} />,
                title: 'Métricas',
                desc: 'Velocidade, burndown, throughput',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: '#fff',
                  border: `1px solid ${primaryLight}`,
                  borderRadius: 10,
                  padding: '20px 24px',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: primaryLight,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primaryMedium,
                    marginBottom: 12,
                  }}
                >
                  {icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #1e0a4c, #4c1d95)',
          padding: '88px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}
        >
          Seu time merece<br />uma ferramenta à altura.<br />
          <span style={{ color: accent }}>Comece hoje.</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
          Grátis pra começar. Sem cartão de crédito.
        </p>
        <a
          href={signUpUrl}
          style={{
            display: 'inline-flex',
            background: accent,
            borderRadius: 8,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 800,
            color: '#111',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,192,64,0.35)',
          }}
        >
          Criar conta grátis →
        </a>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#fff',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <span style={{ fontSize: 13, color: '#bbb' }}>© 2026 Prymeira · Velio</span>
        <span style={{ fontSize: 13, color: '#bbb' }}>Termos · Privacidade</span>
      </footer>
    </div>
  );
}

// ─── Entry point ───────────────────────────────────────────────────────────────

export function LandingPage() {
  const theme = getAppTheme();
  if (theme.name === 'Velio') return <VelioLandingPage />;
  return <FluviaLandingPage />;
}
```

- [ ] **Step 4: Run tests — should pass now**

```bash
cd "apps/frontend" && npx vitest run src/pages/LandingPage.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Add `/landing` route to App.tsx**

In `apps/frontend/src/App.tsx`, find the `App` export and add the landing route before the `*` wildcard:

```tsx
// Add import at the top with other page imports:
import { LandingPage } from './pages/LandingPage';

// In the App component, add the route before <Route path="*" ...>:
export function App() {
  return (
    <Routes>
      <Route path="/portal/:slug/*" element={<PortalShell />} />
      <Route path="/landing" element={<LandingPage />} />   {/* ← add this line */}
      <Route path="*" element={<InternalApp />} />
    </Routes>
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
cd "apps/frontend" && npx vitest run
```

Expected: all existing tests still PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/pages/LandingPage.tsx \
        apps/frontend/src/pages/LandingPage.test.tsx \
        apps/frontend/src/App.tsx
git commit -m "feat: add landing pages for Fluvia and Velio at /landing"
```

---

## Task 2: Operis — landing page + route

**Repo:** `/Users/yohannreimer/Downloads/operis-dev/operis`  
**Run tests with:** `cd apps/web && npx vitest run src/pages/landing-page.test.tsx`

**Files:**
- Create: `apps/web/src/pages/landing-page.tsx`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/pages/landing-page.test.tsx`

---

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/landing-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { LandingPage } from './landing-page';

describe('LandingPage — Operis', () => {
  test('renders Operis headline', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/o dia que você/i);
  });

  test('renders CTA link to sign-in', () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByRole('link', { name: /criar conta grátis/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    ctaLinks.forEach(link => expect(link).toHaveAttribute('href', '/sign-in'));
  });

  test('renders three feature items', () => {
    render(<LandingPage />);
    expect(screen.getByText(/objetivos estratégicos/i)).toBeInTheDocument();
    expect(screen.getByText(/execução diária/i)).toBeInTheDocument();
    expect(screen.getByText(/revisão semanal/i)).toBeInTheDocument();
  });

  test('renders problem headline', () => {
    render(<LandingPage />);
    expect(screen.getByText(/você é capaz/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify the test setup file exists**

Check that `apps/web` has a vitest setup. If `apps/web/src/test/setup.ts` does not exist, create it. If the project has no setup file at all, add `setupFiles` to `vite.config.ts`. 

First check:
```bash
find apps/web -name "vite.config*" | head -3
cat apps/web/vite.config.ts 2>/dev/null || cat apps/web/vite.config.js 2>/dev/null
```

If `test.environment` is not set to `jsdom`, add it. If there is no setup file for `@testing-library/jest-dom`, create `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

And add to `vite.config.ts` under `test`:
```ts
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
}
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd "apps/web" && npx vitest run src/pages/landing-page.test.tsx --passWithNoTests
```

Expected: FAIL — `LandingPage` not found.

- [ ] **Step 4: Create landing-page.tsx**

Create `apps/web/src/pages/landing-page.tsx`:

```tsx
// apps/web/src/pages/landing-page.tsx
import { Target, Zap, CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';

function ScreenshotPlaceholder({
  width = '100%',
  height,
  label,
  tint,
  border,
}: {
  width?: string | number;
  height: string | number;
  label: string;
  tint: string;
  border: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: tint,
        border: `1px solid ${border}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 12, color: '#aaa' }}>{label}</span>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  iconBg,
  iconColor,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 36,
          height: 36,
          background: iconBg,
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#777', marginTop: 3, lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const primary = '#92400e';
  const primaryLight = '#fef3c7';
  const accent = '#f0c040';
  const nameColor = '#b45309';
  const signUpUrl = '/sign-in';

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0a0a0a',
        lineHeight: 1.5,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${primary}, ${nameColor})`,
              borderRadius: 5,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Operis</span>
          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }}>by Prymeira</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/sign-in" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
            Entrar
          </a>
          <a
            href={signUpUrl}
            style={{
              background: primary,
              color: '#fff',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Criar conta grátis
          </a>
        </div>
      </nav>

      {/* Hero — minimalista, copy-first */}
      <section style={{ background: '#fff', padding: '80px 24px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 660, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              background: primaryLight,
              borderRadius: 20,
              padding: '4px 14px',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 12, color: nameColor, fontWeight: 700, letterSpacing: '0.04em' }}>
              Para executivos e profissionais sênior
            </span>
          </div>
          <h1
            style={{
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: '-0.04em',
              margin: '0 0 16px',
            }}
          >
            O dia que você<br />termina tudo que<br />
            <em style={{ color: nameColor, fontStyle: 'normal' }}>prometeu.</em>
          </h1>
          <p style={{ fontSize: 18, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>
            Estratégia, projetos e foco pessoal num só lugar.<br />Sem dispersão. Sem culpa.
          </p>
          <div
            style={{
              display: 'inline-flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <a
              href={signUpUrl}
              style={{
                background: primary,
                color: '#fff',
                borderRadius: 8,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Criar conta grátis →
            </a>
            <span style={{ fontSize: 14, color: '#aaa' }}>Ver demo</span>
          </div>
          {/* Separador decorativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            <span style={{ fontSize: 12, color: '#ccc' }}>✦</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>
        </div>
      </section>

      {/* Problem — bloco narrativo */}
      <section style={{ background: '#fafafa', padding: '64px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            O PROBLEMA
          </p>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 16px',
            }}
          >
            Você é capaz. Seus<br />sistemas é que falham.
          </h2>
          <p style={{ fontSize: 17, color: '#555', lineHeight: 1.7 }}>
            Não é falta de disciplina. É que suas metas, projetos e tarefas ficam em três lugares
            diferentes — e nenhum deles conversa com o outro.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section style={{ padding: '64px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            A SOLUÇÃO
          </p>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            Estratégia, execução<br />e foco — integrados.
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32, lineHeight: 1.6 }}>
            Do objetivo trimestral até a tarefa de hoje, num único sistema.
          </p>
          {/* Phone mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 240 }}>
              <div
                style={{
                  background: '#1a0e04',
                  borderRadius: 28,
                  padding: 10,
                  boxShadow: '0 12px 48px rgba(180,83,9,0.22)',
                }}
              >
                <ScreenshotPlaceholder
                  height={400}
                  label="screenshot do app"
                  tint={primaryLight}
                  border="#e8d5a0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — coluna com separadores */}
      <section style={{ background: '#fafafa', padding: '64px 24px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            COMO FUNCIONA
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <FeatureRow
              icon={<Target size={18} />}
              title="Objetivos estratégicos"
              desc="OKRs e metas visuais — veja o progresso real, não o planejado."
              iconBg={primaryLight}
              iconColor={nameColor}
            />
            <div style={{ height: 1, background: '#f0f0f0', margin: '20px 0' }} />
            <FeatureRow
              icon={<Zap size={18} />}
              title="Execução diária"
              desc="Priorize o que importa hoje. Sem lista interminável."
              iconBg={primaryLight}
              iconColor={nameColor}
            />
            <div style={{ height: 1, background: '#f0f0f0', margin: '20px 0' }} />
            <FeatureRow
              icon={<CalendarCheck size={18} />}
              title="Revisão semanal"
              desc="O ritual que separa quem planeja de quem executa."
              iconBg={primaryLight}
              iconColor={nameColor}
            />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section
        style={{
          background: 'linear-gradient(160deg, #1a0e04, #451a03)',
          padding: '88px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}
        >
          Seus objetivos merecem<br />mais do que uma planilha.<br />
          <span style={{ color: accent }}>Comece agora.</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
          Grátis pra começar. Sem cartão de crédito.
        </p>
        <a
          href={signUpUrl}
          style={{
            display: 'inline-flex',
            background: accent,
            borderRadius: 8,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 800,
            color: '#111',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,192,64,0.35)',
          }}
        >
          Criar conta grátis →
        </a>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#fff',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <span style={{ fontSize: 13, color: '#bbb' }}>© 2026 Prymeira · Operis</span>
        <span style={{ fontSize: 13, color: '#bbb' }}>Termos · Privacidade</span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Run tests — should pass**

```bash
cd "apps/web" && npx vitest run src/pages/landing-page.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Add `/landing` route to Operis App.tsx**

In `apps/web/src/App.tsx`, add the import and two route entries — one inside `<SignedIn>` and one inside `<SignedOut>`:

```tsx
// Add import at top:
import { LandingPage } from './pages/landing-page';

// Inside <SignedIn> block, before <Route path="/notas/*":
<Route path="/landing" element={<LandingPage />} />

// Inside <SignedOut> block, before <Route path="*" element={<Navigate ...>}:
<Route path="/landing" element={<LandingPage />} />
```

The result in `<SignedIn>`:
```tsx
<SignedIn>
  <AuthSync />
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/notas/*" element={<NotasPage />} />
      <Route path="/" element={<Layout />}>
        {/* existing routes unchanged */}
      </Route>
    </Routes>
  </Suspense>
</SignedIn>
```

The result in `<SignedOut>`:
```tsx
<SignedOut>
  <Routes>
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/landing" element={<LandingPage />} />
    <Route path="*" element={<Navigate to="/sign-in" replace />} />
  </Routes>
</SignedOut>
```

- [ ] **Step 7: Run full test suite**

```bash
cd "apps/web" && npx vitest run
```

Expected: all tests PASS (including pre-existing api and feature tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/landing-page.tsx \
        apps/web/src/pages/landing-page.test.tsx \
        apps/web/src/App.tsx
git commit -m "feat: add Operis landing page at /landing"
```
