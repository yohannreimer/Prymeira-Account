# Spec — Demo local integrada do ecossistema Prymeira

**Data:** 2026-06-07
**Status:** Aprovado

---

## Objetivo

Criar um modo demo local para testar todos os aplicativos Prymeira ao mesmo tempo, com dados fake, acesso liberado e reset automatico a cada inicializacao. A demo deve rodar apenas em `localhost`, sem depender de VPS, Clerk real, Stripe, Evolution API, YouTube, IA externa ou outros servicos de producao.

O Hub continua sendo a porta de entrada do ecossistema. A partir dele, o usuario demo acessa Flowcut, Fluvia, Velio, Vincula CRM, Operis e Prymeira Talk em portas locais fixas.

---

## Escopo

### Incluido

- Launcher central para subir todos os apps ao mesmo tempo.
- Portas locais fixas para Hub, Account API demo e produtos.
- Usuario demo fixo: `demo@prymeira.local`.
- Workspace demo fixo: `demo_workspace`.
- Acesso liberado para todos os `product_key` registrados no Hub.
- Reset de dados fake a cada `demo:start`.
- Seeds demo por produto, com dados suficientes para uma apresentacao controlada.
- Modo simulado para servicos externos.
- Documentacao de comandos, URLs e roteiro basico de teste.

### Fora do escopo inicial

- Docker Compose completo.
- Deploy em VPS.
- Login real via Clerk.
- Pagamentos reais via Stripe.
- WhatsApp real via Evolution API.
- Upload/processamento real de video com IA.
- Persistencia de dados demo entre execucoes.

---

## Arquitetura recomendada

O modo demo tera um controle central no repo `Prymeira Account`, porque ele ja contem o Hub, a Account API e a documentacao do ecossistema.

```
Prymeira Account
  demo/
    ecosystem.config.json       # apps, portas, comandos e URLs
    demo-user.json              # identidade fake compartilhada
    scripts/
      start-all.mjs             # sobe todos os processos
      stop-all.mjs              # encerra processos conhecidos
      reset-all.mjs             # reseta seeds demo
      healthcheck-all.mjs       # verifica URLs locais
```

Cada app continua responsavel pelo proprio modo demo, mas o launcher central orquestra tudo. O contrato entre o launcher e cada app e feito por variaveis de ambiente (`DEMO_MODE`, URLs locais, workspace demo e flags de bypass).

---

## Portas locais

| Servico | URL | Observacao |
|---|---|---|
| Hub web | `http://localhost:5175` | Entrada principal da demo |
| Account API demo | `http://localhost:3001` | Access-check fake/local |
| Flowcut web | `http://localhost:5177` | Porta dedicada para evitar conflito com outros Vite apps |
| Flowcut API | `http://localhost:4317` | API Node local do Flowcut |
| Fluvia / Velio web | `http://localhost:5173` | Usa rotas/modulos do repo Plataforma Modular |
| Fluvia / Velio API | `http://localhost:4000` | Backend local do repo Plataforma Modular |
| Vincula CRM | `http://localhost:5174` | Usa `dev:demo` quando possivel |
| Operis web | `http://localhost:5178` | Web local do Operis |
| Operis API | `http://localhost:3000` | API Fastify local do Operis |
| Prymeira Talk web | `http://localhost:5176` | Web local do Talk |
| Prymeira Talk API | `http://localhost:3002` | API Fastify local do Talk |

O Hub deve apontar seus cards de produto para essas URLs por `VITE_PRODUCT_<PRODUCT_KEY>_URL`.

---

## Auth e acesso

### Identidade demo

Todos os apps recebem a mesma identidade local:

```json
{
  "userId": "demo_user",
  "email": "demo@prymeira.local",
  "name": "Usuario Demo",
  "workspaceId": "demo_workspace",
  "workspaceName": "Prymeira Demo"
}
```

### Account API demo

A Account API em modo demo deve responder como fonte local de autorizacao:

- `GET /health` retorna sucesso.
- `POST /customers/sync` retorna o usuario/workspace demo.
- `GET /access-check?product_key=X` retorna `allowed: true` para todos os produtos demo.
- `GET /me/products` retorna todos os produtos liberados.
- Rotas de checkout/billing retornam sucesso simulado com `checkout_url` apontando para uma tela local de confirmacao demo no Hub.

### Bypass de Clerk

Cada app deve ter um caminho local que permita renderizar o produto sem `<ClerkProvider>` real quando `DEMO_MODE=true` ou flag equivalente estiver ativa. Onde ja existir bypass local, ele deve ser reutilizado. Onde ainda nao existir, adicionar uma camada pequena que forneca:

- usuario demo;
- workspace demo;
- token fake somente local;
- permissao de produto liberada.

