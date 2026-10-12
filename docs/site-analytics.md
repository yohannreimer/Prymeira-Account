# Análise do site Prymeira

Projeto Microsoft Clarity: Prymeira Digital (`ywkt0aw2m2`).
Escopo: `www.prymeiradigital.com.br` e `prymeiradigital.com.br`, somente a página pública. Hub, Talk e previews locais não recebem este tracker.

A escolha de análise aparece na primeira visita. O código do Clarity só é carregado após permitir, usa `consentv2` com analytics concedido e anúncios negados e guarda a preferência no navegador por 180 dias. Preferências de análise no rodapé permite mudar a escolha. Ao retirar, os cookies locais do Clarity são removidos e a página recarrega sem o tracker. No projeto, cookies automáticos ficam desativados, para usar o sinal explícito da página; mascaramento equilibrado e detecção de bots mantidos.

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

Eventos anteriores ao consentimento não são enviados retroativamente. Clarity também fornece mapas de calor e gravações para visitas analisadas. Dados podem levar até duas horas para aparecer no projeto. Para verificar, abra o site, permita análise, navegue e confira no projeto; não envie leads fictícios ao Talk para testar analytics.

Teste de regressão: `node --test scripts/test-site-analytics.mjs`.
Documentação: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2 e https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking.
