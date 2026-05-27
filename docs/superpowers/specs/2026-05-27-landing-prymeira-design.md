# Landing Page — prymeiradigital.com.br
**Data:** 2026-05-27
**Status:** Aprovado
**Escopo:** Página institucional principal da Prymeira, servida em `prymeiradigital.com.br`

---

## Objetivo

Apresentar o ecossistema Prymeira para visitantes frios, com argumento central de preço: o stack completo custa menos do que qualquer ferramenta equivalente no mercado. CTA primário leva ao Hub (criar conta). Cada produto linka para sua própria landing page.

---

## Arquitetura

### Onde vive
Novo componente `LandingPage.tsx` dentro do app `hub-web` (mesmo repo `Prymeira Account`). Nenhum novo container nem pipeline de deploy.

### Roteamento por hostname
`App.tsx` adiciona checagem no topo:

```ts
const isLandingHost =
  window.location.hostname === 'prymeiradigital.com.br' ||
  window.location.hostname === 'www.prymeiradigital.com.br';
```

Quando `isLandingHost = true` → renderiza `<LandingPage />` independente do auth state (página pública).
Quando falso → comportamento atual do Hub.

### Preview em dev local
Rota `/landing-preview` adicionada ao App.tsx para testar sem precisar mudar hostname:
```ts
const isLandingPreview = window.location.pathname === '/landing-preview';
```
Renderiza `<LandingPage />` quando verdadeiro.

### Deploy
Nova entrada no `portainer-prymeira-account.yml` — Traefik roteando `prymeiradigital.com.br` e `www.prymeiradigital.com.br` para o serviço `prymeira_hub_web` já existente:
```yaml
- traefik.http.routers.prymeira-root.rule=Host(`prymeiradigital.com.br`) || Host(`www.prymeiradigital.com.br`)
- traefik.http.routers.prymeira-root.entrypoints=websecure
- traefik.http.routers.prymeira-root.tls.certresolver=letsencryptresolver
- traefik.http.routers.prymeira-root.service=prymeira-hub
```

---

## Tema Visual

- **Hero e seções de contraste:** fundo `#0a0a09` (dark total), texto branco, acento `#fcc009`
- **Seções de conteúdo:** fundo `#fafaf8` (cream) ou `#ffffff`, texto `#0a0a09`
- **Tipografia:** system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), headings com `font-weight: 900`, `letter-spacing: -0.03em`
- **Inline styles only** — sem CSS modules, sem Tailwind
- **Sem emojis**

---

## Estrutura de Seções

### 1 — Navbar (dark)
- Fundo `#0a0a09`, sticky, `z-index: 100`
- Esquerda: logo Prymeira (selo + logotipo)
- Centro: links âncora — "Produtos", "Planos", "Comparativo"
- Direita: "Entrar" (link para `hub.prymeiradigital.com.br`) + botão gold "Criar conta" (link para `hub.prymeiradigital.com.br/?tab=signup`)

### 2 — Hero (dark)
- Badge: `PREÇO DE FUNDADOR · PRIMEIROS 100 CLIENTES`
- Headline: `O stack completo por menos do que você paga num produto só.`
  - "num produto só." em `#fcc009`
- Subheadline: `Talk + CRM + Financeiro + Operações + Conteúdo. Tudo conectado. Um login. A partir de R$ 97/mês.`
- CTAs:
  - Primário gold: `Criar conta grátis →` → `https://hub.prymeiradigital.com.br`
  - Secundário ghost: `Ver planos` → âncora `#planos`
- Product badges: 6 pílulas com ponto colorido + nome de cada produto (Talk, Vincula CRM, Fluvia, Velio, Operis, Flowcut) — cores das respectivas marcas

### 3 — Problema (light, `#fafaf8`)
- Headline: `Sua empresa já usa 5 ferramentas. E paga por cada uma separado.`
- Subheadline: `Quando você soma tudo, chega a R$ 2.000–5.000 por mês. Para o mesmo stack que a Prymeira entrega por R$ 97.`
- 3 pain cards com borda `#fee2e2`:
  1. WhatsApp pago — `R$ 300–800/mês`
  2. CRM separado — `R$ 200–600/mês`
  3. Financeiro — `R$ 300–900/mês`

