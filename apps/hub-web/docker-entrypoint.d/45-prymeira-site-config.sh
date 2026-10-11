#!/bin/sh
set -eu

js_escape() {
  printf "%s" "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

lead_webhook="$(js_escape "${PRYMEIRA_SITE_LEAD_WEBHOOK:-}")"
cat > /usr/share/nginx/site/site-config.js <<EOF
window.__PRYMEIRA_SITE_CONFIG__ = {leadWebhook: "$lead_webhook"};
EOF
