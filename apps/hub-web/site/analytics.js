(function () {
  "use strict";
  var projectId = "ywkt0aw2m2";
  var preferenceKey = "prymeira-analytics-consent-v1";
  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var enabled = false;
  var started = false;
  var preference = null;
  var allowedEvents = ["cta_bar", "cta_hero", "cta_team", "lead_submit", "lead_sent", "lead_validation_error", "lead_delivery_failed", "raiox_form_started", "recruit_atendimento", "recruit_followup", "recruit_cobranca", "recruit_backoffice", "recruit_processos", "recruit_aquisicao"];
  try {
    var stored = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    if (stored && typeof stored.granted === "boolean" && Number.isFinite(stored.at) && stored.at <= Date.now() && Date.now() - stored.at < maxAge) preference = stored.granted;
  } catch (error) {}

  function start() {
    if (["www.prymeiradigital.com.br", "prymeiradigital.com.br"].indexOf(location.hostname) === -1) return;
    enabled = true;
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    window.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
    if (started) return;
    started = true;
    var script = document.createElement("script");
    script.id = "prymeira-clarity";
    script.async = true;
    script.src = "https://www.clarity.ms/tag/" + projectId;
    document.head.appendChild(script);
  }

  // Only event names are forwarded. Form values, identifiers and UTM values stay out.
  window.prymeiraAnalytics = { track: function (name) {
    if (enabled && allowedEvents.indexOf(name) !== -1 && typeof window.clarity === "function") window.clarity("event", name);
  } };

  var notice = document.createElement("section");
  notice.className = "analytics-choice";
  notice.setAttribute("aria-label", "Preferências de análise");
  notice.hidden = true;
  notice.innerHTML = '<div><strong>Podemos entender como tu navega pelo site?</strong><p>Usamos o Microsoft Clarity para analisar cliques, rolagem e navegação e melhorar o site. Os campos do formulário ficam ocultos. <a href="/privacidade.html#analise-do-site">Saiba mais</a>.</p></div><div class="analytics-choice__actions"><button type="button" data-choice="accept">Permitir análise</button><button type="button" data-choice="deny">Não permitir</button></div>';
  document.body.appendChild(notice);

  function choose(granted) {
    preference = granted;
    try { localStorage.setItem(preferenceKey, JSON.stringify({ granted: granted, at: Date.now() })); } catch (error) {}
    notice.hidden = true;
    if (granted) start();
    else {
      enabled = false;
      if (started) {
        window.clarity("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
        // Reload with the saved denial so the recording script no longer loads.
        ["_clck", "_clsk"].forEach(function (name) {
          ["", "; Domain=" + location.hostname, "; Domain=.prymeiradigital.com.br"].forEach(function (domain) {
            document.cookie = name + "=; Max-Age=0; Path=/" + domain + "; SameSite=Lax";
          });
        });
        location.reload();
      }
    }
  }
  notice.querySelector('[data-choice="accept"]').addEventListener("click", function () { choose(true); });
  notice.querySelector('[data-choice="deny"]').addEventListener("click", function () { choose(false); });
  document.querySelectorAll("[data-analytics-preferences]").forEach(function (button) {
    button.addEventListener("click", function () { notice.hidden = false; notice.querySelector("button").focus(); });
  });
  if (preference === true) start();
  else if (preference === null) notice.hidden = false;
})();
