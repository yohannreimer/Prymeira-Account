# Landing Pages — Prymeira Ecosystem
**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Fluvia, Velio, Operis — páginas de vendas em `/landing`

---

## Contexto

Cada app do ecossistema Prymeira precisa de uma landing page de vendas acessível em `/landing` dentro do próprio subdomínio (`fluvia.prymeiradigital.com.br/landing`, etc.). O CTA principal é "Criar conta grátis", que redireciona para o fluxo de sign-up do Clerk. As páginas devem parecer produto real — não IA, não template.

---

## Decisões de Design

### Stack visual
- **Biblioteca de ícones:** `lucide-react` — mesma em todos os três apps
- **Tipografia:** Sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) nos componentes de seção; headings de hero em `font-weight: 900` com `letter-spacing: -0.03em`
- **Screenshots:** Placeholders com dimensões reais — serão substituídos por screenshots do produto antes do deploy
- **Sem emojis** em nenhuma seção

### Roteamento
- Rota `/landing` adicionada sem autenticação obrigatória (a página é pública)
- Plataforma Modular usa hash routing — a rota será `/#/landing` mas tratada via React Router como `/landing`
- Operis usa path routing — rota `/landing` direta

### CTA principal
- Botão "Criar conta grátis →" redireciona para o fluxo de sign-up do Clerk (`/#/sign-up` no Plataforma Modular, `/sign-up` no Operis)
- Aparece no navbar, no hero e no CTA final

---

## Estrutura de seções (igual nos três apps)

| # | Seção | Fundo |
|---|---|---|
| 1 | Navbar | `#ffffff` |
| 2 | Hero | `#ffffff` |
| 3 | Trust bar (logos placeholder) | fundo levemente tinted |
| 4 | Problema | `#ffffff` |
| 5 | Solução | fundo levemente tinted |
| 6 | Features (como funciona) | `#ffffff` |
| 7 | CTA Final | gradiente escuro do app |
| 8 | Footer | `#ffffff` |

---

## Especificação por App

### Fluvia — Gestão Financeira

**Paleta:**
| Token | Valor |
|---|---|
| Primária | `#0a3d6b` |
| Primária clara | `#e8f0fe` |
| Primária escura (hero CTA bg) | `linear-gradient(160deg, #05192d, #0a3d6b)` |
| Acento (CTA final) | `#f0c040` |
| Erro / dor | `#dc2626` · `#fee2e2` · `#ffd5d5` |
| Sucesso | `#16a34a` |

**Hero — split 50/50**
- Esquerda: tag "Para donos de PME" · headline `Empresa não quebra por falta de produto.` · sub `Quebra porque o dono não olha os números. O Fluvia muda isso.` · botão primário + linha "✓ Grátis pra começar · Sem cartão"
- Direita: mock do dashboard com inclinação 3D (`perspective(400px) rotateY(-8deg) rotateX(3deg)`) + floating card "Lucro este mês +R$12.400" posicionado `bottom: -8px; right: -8px`

**Problema**
- Headline: `73% dos donos de PME não sabem o lucro do mês anterior.`
- Sub: `E não é por falta de inteligência. É porque o financeiro ficou espalhado.`
- 3 cards fundo `#fff5f5` borda `#ffd5d5`:
  1. Ícone `AlertCircle` — "DRE chega semanas depois" / "Do contador. Em PDF. Quando o mês já foi."
  2. Ícone `FileSpreadsheet` — "Fluxo de caixa no Excel" / "Três abas, dois computadores, zero confiança."
  3. Ícone `Flag` — "Decisões grandes no chute" / "Contratar, investir, cortar — sem dado nenhum."

**Solução**
- Headline: `Um lugar só. Tudo que o dono precisa ver.`
- Screenshot em browser bezel escuro (`#1e2535`) com traffic lights
- Grid 2×2 de feature pills com ícones Lucide na cor `#0a3d6b`:
  - `TrendingUp` — DRE · em tempo real
  - `ArrowLeftRight` — Fluxo de Caixa · diário
  - `Landmark` — Conciliação · bancária
  - `Receipt` — Contas · a pagar/receber

**Features (como funciona)**
- Headline: `Tudo que você precisa ver, quando você precisa ver.`
- 3 linhas com thumbnail `56×40px` placeholder + texto:
  1. DRE automático — "Resultado do mês disponível a qualquer hora. Sem esperar o contador."
  2. Fluxo de caixa em tempo real — "Entradas e saídas do dia. Decida com número, não com intuição."
  3. Conciliação bancária — "Importe o extrato. O Fluvia cruza com seus lançamentos automaticamente."

**CTA Final**
- Fundo: `linear-gradient(160deg, #05192d, #0a3d6b)`
- Headline: `Comece hoje. Em 5 minutos você já sabe onde está o dinheiro.` (último trecho em `#f0c040`)
- Sub: "Grátis pra começar. Sem cartão de crédito."
- Botão: fundo `#f0c040`, texto `#111`, `font-weight: 800`

---

### Velio — Gestão Técnica

**Paleta:**
| Token | Valor |
|---|---|
| Primária | `#4c1d95` |
| Primária clara | `#ede9fe` |
| Primária média | `#6d28d9` |
| Hero CTA bg | `linear-gradient(160deg, #1e0a4c, #4c1d95)` |
| Acento | `#f0c040` |
| Erro / dor | `#dc2626` · `#fff5f5` |
| Sucesso | `#16a34a` · `#f0fdf4` |

**Hero — centrado + screenshot perspectiva top-down**
- Tag "Para heads de tecnologia e engenharia"
- Headline: `Menos reunião. Mais entrega.`
- Sub: `Projetos, tarefas e times num só lugar. Do objetivo ao resultado, sem perder o fio.`
- Botão primário + "Ver demo" link
- Screenshot abaixo: `perspective(600px) rotateX(6deg)` + floating card sprint "Sprint 12 · 84% concluído" (canto superior direito) + floating card avatares "3 online agora" (inferior esquerdo)

