# Prymeira Hub — Redesign Visual

**Data:** 2026-05-17
**Escopo:** Redesign completo das três telas do hub — Login, Hub (autenticado) e Admin Panel

---

## 1. Contexto

O Prymeira Hub é uma plataforma de autenticação centralizada que agrega todos os produtos Prymeira em um único lugar. Usuários fazem login via Clerk e acessam os produtos aos quais têm permissão. Administradores têm acesso a um painel separado para gerenciar clientes, entitlements e trials.

O redesign tem como objetivo transmitir **qualidade técnica, sofisticação e excelência** — posicionando a plataforma como um produto premium.

---

## 2. Identidade Visual (Branding Book)

### Paleta oficial

| Token     | Valor     | Uso                                          |
|-----------|-----------|----------------------------------------------|
| `--gold`    | `#FCC009` | Único acento de cor — usado com parcimônia   |
| `--black`   | `#0c0c0c` | Fundos escuros, botão primário, texto forte  |
| `--white`   | `#ffffff` | Superfícies, cards, formulários              |
| `--cream`   | `#faf8f3` | Fundo de página (luz quente, não frio)       |
| `--surface` | `#fafafa` | Fundo de inputs, itens inativos, footer      |
| `--ink`     | `#171717` | Texto principal                              |
| `--dim`     | `#525252` | Texto secundário                             |
| `--muted`   | `#a3a3a3` | Labels, placeholders, metadados              |
| `--faint`   | `#d4d4d4` | Bordas suaves, ícones inativos               |
| `--rule`    | `#e5e5e5` | Divisores, bordas de cards                  |

**Princípio:** monocromático com gold como único acento. O gold aparece apenas em: logomark, card de métrica destaque, e botão de ação primária de produto ativo.

### Tipografia

- **Headings / brand moments:** `Playfair Display` (serif, 700–800) — equivalente web do Span Condensed Semibold do branding book
- **UI / corpo:** `Inter` (sans-serif, 400–700)
- Usar `font-style: italic` em Playfair para momentos de destaque (ex: nome do usuário no hero)

### Padrão topográfico

Linhas de contorno topográfico (elipses SVG concêntricas) em `stroke: #FCC009` com baixa opacidade. Usado como textura de fundo em:
- Painel esquerdo da tela de login (opacidade ~13%, cobre 100% do painel)
- Hero do Hub (opacidade ~18%, três clusters)
- Hero strip do Admin (opacidade ~10%, dois clusters laterais)

### Ícones

**Lucide React** — já instalado no projeto (`lucide-react@0.561.0`). Usar exclusivamente SVG de ícones Lucide. Nenhum emoji. Stroke consistente de `1.7–2px`, cor `--ink` ou `--muted` dependendo do contexto.

---

## 3. Telas

### 3.1 Login (`/`)

**Layout:** split 50/50

**Painel esquerdo (preto):**
- Background `--black` com padrão topográfico gold cobrindo toda a área
- Conteúdo centralizado vertical e horizontalmente
- Logo (logomark gold + logotype Playfair branco)
- Headline em Playfair 800: "Todos os seus apps em um único lugar." com "único lugar." em itálico gold
- Subtítulo em Inter 14px, cor `#555`

**Painel direito (creme):**
- Background `--cream`
- Tabs "Entrar / Criar conta" — links para `/sign-in` e `/sign-up`. O Clerk gerencia essas rotas nativamente: `<SignIn routing="path" path="/sign-in" />` e `<SignUp routing="path" path="/sign-up" />`. As tabs são apenas links de navegação que o React Router (ou o próprio Clerk) resolve.
- Título em Playfair: "Bem-vindo de volta" (login) / "Crie sua conta" (cadastro)
- Componente `<SignIn />` ou `<SignUp />` do Clerk estilizado via `appearance` prop:
  - Botão Google primeiro
  - Divisor "ou entre com e-mail"
  - Campos e-mail + senha
  - Link "Esqueci minha senha"
  - Botão submit preto
  - Badge "Autenticação por Clerk" discreto no rodapé do form
- Nota de termos abaixo do card
- Links Termos / Privacidade / Suporte no rodapé absoluto

**Clerk appearance customization:**
```ts
appearance={{
  variables: {
    colorPrimary: '#0c0c0c',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#171717',
    borderRadius: '7px',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    card: { boxShadow: 'none', border: 'none', padding: 0 },
    formButtonPrimary: { backgroundColor: '#0c0c0c', color: '#ffffff' },
    socialButtonsBlockButton: { border: '1px solid #e5e5e5' },
  }
}}
```

---

### 3.2 Hub — Produtos (`/`)

**Layout:** topbar + hero + grid de produtos

**Topbar (60px, branco, border-bottom):**
- Logo (logomark + logotype Playfair)
- Separador vertical
- Workspace pill: dot verde + nome do workspace + caret
- Nav: "Hub" (ativo, background gold), "Planos", "Suporte"
- Direita: botão notificação (ícone Lucide Bell) + user button (avatar preto/gold + nome + caret)

