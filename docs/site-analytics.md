# Análise do site Prymeira

Projeto Microsoft Clarity: Prymeira Digital (`ywkt0aw2m2`).
Escopo: `www.prymeiradigital.com.br` e `prymeiradigital.com.br`, somente a página pública. Hub, Talk e previews locais não recebem este tracker.

O Clarity carrega automaticamente, sem banner e sem cookies, com `consentv2` negando tanto `analytics_Storage` quanto `ad_Storage` antes de inserir o script. Preferências antigas são removidas e os cookies locais `_clck`/`_clsk` da configuração anterior são expirados. No projeto, cookies automáticos ficam desativados; mascaramento equilibrado e detecção de bots mantidos.

Cada visualização tem identificação própria, sem continuidade persistente entre páginas ou visitas. Visitantes recorrentes, sessões, tempo e funis entre páginas têm limitações; bloqueadores podem impedir coleta. Não interpretar o painel como cobertura de 100% dos visitantes.

O formulário, a confirmação personalizada e a área de retorno usam `data-clarity-mask`. Não usamos Identify nem encaminhamos propriedades do formulário, dados do lead ou UTMs nos eventos personalizados.

| Evento | Momento |
| --- | --- |
| `cta_bar`, `cta_hero`, `cta_team` | Clique no convite ao Raio-X |
| `recruit_atendimento`, `recruit_followup`, `recruit_cobranca`, `recruit_backoffice`, `recruit_processos`, `recruit_aquisicao` | Escolha de um agente no site |
| `raiox_form_started` | Primeiro foco no formulário da visita |
| `lead_validation_error` | Tentativa com campos obrigatórios inválidos |
| `lead_submit` | Tentativa válida de envio; não significa sucesso |
| `lead_sent` | Talk aceita a requisição HTTP do formulário; não significa WhatsApp entregue nem call agendada |
| `lead_delivery_failed` | Falha do envio e exibição do plano B WhatsApp |

Clarity fornece mapas de calor e gravações de navegação com as limitações do modo sem cookies. Dados podem levar até duas horas para aparecer no projeto. Para verificar, abra o site, navegue e confira no projeto; não envie leads fictícios ao Talk para testar analytics.

Teste de regressão: `node --test scripts/test-site-analytics.mjs`.
Documentação: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2 e https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking.
