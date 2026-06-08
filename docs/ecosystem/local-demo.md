# Demo local integrada

Use esta demo para testar todos os produtos Prymeira em `localhost` com dados fake resetaveis.

## Comandos

```bash
pnpm demo:start
pnpm demo:health
pnpm demo:stop
```

`pnpm demo:start` executa o reset antes de subir os apps.

## URLs

| Produto | URL |
|---|---|
| Hub | http://localhost:5175 |
| Flowcut | http://localhost:5177 |
| Fluvia | http://localhost:5173/m/financeiro |
| Velio | http://localhost:5173/m/tecnico |
| Vincula CRM | http://localhost:5174 |
| Operis | http://localhost:5178 |
| Prymeira Talk | http://localhost:5176 |

## Identidade

- Usuario: `demo@prymeira.local`
- Workspace: `demo_workspace`
- Token local: `demo-token`

## Roteiro rapido

1. Abra o Hub em `http://localhost:5175`.
2. Confirme que todos os produtos aparecem ativos.
3. Abra cada produto pelo card do Hub.
4. Confirme que nenhum app pede login real.
5. Rode `pnpm demo:stop` ao final.

## Observacoes

- A demo e local-only: nao use em VPS ou producao.
- Docker Desktop precisa estar aberto e saudavel para os resets do Prymeira Talk e Operis, porque eles sobem Postgres/RabbitMQ locais antes dos seeds.
- O Account API rejeita `DEMO_MODE=true` quando `NODE_ENV=production`.
- Operis pode exigir Prisma Client gerado antes de rodar APIs/workers locais.