**Hero (fundo cream, border-bottom):**
- Padrão topográfico SVG como textura
- Esquerda: eyebrow tag "Workspace · [nome]", H1 Playfair "Olá, [nome em itálico gold].", subtítulo Inter, dois CTAs (botão preto "Ver todos os apps" + link "Gerenciar plano →")
- Direita: grade 2×2 de metric cards (brancos, border, shadow sutil):
  - Card gold: número de produtos ativos
  - Card neutro: trials
  - Card neutro: bloqueados
  - Card preto: plano atual (texto gold)

**Seção de produtos:**
- Background branco
- Section header: dot colorido + label uppercase + contagem
- **Produtos ativos:** grid 2 colunas — cards com ícone Lucide contextual (fundo neutro, borda), badge status, categoria, nome, descrição, botão "Abrir" (gold ou preto), metadado (última visita / status conexão)
- **Disponíveis no plano:** grid 3 colunas — cards acinzentados com opacity reduzida, ícone cinza, botão "Ver planos" outline

**Footer:** fundo `--surface`, logo discreto, links Termos/Privacidade/Suporte

---

### 3.3 Admin Panel (`/admin`)

**Layout:** topbar + hero strip + 3 colunas

**Topbar:** igual ao Hub, mas com badge "Admin" (fundo preto, texto gold) e botão "← Voltar ao Hub"

**Hero strip (fundo preto, compacto ~90px):**
- Padrão topográfico lateral
- Esquerda: label + título Playfair "Gestão de clientes" (itálico gold)
- Direita: 3 metric cards translúcidos (clientes, permissões, logs hoje)

**Grade 3 colunas:**

*Coluna 1 — Lista de clientes (260px, branco, border-right):*
- Header: label + search box
- Lista scrollável de customer items: avatar iniciais + nome + email + badge de status (Pro/Free/Bloqueado)
- Item ativo: highlight gold sutil na borda esquerda

*Coluna 2 — Detalhe do cliente (flex, padding 28px):*
- Header: avatar grande (gold) + nome + email + tags de status/plano
- Tabela de entitlements: produto (ícone + nome), status (badge colorido), plano, data de expiração
- Lista de audit log: dot colorido (verde/amarelo/vermelho) + texto + timestamp relativo

*Coluna 3 — Ações (240px, branco, border-left):*
- Label "Ações"
- Grupos por categoria: Acesso (liberar/bloquear), Trial (conceder), Plano (editar), Perigo (suspender)
- Botões: gold (liberar), preto (trial), outline (editar), vermelho suave (perigo)
- Nota informativa no rodapé: "Todas as ações são registradas..."

---

## 4. Componentes Compartilhados

### Logomark
SVG inline representando o "P" da Prymeira: fundo gold `#FCC009`, letra P em preto com buraco circular gold. Dimensões base: 32×32px, border-radius 7px.

### Topographic Pattern
SVG com `<ellipse>` concêntricas, `fill="none"`, `stroke="#FCC009"`, `stroke-width` entre 0.8–1px, `opacity` entre 0.1–0.18. Sempre `position: absolute; inset: 0; pointer-events: none`.

### Product Card
```
border: 1px solid var(--rule)
border-radius: 12px
padding: 24px
background: var(--white)
hover: box-shadow + translateY(-1px)
```
Estrutura interna: ícone (42×42, fundo neutro, borda) + badge status | categoria | nome | descrição | footer (botão + metadado)

### Status Badges
- Ativo: `background: #f0fdf4; color: #15803d`
- Pro: `background: #f0f9ff; color: #0369a1`
- Bloqueado: `background: var(--surface); color: var(--muted); border: 1px solid var(--rule)`
- Trial: `background: #fef3c7; color: #92400e`

---

## 5. Arquivos a Modificar

| Arquivo | Natureza da mudança |
|---------|---------------------|
| `apps/hub-web/src/styles.css` | Substituição completa do design system |
| `apps/hub-web/src/App.tsx` | Redesign de Hub, Landing e estrutura de roteamento |
| `apps/hub-web/src/AdminPanel.tsx` | Redesign completo do admin panel |
| `apps/hub-web/index.html` | Adicionar Google Fonts (Playfair Display + Inter) |
| `apps/hub-web/tsconfig.json` | Sem mudança prevista |

---

## 6. Decisões Técnicas

- **Fonte web:** Playfair Display + Inter via Google Fonts no `<head>` do `index.html`
- **Ícones:** `lucide-react` já instalado — importar individualmente (tree-shaking)
- **Clerk:** usar `appearance` prop no `<SignIn />` e `<SignUp />` para estilizar sem custom UI headless. Tabs "Entrar/Criar conta" fazem redirect entre as rotas do Clerk.
- **Padrão topográfico:** SVG inline em cada componente que precisar — não como asset externo
- **CSS:** continuar com CSS vanilla + variáveis CSS (sem Tailwind) — consistente com a abordagem atual do projeto
- **Sem dark mode:** a plataforma é light-only (cream/white base)