Esse modo nao deve ser ativado em producao. A validacao deve checar `localhost` e variaveis explicitas de demo.

---

## Dados fake e reset

O comando `demo:start` deve executar `demo:reset` antes de subir os apps. O reset remove estado demo anterior e recria dados previsiveis.

### Seeds minimas por produto

| Produto | Dados fake esperados |
|---|---|
| Hub | Todos os produtos ativos, todos liberados, usuario e workspace demo |
| Flowcut | Projetos de video, arquivos simulados, transcricoes e cortes sugeridos fake |
| Fluvia | Contas a pagar/receber, caixa, DRE resumido, clientes e fornecedores |
| Velio | Ordens de servico, tecnicos, agenda, status de execucao e clientes |
| Vincula CRM | Contatos, empresas, deals em pipeline, tarefas, propostas e metricas |
| Operis | Blocos do dia, tarefas, projetos, habitos, notas, ritual semanal e gamificacao |
| Prymeira Talk | Conversas, contatos, canais simulados, campanhas, automacoes e membros da equipe |

Os dados devem ser comerciais o suficiente para demonstracao, mas sem informacao real de cliente.

---

## Comandos

No repo `Prymeira Account`:

```bash
pnpm demo:start
pnpm demo:stop
pnpm demo:reset
pnpm demo:health
```

Comportamento esperado:

- `demo:start`: reseta dados, sobe Account API demo, Hub e todos os apps.
- `demo:stop`: encerra os processos iniciados pelo launcher.
- `demo:reset`: recria todos os dados fake sem subir os apps.
- `demo:health`: valida se todas as URLs locais respondem.

O launcher deve imprimir uma tabela final com nome, URL, porta, status e comando usado.

---

## Fluxo de demonstracao

1. Executar `pnpm demo:start`.
2. Abrir `http://localhost:5175`.
3. Ver Hub com usuario demo e todos os produtos liberados.
4. Entrar em cada produto pelo card do Hub.
5. Conferir que o produto abre sem login real.
6. Navegar pelas telas principais com dados fake.
7. Voltar ao Hub e repetir para os demais produtos.
8. Rodar `pnpm demo:stop` ao final.

---

## Tratamento de falhas

### Porta ocupada

Se uma porta estiver ocupada, o launcher deve falhar cedo com uma mensagem clara:

```
Porta 5176 ocupada por outro processo. Pare o processo atual ou altere demo/ecosystem.config.json.
```

### App sem suporte demo

Se um app ainda nao tiver bypass/seed suficiente, o launcher deve mostrar o status como `partial` e continuar subindo os demais apps quando possivel. O Hub pode exibir o produto, mas a documentacao deve marcar o app como pendente ate o modo demo estar completo.

### Banco local indisponivel

Apps que dependem de banco devem ter uma das duas estrategias:

- banco local com reset/seed automatico; ou
- provider fake em memoria para demo.

Para o primeiro ciclo, preferir o caminho mais simples ja suportado por cada app.

---

## Testes e verificacao

### Automatizado

- `demo:health` confirma que Hub, Account API demo e apps respondem.
- Testes unitarios focados nos adaptadores de demo/auth local.
- Testes de access-check demo na Account API.
- Testes dos seeds quando houver transformacao de dados.

### Manual

- Abrir o Hub e acessar todos os produtos pelos cards.
- Confirmar que nenhum produto pede Clerk real.
- Confirmar que os dados voltam ao estado inicial apos reiniciar a demo.
- Confirmar que servicos externos aparecem como simulados, nao quebrados.

---

## Sequencia de implementacao sugerida

1. Criar launcher central e config de portas.
2. Implementar Account API demo/local access-check.
3. Configurar Hub para URLs locais demo.
4. Conectar apps que ja tem demo/bypass: Vincula CRM e Prymeira Talk.
5. Adaptar Fluvia/Velio, Operis e Flowcut para bypass local e seeds minimas.
6. Adicionar `demo:health`.
7. Escrever roteiro final de demonstracao.

Essa sequencia permite uma demo parcial funcional cedo, enquanto os apps mais dependentes de backend/servicos externos ganham modo local completo por etapas.

---

## Criterios de aceite

- Um unico comando sobe todos os apps locais da demo.
- O Hub abre em `http://localhost:5175` e lista todos os produtos.
- Todos os cards do Hub apontam para URLs locais corretas.
- Todos os produtos abrem sem login real.
- Todos os produtos exibem dados fake coerentes.
- Reiniciar a demo reseta os dados para o mesmo estado inicial.
- Nenhum fluxo demo depende de VPS, Clerk real, Stripe real, Evolution real ou IA externa.
- `demo:health` informa status de todos os servicos.