**Problema — Before/After**
- Headline: `Seu time sabe o que precisa entregar hoje?`
- Grid 2 colunas:
  - Esquerda (fundo `#fff5f5`, borda `#ffd5d5`): "Antes — Tarefa no WhatsApp · Deadline por email · Status 'na reunião de sexta'"
  - Direita (fundo `#f0fdf4`, borda `#bbf7d0`): "Com Velio — Board visual · Prioridades claras · Progresso em tempo real"

**Features — grid 2×2**
- Headline: `Tudo que o seu time precisa para entregar.`
- Ícones na cor `#6d28d9`, fundo `#ede9fe`:
  - `Kanban` — Board Kanban / "Visualize o fluxo de trabalho inteiro"
  - `Target` — Sprints / "Planejamento e rastreamento ágil"
  - `Users` — Time e carga / "Quem faz o quê, e quando"
  - `BarChart2` — Métricas / "Velocidade, burndown, throughput"

**CTA Final**
- Fundo: `linear-gradient(160deg, #1e0a4c, #4c1d95)`
- Headline: `Seu time merece uma ferramenta à altura. Comece hoje.` (último trecho em `#f0c040`)
- Botão: fundo `#f0c040`, texto `#111`

---

### Operis — Execução Estratégica

**Paleta:**
| Token | Valor |
|---|---|
| Primária | `#92400e` |
| Primária clara | `#fef3c7` |
| Hero CTA bg | `linear-gradient(160deg, #1a0e04, #451a03)` |
| Acento | `#f0c040` |
| Nome/destaque hero | `#b45309` |

**Hero — minimalista centrado (copy-first, sem screenshot)**
- Tag "Para executivos e profissionais sênior"
- Headline: `O dia que você termina tudo que prometeu.` (última palavra em `#b45309`)
- Sub: `Estratégia, projetos e foco pessoal num só lugar. Sem dispersão. Sem culpa.`
- Botão primário + "Ver demo" link
- Separador decorativo `✦` com linhas horizontais

**Problema — bloco narrativo**
- Headline: `Você é capaz. Seus sistemas é que falham.`
- Corpo: `Não é falta de disciplina. É que suas metas, projetos e tarefas ficam em três lugares diferentes — e nenhum deles conversa com o outro.`

**Solução**
- Headline: `Estratégia, execução e foco — integrados.`
- Sub: `Do objetivo trimestral até a tarefa de hoje, num único sistema.`
- Phone mockup centrado: borda escura `#1a0e04`, `border-radius: 16px`, screenshot interno

**Features — coluna única com separadores**
- Ícones na cor `#b45309`, fundo `#fef3c7`:
  - `Target` — Objetivos estratégicos / "OKRs e metas visuais — veja o progresso real, não o planejado."
  - `Zap` — Execução diária / "Priorize o que importa hoje. Sem lista interminável."
  - `CalendarCheck` — Revisão semanal / "O ritual que separa quem planeja de quem executa."

**CTA Final**
- Fundo: `linear-gradient(160deg, #1a0e04, #451a03)`
- Headline: `Seus objetivos merecem mais do que uma planilha. Comece agora.` (último trecho em `#f0c040`)
- Botão: fundo `#f0c040`, texto `#111`

---

## Componentes compartilhados

### `<LandingNavbar>`
Props: `appName`, `primaryColor`, `signUpUrl`  
Conteúdo: logo mark quadrado com cor do app + nome do app + "by Prymeira" · "Entrar" link · botão "Criar conta grátis"

### `<LandingTrustBar>`
Props: `label`, `tintColor`  
Conteúdo: label uppercase + 5 placeholder bars (serão logos reais depois)

### `<LandingCTAFinal>`
Props: `gradientFrom`, `gradientTo`, `headline`, `highlightText`, `signUpUrl`  
Botão sempre: fundo `#f0c040`, texto `#111`, `box-shadow: 0 4px 12px rgba(240,192,64,0.3)`

### `<LandingFooter>`
Props: `appName`  
Conteúdo: `© 2026 Prymeira · {appName}` · "Termos · Privacidade"

---

## Screenshots (placeholders)

Todas as seções com `[screenshot]` usam um `div` com:
- Fundo levemente tinted na cor do app
- Borda `1px solid` da cor primária clara do app
- Texto centralizado `font-size: 11px; color: primária média` indicando o conteúdo esperado
- Dimensões fixas que serão mantidas quando o screenshot real for inserido

Antes do deploy: substituir pelos screenshots reais exportados do produto.

---

## Repositórios afetados

| App | Repo | Arquivo principal |
|---|---|---|
| Fluvia | `/Downloads/Locais/Plataforma Modular` | `apps/frontend/src/pages/LandingPage.tsx` (criar) |
| Velio | `/Downloads/Locais/Plataforma Modular` | `apps/frontend/src/pages/LandingPage.tsx` (mesma, tema via `getAppTheme()`) |
| Operis | `/Downloads/operis-dev/operis` | `apps/web/src/pages/landing-page.tsx` (criar) |

---

## Notas de implementação

- `lucide-react` já deve estar presente; se não, adicionar ao `package.json` do app
- A landing não usa autenticação — não envolver em `<ProtectedRoute>` ou similar
- Imagens de screenshot: usar `<img>` com `width` e `height` fixos para evitar layout shift; placeholder usa `background-color` enquanto imagem não está disponível
- Toda a página pode ser um único arquivo de componente grande — não há necessidade de atomizar em sub-componentes até que a página esteja completa e aprovada
- Fontes da landing são as mesmas do app (já carregadas)
