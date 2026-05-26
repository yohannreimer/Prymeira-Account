# Spec — Página /planos (Hub)

**Data:** 2026-05-26
**Status:** Aprovado

---

## Objetivo

Construir a rota `/planos` no Hub (`hub-web`) — página de conversão que exibe os pacotes e produtos individuais da Prymeira, integrada ao Stripe para assinaturas recorrentes. Usuários chegam aqui via:
- Link no topbar e hero do Hub (já existente)
- Fallback `checkoutUrl()` quando produto bloqueado não tem `upgrade_url` (já implementado)
- Redirect da `AccessDeniedPage` com `?product_key=X`

---

## Layout e estrutura

**Arquivo:** `apps/hub-web/src/PlansPage.tsx` (componente novo)  
**Rota:** adicionada em `App.tsx` — `isPlansRoute` paralelo ao `isAdminRoute` / `isAccessDeniedRoute`  
**Estilos:** CSS classes em `styles.css` (mesmo padrão do Hub — sem inline styles)

### Seções da página (topo → rodapé)

1. **Topbar** — reutiliza o topbar existente do Hub com "← Voltar ao Hub"
2. **Banner de contexto** *(condicional)* — aparece quando `?product_key=X` está na URL
3. **Header da página** — eyebrow + título serif + subtítulo
4. **Toggle mensal/anual** — `useState` local, sem roteamento
5. **Grid de pacotes** — 4 colunas em desktop, 2 em tablet, 1 em mobile
6. **Seção de produtos individuais** — 2 colunas com cards horizontais
7. **Rodapé** — nota de fundador + links

---

## Dados de pacotes

Definidos como constante estática em `PlansPage.tsx` (sem API — preços são editoriais):

```ts
type Plan = {
  id: string;               // 'start' | 'empresa' | 'empresa-pro' | 'suite'
  name: string;
  priceMonthly: number;     // em reais
  priceAnnual: number;      // total anual (10x mensal)
  productKeys: string[];    // lista de product_keys incluídos
  recommended?: boolean;    // badge "Mais popular"
  stripeMonthlyPriceId: string;
  stripeAnnualPriceId: string;
};

type SoloProduct = {
  productKey: string;       // 'operis' | 'media'
  priceMonthly: number;
  priceAnnual: number;
  stripeMonthlyPriceId: string;
  stripeAnnualPriceId: string;
};
```

**Pacotes:**

| id | Nome | Mensal | Anual | Produtos |
|---|---|---|---|---|
| `start` | Start | R$ 97 | R$ 797 | talk, crm |
| `empresa` | Empresa | R$ 147 | R$ 1.197 | talk, crm, financeiro |
| `empresa-pro` | Empresa Pro | R$ 197 | R$ 1.597 | talk, crm, financeiro, orquestrador |
| `suite` | Suite Completa | R$ 247 | R$ 1.997 | talk, crm, financeiro, orquestrador, media, operis |

**Produtos solo:**

| productKey | Nome | Mensal | Anual |
|---|---|---|---|
| `operis` | Operis | R$ 49 | R$ 397 |
| `media` | Flowcut | R$ 79 | R$ 647 |

---

## Comportamento de contexto (`?product_key=X`)

Quando a URL contém `?product_key=X`:

1. **Banner amarelo** aparece no topo: *"Você tentou acessar o [nome do produto] — escolha um pacote que inclua este produto para liberar o acesso."*
2. **Destaque automático**: qualquer pacote ou produto solo cujo `productKeys` contenha o `product_key` recebe:
   - Borda dourada (`border-color: var(--gold)`)
   - Badge outline dourado: *"✦ Inclui [nome do produto]"*
   - Botão CTA muda de `ghost` → `primary` (fundo preto)
3. **Scroll automático** ao pacote/produto destacado na montagem do componente (`useEffect` + `scrollIntoView`)

Lógica de resolução do nome do produto: usa `readProductPresentation(productKey).category + formatProductLabel(productKey)` — já disponível em `products.ts`.

---

## Toggle mensal/anual

```ts
const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
```

- **Mensal ativo:** preço exibe `R$ {plan.priceMonthly}/mês · cobrado mensalmente`
- **Anual ativo:** preço exibe `R$ {Math.round(plan.priceAnnual / 10)}/mês · cobrado R$ {plan.priceAnnual}/ano`
- Toggle usa classes `.plans-toggle`, `.plans-toggle-btn`, `.plans-toggle-btn--active` (novas em `styles.css`)
- Badge verde "2 meses grátis" no botão anual

---

## Integração Stripe

### Fluxo CTA "Assinar"

