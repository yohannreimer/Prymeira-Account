FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/account-api/package.json apps/account-api/package.json
COPY apps/hub-web/package.json apps/hub-web/package.json
COPY packages/auth/package.json packages/auth/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN node scripts/version-site-assets.mjs
RUN pnpm --filter @prymeira/hub-web build

FROM nginx:1.27-alpine
COPY apps/hub-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/hub-web/docker-entrypoint.d/40-prymeira-runtime-config.sh /docker-entrypoint.d/40-prymeira-runtime-config.sh
COPY --from=builder /app/apps/hub-web/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-prymeira-runtime-config.sh
COPY --from=builder /app/apps/hub-web/site /usr/share/nginx/site
COPY apps/hub-web/docker-entrypoint.d/45-prymeira-site-config.sh /docker-entrypoint.d/45-prymeira-site-config.sh
RUN chmod +x /docker-entrypoint.d/45-prymeira-site-config.sh
EXPOSE 80
