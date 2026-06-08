# Prymeira — Mapa do Ecossistema

Centralização de todos os produtos Prymeira: o que é cada um, onde está o código, o que já foi feito, o que falta, e como tudo se conecta.

Atualizado em: 2026-05-24

---

## Visão geral dos produtos

### Hub — Prymeira Account
Central de identidade e acesso. É onde o cliente gerencia sua assinatura, visualiza os produtos que tem acesso e controla billing. Não é um produto que o cliente "usa" para trabalhar — é a camada que conecta tudo. Todo app do ecossistema consulta o Hub para saber se o usuário tem acesso.

### Flowcut
Plataforma de produção de vídeo para criadores de conteúdo. O usuário faz upload do vídeo bruto, a IA transcreve, sugere cortes e gera legendas — o resultado é um pacote pronto para publicar no YouTube. Elimina horas de edição manual.

### Fluvia
Gestão financeira completa para pequenas e médias empresas brasileiras. DRE automático, controle de fluxo de caixa, contas a pagar e receber, conciliação bancária. Para o dono de negócio que quer saber exatamente para onde vai o dinheiro sem precisar de contador para tudo.

### Velio
Gestão de equipes técnicas em campo. Cria ordens de serviço, distribui para técnicos, acompanha execução em tempo real, registra horas trabalhadas e tem portal para o cliente acompanhar o atendimento. Para empresas com times de campo (instalação, manutenção, assistência técnica).

### Vincula CRM
CRM para gestão do ciclo de vendas. Pipeline visual de negociações, base de contatos, funil de leads e relatórios. Para times de vendas que precisam de visibilidade sobre onde cada oportunidade está e o que fazer a seguir.

### Operis
Sistema operacional pessoal para execução estratégica. Planejamento do dia em blocos de foco com horários, revisão semanal de rituais, acompanhamento de hábitos com gamificação e check-ins via WhatsApp. Para profissionais que levam execução a sério e querem transformar intenção em resultado mensurável.

### Prymeira Talk
Operações WhatsApp para empresas que atendem em escala. Inbox unificado de conversas, gestão de equipe de atendimento, campanhas em massa, automações de fluxo, base de contatos e CRM integrado. Conecta ao WhatsApp via Evolution API. Para empresas onde WhatsApp é o canal principal de relacionamento com clientes.

---

## Produtos ativos

| App | Product key | Repo | Cor | Status |
|---|---|---|---|---|
| [Hub](./hub.md) | — | `Prymeira Account` | `#fcc009` gold | ✅ Ativo |
| [Flowcut](./flowcut.md) | `media` | `MediaFactory-SaaS` | `#fcc009` gold | ✅ Ativo |
| [Fluvia](./fluvia.md) | `financeiro` | `Plataforma Modular` | `#0a3d6b` navy | ✅ Ativo |
| [Velio](./velio.md) | `orquestrador` | `Plataforma Modular` | `#f0c040` amber | ✅ Ativo |
| [Vincula CRM](./vincula-crm.md) | `crm` | `atomic-crm-main` | `#8b5cf6` violet | ✅ Ativo |
| [Operis](./operis.md) | `operis` | `operis-dev/operis` | `#f97316` orange | ✅ Ativo |
| [Prymeira Talk](./prymeira-talk.md) | `talk` | `Wpp Interface prot` | A definir | ✅ Ativo |

### Registrados no Hub mas sem repo

| Product key | Categoria |
|---|---|
| `ads` | Performance / tráfego pago |
| `commerce` | E-commerce |

---

## Como os apps se conectam

```
                    ┌─────────────────────────────────┐
                    │         Prymeira Hub             │
                    │    (Prymeira Account repo)       │
                    │                                  │
                    │  • Clerk SSO (auth central)      │
                    │  • Liberação de produtos         │
                    │  • Billing / planos              │
                    │  • account-api (REST)            │
                    └────────────┬────────────────────┘
                                 │ /access-check?product_key=X
          ┌──────────┬───────────┼───────────┬──────────┐
          ▼          ▼           ▼           ▼          ▼
      Flowcut    Fluvia+Velio  Vincula   Operis      Talk
      (media)   (fin/orq)      (crm)   (operis)    (talk)
          │          │           │           │          │
          └──────────┴───────────┴───────────┴──────────┘
                    Se acesso negado → redirect Hub
```

### Fluxo de autenticação (padrão)

```
1. Usuário acessa o app
2. Clerk verifica login → mostra login page branded se não estiver
3. App chama account-api /access-check?product_key=X com token Clerk
4. Se negado → página branded + window.location.assign(hub/access-denied)
5. Se permitido → app carrega com workspace_id do usuário
```

**Exceções:**
- Flowcut: não implementa o passo 3 (sem access-check)
- Prymeira Talk: não implementa passos 2-4 de forma branded

---

## Padrões do ecossistema

| Documento | O que é |
|---|---|
| [CHECKLIST.md](./CHECKLIST.md) | Status de cada padrão por app — o que falta em cada um |
| [NOVO-APP.md](./NOVO-APP.md) | Guia completo para criar um novo app do zero |
| [local-demo.md](./local-demo.md) | Como rodar a demo integrada local com todos os apps |

---

## Padrão de login Prymeira

| Elemento | Regra |
|---|---|
| Layout | Split-panel: marca (52%) + Clerk auth |
| Fundo | Sempre dark `#0a0a09` + gradiente com tom da cor do app |
| Animação | Fade-in montado com 60ms delay |
| Fonte | System stack: Area Normal / Aptos / SF Pro Display |
| Estilos | Inline only — sem Tailwind, sem CSS modules |
| Elemento decorativo | **Único por app**, ligado ao domínio do produto |

### Decorativos existentes (não reutilizar)

| App | Elemento |
|---|---|
| Flowcut | Timeline clips retangulares (trilha de vídeo) |
| Fluvia | Ondas SVG (fluxo de caixa) |
| Velio | Brackets `[ ]` + dot grid (ordens técnicas estruturadas) |
| Vincula CRM | Funil de barras decrescentes (estágios do pipeline) |
| Operis | Focus blocks com horários (blocos de tempo do dia) |
| Prymeira Talk | A criar |
| Hub | A criar |

---

## Arquivos de referência por tipo de tarefa

| Tarefa | Onde buscar |
|---|---|
| Criar/atualizar login page | `~/.claude/skills/prymeira-login/` |
| Entender auth central | `Prymeira Account/packages/auth/` |
| Ver product keys registrados | `Prymeira Account/apps/hub-web/src/products.ts` |
| Entender access-check API | `Prymeira Account/apps/account-api/src/` |
| Exemplo de login completo | `MediaFactory-SaaS/src/client/PrymeiraAuthGate.tsx` |
| Exemplo de access denied | `Plataforma Modular/apps/frontend/src/pages/NoProductAccessPage.tsx` |
| Exemplo de access-check hook | `operis-dev/operis/apps/web/src/components/auth-sync.tsx` |