1. Usuário clica em "Assinar [Pacote]"
2. Componente chama `POST /api/checkout` na `account-api` com `{ priceId, successUrl, cancelUrl }`
3. `account-api` cria uma Stripe Checkout Session e devolve `{ url }`
4. Browser redireciona para `url` (Stripe hosted checkout)
5. Após pagamento: Stripe webhook → `account-api` cria/atualiza entitlements → usuário volta ao Hub

### Endpoint novo em `account-api`

```
POST /checkout
Body: { price_id: string, success_url: string, cancel_url: string }
Auth: Bearer token Clerk (obrigatório)
Response: { checkout_url: string }
```

- Cria `stripe.checkout.sessions.create()` com `mode: 'subscription'`
- `success_url`: `/planos?success=1&product_key={X}` (exibe banner de sucesso)
- `cancel_url`: `/planos?product_key={X}` (retorna sem mudar estado)
- Associa `clerk_user_id` no `metadata` da sessão para o webhook

### Webhook Stripe → account-api

Evento: `checkout.session.completed`
Ação: libera entitlement(s) correspondentes ao `price_id` para o workspace do usuário

*Nota: IDs de preço Stripe devem ser configurados como variáveis de ambiente (`STRIPE_PRICE_*`) e mapeados para os `stripeMonthlyPriceId` / `stripeAnnualPriceId` nas constantes do `PlansPage`.*

---

## Estados da página

| Estado | O que mostra |
|---|---|
| Carregando checkout | Botão com spinner, desabilitado |
| Sucesso (`?success=1`) | Banner verde: "Pagamento confirmado! Seu acesso será liberado em instantes." |
| Erro de checkout | Banner vermelho inline abaixo do botão clicado |

---

## Ícones dos produtos nos cards

Usa `readProductPresentation(productKey).icon` de `products.ts` — mesmos ícones Lucide já em uso no Hub. Cada produto no card de pacote exibe um mini-ícone 12×12 num container 22×22 (`.pkg__product-icon`).

---

## CSS — novas classes em `styles.css`

Seguem o padrão existente (BEM simplificado, tokens CSS via `var(--*)`):

```
.plans-page           — wrapper da página, max-width 1120px
.plans-ctx-banner     — banner de contexto (amarelo)
.plans-hd             — header centralizado
.plans-toggle         — container do toggle
.plans-toggle-btn     — botão do toggle
.plans-toggle-btn--active
.plans-toggle-badge   — badge verde "2 meses grátis"
.plans-grid           — grid 4 colunas dos pacotes
.pkg                  — card de pacote (herda estilo pcard)
.pkg--recommended     — borda gold + badge "Mais popular"
.pkg--highlighted     — borda gold + shadow
.pkg__badge           — badge topo do card
.pkg__icon            — ícone 38×38 no topo do card
.pkg__name            — nome do pacote (uppercase, muted)
.pkg__price           — preço em serif
.pkg__price-period    — período em muted
.pkg__products        — lista de produtos incluídos
.pkg__product         — linha de produto (ícone + nome)
.pkg__product-icon    — mini-ícone 22×22
.pkg__cta             — botão de assinar
.pkg__cta--primary    — fundo preto
.pkg__cta--gold       — fundo gold (recomendado)
.pkg__cta--ghost      — ghost com borda
.plans-solos          — grid 2 colunas dos solos
.solo                 — card horizontal de produto solo
.solo__icon           — ícone 42×42
.solo__info           — nome + descrição
.solo__right          — preço + botão
.solo__cta            — botão ghost
.plans-footer-note    — nota de rodapé
```

---

## Responsivo

| Breakpoint | Packages grid | Solos grid |
|---|---|---|
| > 900px | 4 colunas | 2 colunas |
| 640–900px | 2 colunas | 1 coluna |
| < 640px | 1 coluna | 1 coluna |

---

## Roteamento em `App.tsx`

```tsx
const isPlansRoute = window.location.pathname.startsWith('/planos');

// No render:
<SignedIn>
  {isAdminRoute   ? <AdminPanel />       :
   isAccessDeniedRoute ? <AccessDeniedPage /> :
   isPlansRoute   ? <PlansPage />        :
   <Hub />}
</SignedIn>
```

`PlansPage` também é acessível por usuários não logados via `<SignedOut>` (página pública de marketing). Nesse caso, o CTA redireciona para login antes do checkout.

---

## Fora do escopo desta spec

- Gerenciamento de assinatura / cancelamento (fase futura)
- Portal do cliente Stripe (fase futura)
- Upgrade/downgrade entre planos (fase futura)
- Cobrança por seat (fase futura, conforme `pricing.md`)
