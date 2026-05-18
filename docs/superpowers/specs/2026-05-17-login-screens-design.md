# Login Screens — Prymeira Ecosystem
**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Fluvia, Operis, Velio — telas de acesso (sign-in)

---

## Contexto

Três apps do ecossistema Prymeira, cada um em seu próprio subdomínio, compartilham a mesma autenticação via Clerk ("Prymeira Account"). Atualmente Fluvia e Velio têm um split-screen básico sem identidade forte; Operis tem apenas o modal Clerk sobre fundo preto.

O objetivo é dar a cada app uma tela de entrada com identidade visual própria, mantendo coesão de sistema.

---

## Decisões de Design

### Layout
**Split-screen 42/58** — painel esquerdo brandado + painel direito com form Clerk. Aplicado nos três apps.

### Diferenciação
Cada app tem **paleta de cor própria** no painel esquerdo, com o mesmo esqueleto estrutural. Não é o mesmo escuro com accent diferente — cada app tem seu mundo de cor.

### Conteúdo do painel esquerdo
- Logo Prymeira (PNG real) — pequena, canto superior esquerdo, opacidade reduzida
- Nome do app — tipografia característica do app, canto inferior esquerdo
- Separador fino (2px) na cor do app
- Tagline do app — uppercase, espaçado, bem sutil
- Elemento visual decorativo abstrato — específico por app (ver abaixo)

### Conteúdo do painel direito (igual nos três)
- Logo Prymeira (PNG real) — tamanho completo, topo
- Heading: "Acesso à Plataforma"
- Subtítulo: "Entre com sua conta Prymeira para validar seus produtos."
- Botão Google (Clerk)
- Divisor "ou"
- Campo email + botão "Continuar →"
- Cor do botão "Continuar" = cor primária do app

---

## Especificação por App

### Fluvia — Gestão Financeira
| Atributo | Valor |
|---|---|
| Background esquerdo | `linear-gradient(175deg, #05192d, #0a3d6b, #0d52a0)` |
| Tipografia do nome | DM Serif Display — elegância financeira |
| Cor do nome | `#ffffff` |
| Tagline | GESTÃO / FINANCEIRA |
| Cor tagline | `rgba(255,255,255,0.38)` |
| Elemento decorativo | Três curvas SVG tipo ondas fluindo (representam fluxo de caixa), `opacity: 0.08`, brancas, no rodapé do painel |
| Ornamento | Dois círculos concêntricos no canto superior direito, `border: 1px solid rgba(255,255,255,0.06)` |
| Cor botão Continuar | `#0a3d6b` com texto branco |

### Operis — Execução Estratégica
| Atributo | Valor |
|---|---|
| Background esquerdo | `#060606` (quase preto) |
| Tipografia do nome | JetBrains Mono — fonte técnica/sistema |
| Cor do nome | `#ffffff`, uppercase |
| Tagline | EXECUÇÃO / ESTRATÉGICA |
| Cor tagline | `rgba(139,92,246,0.50)` (roxo) |
| Elemento decorativo | Grid de linhas finas `18x18px`, `rgba(255,255,255,0.022)`. Dois glow radiais roxos: um grande no canto inferior direito, um menor no centro esquerdo |
| Separador | `1px` roxo `rgba(139,92,246,0.5)` |
| Cor botão Continuar | `#0a0a0a` com texto branco |

### Velio — Gestão Técnica
| Atributo | Valor |
|---|---|
| Background esquerdo | `linear-gradient(175deg, #0b0b08, #14120a, #1e1806)` (escuro quente) |
| Tipografia do nome | Space Grotesk Bold — moderno, preciso |
| Cor do nome | `#f0c040` (âmbar Prymeira) |
| Tagline | GESTÃO / TÉCNICA |
| Cor tagline | `rgba(240,192,64,0.28)` |
| Elemento decorativo | Dot grid `16x16px` âmbar `rgba(240,192,64,0.07)`. Três colchetes de canto: superior direito, inferior esquerdo, inferior direito — `rgba(240,192,64,0.18-0.25)` |
| Separador | `2px` `rgba(240,192,64,0.3)` |
| Cor botão Continuar | `#1a1204` com texto `#f0c040` |

---

## Tipografias (painel direito — compartilhado)

| Uso | Fonte |
|---|---|
| Headings do form | Sora 700 |
| Corpo / labels | Inter 400/500 |
| Botão Continuar | Space Grotesk 600 |

Google Fonts — carregar via `@import` ou `<link>`:  
`Inter`, `Sora`, `Space Grotesk`, `DM Serif Display`, `JetBrains Mono`

---

## Logo Prymeira

- **Painel esquerdo:** PNG real da Prymeira, pequeno (~16–20px altura), opacidade reduzida conforme a paleta do app
- **Painel direito:** PNG real da Prymeira, tamanho completo (~22px altura), acima do heading
- **Não usar** versão em texto/CSS — sempre o PNG fornecido

---

## Repositórios afetados

| App | Repo | Arquivo principal |
|---|---|---|
| Fluvia | `/Downloads/Locais/Plataforma Modular` | `apps/frontend/src/pages/LoginPage.tsx` |
| Velio | `/Downloads/Locais/Plataforma Modular` | `apps/frontend/src/pages/LoginPage.tsx` (com prop de app) |
| Operis | `/Downloads/operis-dev` | `apps/web/src/` (criar página de sign-in) |

---

## Notas de Implementação

- O form Clerk é renderizado via `<SignIn />` do `@clerk/clerk-react` — o wrapper visual (split-screen) envolve esse componente
- Fluvia e Velio estão no mesmo repo (Plataforma Modular) mas sobem em subdomínios distintos; a detecção do tema deve usar `VITE_APP_NAME` (valor: `"fluvia"` ou `"velio"`) já configurada em cada deploy — sem lógica baseada em URL em runtime
- Operis precisa criar uma página de sign-in dedicada — atualmente redireciona para o modal padrão do Clerk sem wrapper
- As fontes do Google Fonts devem ser carregadas apenas na página de login (não no bundle principal do app)
- Adicionar `.superpowers/` ao `.gitignore` dos repos
