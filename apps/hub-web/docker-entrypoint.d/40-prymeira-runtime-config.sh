#!/bin/sh
set -eu

js_escape() {
  printf "%s" "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

clerk_publishable_key="$(js_escape "${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}")"
account_api_url="$(js_escape "${VITE_PRYMEIRA_ACCOUNT_API_URL:-${PRYMEIRA_ACCOUNT_API_URL:-/api}}")"
product_crm_url="$(js_escape "${VITE_PRODUCT_CRM_URL:-https://vincula.prymeiradigital.com.br}")"

cat > /usr/share/nginx/html/config.js <<EOF
window.__PRYMEIRA_CONFIG__ = {
  VITE_CLERK_PUBLISHABLE_KEY: "$clerk_publishable_key",
  VITE_PRYMEIRA_ACCOUNT_API_URL: "$account_api_url",
  VITE_PRODUCT_CRM_URL: "$product_crm_url"
};
EOF
