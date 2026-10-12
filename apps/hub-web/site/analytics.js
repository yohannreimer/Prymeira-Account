(function () {
  "use strict";
  var enabled = ["www.prymeiradigital.com.br", "prymeiradigital.com.br"].indexOf(location.hostname) !== -1;
  var allowedEvents = ["cta_bar", "cta_hero", "cta_team", "lead_submit", "lead_sent", "lead_validation_error", "lead_delivery_failed", "raiox_form_started", "recruit_atendimento", "recruit_followup", "recruit_cobranca", "recruit_backoffice", "recruit_processos", "recruit_aquisicao"];

  // Only event names are forwarded. Form values, identifiers and UTM values stay out.
  window.prymeiraAnalytics = { track: function (name) {
    if (enabled && allowedEvents.indexOf(name) !== -1 && typeof window.clarity === "function") window.clarity("event", name);
  } };
  if (!enabled || window.prymeiraClarityStarted) return;
  window.prymeiraClarityStarted = true;

  // Mask forms on every page before Clarity loads, including dynamically added fields.
  function maskForms() {
    document.querySelectorAll("form, input, textarea, select, [contenteditable]").forEach(function (element) {
      if (element.getAttribute("data-clarity-mask") !== "true") element.setAttribute("data-clarity-mask", "true");
    });
  }
  maskForms();
  new MutationObserver(maskForms).observe(document.body, { childList: true, subtree: true });

  // Discard legacy choices and cookies; a prior acceptance must not enable storage.
  try { localStorage.removeItem("prymeira-analytics-consent-v1"); } catch (error) {}
  ["_clck", "_clsk"].forEach(function (name) {
    ["", "; Domain=" + location.hostname, "; Domain=.prymeiradigital.com.br"].forEach(function (domain) {
      document.cookie = name + "=; Max-Age=0; Path=/" + domain + "; SameSite=Lax";
    });
  });
  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
  // Queue the no-cookie signal before loading the Microsoft script.
  window.clarity("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
  var script = document.createElement("script");
  script.id = "prymeira-clarity";
  script.async = true;
  script.src = "https://www.clarity.ms/tag/ywkt0aw2m2";
  document.head.appendChild(script);
})();
