#!/bin/sh
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__PRYMEIRA_CONFIG__ = {
  VITE_CLERK_PUBLISHABLE_KEY: "${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}",
  VITE_PRYMEIRA_ACCOUNT_API_URL: "${VITE_PRYMEIRA_ACCOUNT_API_URL:-${PRYMEIRA_ACCOUNT_API_URL:-/api}}",
  VITE_PRODUCT_CRM_URL: "${VITE_PRODUCT_CRM_URL:-https://vincula.prymeiradigital.com.br}"
};
EOF
