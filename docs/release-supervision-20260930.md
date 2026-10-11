# Validação da integração de supervisão — 30/09/2026

Base: f864312cbd8bce833aeace583d2c50b6127e6058. Implementação recuperada: c845a07e7d257ea9553f974c38c35d6044d56ff0.

Checks atuais com Node 22.22.0 e pnpm 9.15.4: 121 testes API (incluindo quatro PostgreSQL e 33 de rotas de supervisão), 13 web, sete auth e 11 demo aprovados. Typecheck e build dos três pacotes aprovados.

Percurso local entre APIs Hub e Talk: cinco vendedores, 75 conversas pendentes, páginas de 50 e 25, filtros combinados, histórico e anexo sem mudar leitura/conclusão do vendedor, bloqueio de escritas de prospecção pelo supervisor e revogação bloqueando a consulta seguinte. Bancos PostgreSQL 16 descartáveis; identidade simulada, sem validar Clerk real nem contas de clientes.

Workflow manual publica apenas tags por SHA; latest continua reservado aos pushes nas branches já configuradas.

Publicação exige registrar as versões atuais, aplicar/verificar a migration aditiva 20260930010000_talk_supervision e preservar a configuração ativa. O Dockerfile da API aplica migrations antes de iniciar. Validar as rotas e interfaces depois do deploy. O código não concede automaticamente acesso a supervisor algum; a ativação depende dos vínculos reais autorizados.
