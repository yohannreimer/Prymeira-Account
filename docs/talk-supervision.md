# Supervisão do Talk no Hub

O administrador configurado em `ADMIN_EMAILS` escolhe um cliente existente como supervisor no painel `/admin`. Em **Supervisão do Talk**, busca o vendedor por nome/e-mail, escolhe um workspace elegível e um canal real do Talk. O vínculo concede somente leitura na supervisão do Talk; não cria membership, assento ou entitlement para o supervisor e mantém as contas dos vendedores.

## Configuração e migração

A migração `20260930010000_talk_supervision` cria `talk_supervision_grants` com chaves estrangeiras de clientes/workspace, UUID explícito de canal, status, timestamps e snapshot opcional do nome/telefone do canal para identificar vínculos na revogação sem consultar o Talk. O canal pertence ao banco do Talk, portanto não possui FK local. Aplicar com o fluxo normal de migrations antes de habilitar a integração; nenhuma migração de produção é executada pela implementação.

`TALK_API_URL` é opcional, uma URL base confiável configurada no servidor (exemplo: `https://talk.prymeiradigital.com.br/api`). Se ausente, deriva de `${new URL(talkProduct.appUrl).origin}/api`. A UI não recebe entrada de URL para o catálogo. O proxy usa o mesmo bearer Clerk do admin no Talk, recusa redirects e expira em 8 segundos. O Talk valida esse bearer contra `/admin/session` do Hub.

## API

Todas as rotas exigem bearer verificado. As rotas `/admin/*` exigem também e-mail em `ADMIN_EMAILS`; mutações exigem `x-admin-action-token` quando configurado (obrigatório em produção pelo padrão existente).

- `GET /me/talk-supervision`: `{grants:[{id,supervisor_customer_id,seller_customer_id,seller_name,seller_email,workspace_id,channel_id}]}`. Identifica supervisor apenas pelo `clerkUserId` verificado, nunca por parâmetro do cliente. Retorna array vazio válido se não houver vínculos elegíveis. Usa `Cache-Control: no-store`.
- `GET /admin/talk-supervision/sources?seller_customer_id=<UUID>`: `{workspaces:[{id,name}]}` para o vendedor selecionado.
- `GET /admin/talk-supervision/channels?seller_customer_id=<UUID>&workspace_id=<UUID>`: proxy de `GET <TALK_API_URL>/supervision/admin/channels?workspaceId=<UUID>`, retornando `{channels:[{id,workspaceId,displayName,phoneNumber}]}`.
- `GET /admin/talk-supervision/grants?supervisor_customer_id=<UUID>`: `{grants:[...]}` com vendedor/workspace para listar vínculos ativos e revogados.
- `POST /admin/talk-supervision/grants`: body `{supervisor_customer_id,seller_customer_id,workspace_id,channel_id}`; retorna `{grant}`. Verifica canal no catálogo e revalida acesso do vendedor na transação.
- `POST /admin/talk-supervision/grants/:id/revoke`: retorna `{grant}` revogado.

A cada leitura, o vendedor precisa continuar membro ativo, com workspace ativo, assento Talk ativo, produto Talk ativo e entitlement autorizado por `evaluateEntitlementAccess`. Perda de acesso ou revogação remove o vínculo da próxima consulta. O supervisor não precisa de entitlement próprio. O dashboard busca a supervisão separadamente de `/me/products` e exibe uma entrada **Abrir supervisão** no root do Talk com `?module=supervisao`, preservando o estado e a ação do card normal do Talk.

Uma constraint única em supervisor/workspace/canal impede duplicatas e labels divergentes para um mesmo vínculo. Recriar um vínculo revogado com o mesmo vendedor o reativa; associá-lo a outro vendedor recebe 409. Criação, reativação e revogação registram snapshots na tabela de auditoria dentro da mesma transação. Criação usa isolamento Serializable para impedir reativações concorrentes conflitantes.

## Verificação

`pnpm typecheck`, `pnpm build`, `pnpm test`. Testes de PostgreSQL exigem `SUPERVISION_TEST_DATABASE_URL` apontando explicitamente para banco descartável com migrations aplicadas:

```sh
SUPERVISION_TEST_DATABASE_URL=postgresql://user@localhost:55439/hub_supervision_test pnpm --filter @prymeira/account-api test -- src/modules/supervision/supervision.integration.test.ts
```

Os testes de integração não usam `DATABASE_URL` como fallback. O catálogo confirma que o canal existe no workspace; o administrador é responsável por escolher o canal correspondente ao vendedor quando um workspace possui vários canais.
