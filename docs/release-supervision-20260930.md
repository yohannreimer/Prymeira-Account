# Validação da integração de supervisão — 30/09/2026

Base: f864312cbd8bce833aeace583d2c50b6127e6058. Implementação recuperada: c845a07e7d257ea9553f974c38c35d6044d56ff0.

Checks atuais com Node 22.22.0 e pnpm 9.15.4: 121 testes API (incluindo quatro PostgreSQL e 33 de rotas de supervisão), 13 web, sete auth e 11 demo aprovados. Typecheck e build dos três pacotes aprovados.

Percurso local entre APIs Hub e Talk: cinco vendedores, 75 conversas pendentes, páginas de 50 e 25, filtros combinados, histórico e anexo sem mudar leitura/conclusão do vendedor, bloqueio de escritas de prospecção pelo supervisor e revogação bloqueando a consulta seguinte. Bancos PostgreSQL 16 descartáveis; identidade simulada, sem validar Clerk real nem contas de clientes.

Workflow manual publica apenas tags por SHA; latest continua reservado aos pushes nas branches já configuradas.

Publicação exige registrar as versões atuais, aplicar/verificar a migration aditiva 20260930010000_talk_supervision e preservar a configuração ativa. O Dockerfile da API aplica migrations antes de iniciar. Validar as rotas e interfaces depois do deploy. O código não concede automaticamente acesso a supervisor algum; a ativação depende dos vínculos reais autorizados.

## Publicação confirmada

Em 30/09/2026, às 14:38 America/Sao_Paulo, API e Web do Hub em produção usam `e448ac9d37cb8a688cac3170a44d030dd6c89b6b`. Digests: API `sha256:6262cb4e094ab1db797e55202db96708688c91b9efa32b235327df5c7dcedab1`; Web `sha256:23a7478e16309b3824153e51465af480b032bb4f53fe4375121c22d96e1d4c61`. Build GitHub Actions 36747561221 concluído com sucesso nesse SHA.

Migration `20260930010000_talk_supervision` aplicada antes de iniciar a API. Portainer confirmou as imagens e tarefas running. `/api/health` retornou 200 e `/api/me/talk-supervision` retornou 401 sem autenticação. Bundle público `/assets/index-BcOH7sq_.js`, SHA-256 `a8b7d0194beac370f04fcee7926418b71ca6cc41007af33d9a6902e78dbaee2e`, idêntico ao build local.

Atualizadas somente imagens de serviços existentes, preservando configurações ativas. Nenhum vínculo de supervisor novo foi criado. Validação de sessão real e mapeamento autorizado continuam pendentes para ativação. Commits posteriores exclusivos de documentação não alteram o SHA de código publicado.