### 4 — Produtos (white `#ffffff`, `id="produtos"`)
- Headline: `Tudo que você precisa, num ecossistema só`
- Grid 2×3 de cards de produto. Cada card:
  - Ponto colorido da marca + nome + badge "→ Conhecer" na cor da marca
  - Descrição de 1 linha
  - Link "Conhecer →" aponta para `{subdominio}.prymeiradigital.com.br/landing`

| Produto | Cor | URL landing |
|---|---|---|
| Talk | `#2a5f4a` | `https://hub.prymeiradigital.com.br/planos?product_key=talk` |
| Vincula CRM | `#8b5cf6` | `https://hub.prymeiradigital.com.br/planos?product_key=crm` |
| Fluvia | `#0a3d6b` | `https://fluvia.prymeiradigital.com.br/landing` |
| Velio | `#f0c040` | `https://velio.prymeiradigital.com.br/landing` |
| Operis | `#f97316` | `https://operis.prymeiradigital.com.br/landing` |
| Flowcut | `#fcc009` | `https://flowcut.prymeiradigital.com.br/landing` |

> **Nota:** Talk e Vincula CRM ainda não têm landing pages próprias — o link "Conhecer" leva diretamente ao `/planos?product_key=X` no Hub. Quando as landing pages existirem, trocar pelas URLs de `/landing`.

### 5 — Comparativo (dark `#0a0a09`, `id="comparativo"`)
- Badge: `COMPARATIVO DE MERCADO`
- Headline: `Stack Prymeira vs. pagar separado`
- Dois cards lado a lado:
  - Mercado: `R$ 2.000/mês` (mínimo estimado para stack equivalente)
  - Prymeira Suite: `R$ 247/mês` com borda gold
- Nota de rodapé: `*Estimativa baseada em ferramentas equivalentes no mercado brasileiro`

### 6 — Planos (light `#fafaf8`, `id="planos"`)
- Headline: `Escolha seu ponto de entrada`
- Subheadline: `Comece pelo que faz sentido agora. Expanda quando precisar.`
- Toggle mensal/anual (igual ao PlansPage)
- Grid 2×2 com os 4 pacotes empresa (Start, Empresa, Empresa Pro, Suite Completa)
  - Empresa com borda gold e badge "Mais popular"
  - Cada card: nome + preço + produtos incluídos + botão "Assinar" → `https://hub.prymeiradigital.com.br/planos` (PlansPage não suporta deep-link por plano — o usuário escolhe lá)
- Abaixo do grid: linha "Prefere um produto só? → Ver Operis (R$49) e Flowcut (R$79)"
- Link "Ver todos os planos →" → `hub.prymeiradigital.com.br/planos`

### 7 — CTA Final (dark `#0a0a09`)
- Badge: `PREÇO DE FUNDADOR`
- Headline: `Entre antes que o preço suba.`
- Sub: `Primeiros 100 workspaces travam o preço para sempre.`
- Botão gold grande: `Criar conta grátis →`

### 8 — Footer (dark `#050505`)
- Esquerda: `© 2026 Prymeira Digital`
- Centro: links dos produtos (Talk, Fluvia, Velio, Vincula CRM, Operis, Flowcut)
- Direita: Termos de uso · Privacidade · Suporte

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|---|---|
| Criar | `apps/hub-web/src/LandingPage.tsx` |
| Modificar | `apps/hub-web/src/App.tsx` — adicionar `isLandingHost` e `isLandingPreview` |
| Modificar | `deploy/portainer-prymeira-account.yml` — adicionar rotas Traefik |

---

## Comportamento responsivo

- Mobile-first: grid de produtos colapsa para 1 coluna, comparativo empilha verticalmente
- Navbar em mobile: apenas logo + botão "Criar conta"
- Breakpoint: `768px`

---

## Links externos usados

| Destino | URL |
|---|---|
| Criar conta | `https://hub.prymeiradigital.com.br` |
| Entrar | `https://hub.prymeiradigital.com.br` |
| Ver planos | `https://hub.prymeiradigital.com.br/planos` |
| Assinar plano X | `https://hub.prymeiradigital.com.br/planos` |
| Landing Talk | `https://talk.prymeiradigital.com.br/landing` |
| Landing Fluvia | `https://fluvia.prymeiradigital.com.br/landing` |
| Landing Velio | `https://velio.prymeiradigital.com.br/landing` |
| Landing Vincula | `https://vincula.prymeiradigital.com.br/landing` |
| Landing Operis | `https://operis.prymeiradigital.com.br/landing` |
| Landing Flowcut | `https://flowcut.prymeiradigital.com.br/landing` |
