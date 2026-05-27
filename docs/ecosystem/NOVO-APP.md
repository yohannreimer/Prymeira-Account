# Criando um novo app Prymeira

Guia completo do zero ao primeiro deploy. Use como checklist ao criar qualquer novo produto no ecossistema.

---

## Antes de codar

- [ ] Definir nome do produto e `product_key` único (ex: `crm`, `talk`, `operis`)
- [ ] Registrar o `product_key` em `hub-web/src/products.ts` (Hub)
- [ ] Escolher cor primária (hex) — diferente das existentes
- [ ] Definir elemento decorativo único para a login page (ver lista em `README.md`)
- [ ] Criar repo (ou pasta em monorepo)
- [ ] Adicionar symlink em `Locais/Prymeira/NomeDoApp → ../pasta-real`
- [ ] Criar `docs/ecosystem/nome-do-app.md` neste diretório

---

## Stack padrão

```
apps/
  web/    React + TypeScript + Vite + Clerk
  api/    Node.js + TypeScript + Prisma + Postgres (ou Supabase)
packages/
  shared/ Types e utils compartilhados
```

---

## Checklist de implementação

### Fase 1 — Auth e acesso (obrigatório antes de qualquer feature)

- [ ] **Instalar Clerk:** `@clerk/clerk-react`
- [ ] **Configurar env:** `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_PRYMEIRA_ACCOUNT_API_URL`, `VITE_PRYMEIRA_PRODUCT_KEY`
- [ ] **Fallback de chave ausente:** Se `VITE_CLERK_PUBLISHABLE_KEY` não estiver definida, mostrar página branded (ver `App.tsx` do Vincula CRM)
- [ ] **Login page branded:** Criar split-panel dark com identidade do produto
  - Referência: `~/.claude/skills/prymeira-login/`
  - Rodar: `/prymeira-login [nome do app]` no Claude
- [ ] **Access check:** Após login, chamar `GET /access-check?product_key=X` com token Clerk
  - Referência: `Operis/apps/web/src/components/auth-sync.tsx`
- [ ] **Access denied page:** Se acesso negado → página branded + `window.location.assign(hubUrl)`
  - Referência: `Vincula CRM/src/components/atomic-crm/prymeira/PrymeiraAccessDenied.tsx`
- [ ] **Multi-workspace:** Todo dado deve ser isolado por `workspace_id`
  - O `workspace_id` vem da resposta do `/access-check`
  - Nunca confiar no `workspace_id` vindo do cliente — validar sempre no backend

### Fase 2 — Produto

- [ ] Layout principal / shell de navegação
- [ ] Features do produto
- [ ] Responsivo (mobile)

### Fase 3 — Presença pública

- [ ] Landing page em `/landing` (pode ser construída com `/prymeira-login` ou manualmente)
- [ ] SEO básico (`<title>`, `<meta description>`, og:image)

### Fase 4 — Produção

- [ ] Dockerfile
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] CI/CD (GitHub Actions)
- [ ] Atualizar `CHECKLIST.md` neste diretório com status do novo app

---

## Padrões obrigatórios de login

Ver design system completo em `~/.claude/skills/prymeira-login/reference/design-system.md`.

### Resumo rápido

```tsx
// 1. Wrapper no App.tsx
if (!clerkKey) return <MissingKeyPage />      // branded dark

// 2. Login layout (quando !isSignedIn)
<NomeAppLoginLayout />                         // split-panel dark

// 3. Access gate (quando isSignedIn)
// → chama /access-check
// → se negado: <AccessDeniedPage /> + window.location.assign(Hub)
// → se permitido: renderiza o app
```

### Elementos decorativos já usados (NÃO reutilizar)

| App | Elemento |
|---|---|
| Flowcut | Timeline clips retangulares (vídeo) |
| Fluvia | Ondas SVG (fluxo financeiro) |
| Velio | Brackets `[ ]` + dot grid (ordens técnicas) |
| Vincula CRM | Funil de barras decrescentes (pipeline) |
| Operis | Focus blocks com horários (agenda do dia) |

---

## Padrão de access check (copiar e adaptar)

```ts
// apps/web/src/components/auth-sync.tsx
const API_URL = import.meta.env.VITE_PRYMEIRA_ACCOUNT_API_URL ?? 'https://hub.prymeiradigital.com.br/api';
const PRODUCT_KEY = import.meta.env.VITE_PRYMEIRA_PRODUCT_KEY ?? 'meu-produto';

async function checkAccess(token: string) {
  const res = await fetch(`${API_URL}/access-check?product_key=${PRODUCT_KEY}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok || !data.allowed) {
    const reason = data.reason ?? 'no_entitlement';
    const hubUrl = `${HUB_URL}/access-denied?product_key=${PRODUCT_KEY}&reason=${reason}&return_url=${encodeURIComponent(window.location.href)}`;
    window.location.assign(hubUrl);
  }
}
```

---

## Padrão de access denied page (copiar e adaptar)

```tsx
// Mostrar página branded + redirecionar automaticamente
export function AccessDeniedPage({ decision, error }) {
  const href = decision
    ? buildPrymeiraAccessDeniedUrl(decision)
    : getPrymeiraHubUrl();

  useEffect(() => {
    if (error) return;                         // erro técnico: não redireciona
    if (import.meta.env.MODE === 'test') return;
    window.location.assign(href);
  }, [href]);

  return (
    // ... página branded dark com logo + mensagem + botão "Voltar ao Hub"
  );
}
```

---

## Registrar o produto no Hub

Em `Prymeira Account/apps/hub-web/src/products.ts`, adicionar:

```ts
meu-produto: {
  accent: "#hex-cor-do-app",
  category: "Categoria",
  icon: IconeLucide,
  description: "Uma frase descrevendo o produto para o usuário no Hub."
},
```

---

## Atualizar a documentação do ecossistema

Após criar o app:

1. Criar `docs/ecosystem/nome-do-app.md` com identidade, estrutura, páginas e conexões
2. Adicionar linha no `README.md` (tabela de produtos ativos)
3. Adicionar colunas no `CHECKLIST.md`
4. Adicionar symlink em `Locais/Prymeira/`
