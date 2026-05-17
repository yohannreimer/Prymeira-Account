FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/account-api/package.json apps/account-api/package.json
COPY apps/hub-web/package.json apps/hub-web/package.json
COPY packages/auth/package.json packages/auth/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_PRYMEIRA_ACCOUNT_API_URL=/api
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_PRYMEIRA_ACCOUNT_API_URL=$VITE_PRYMEIRA_ACCOUNT_API_URL
RUN pnpm --filter @prymeira/hub-web build

FROM nginx:1.27-alpine
COPY apps/hub-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/hub-web/dist /usr/share/nginx/html
EXPOSE 80
