FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/account-api/package.json apps/account-api/package.json
COPY apps/hub-web/package.json apps/hub-web/package.json
COPY packages/auth/package.json packages/auth/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @prymeira/account-api prisma:generate
RUN pnpm --filter @prymeira/account-api build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @prymeira/account-api prisma:migrate:deploy && pnpm --filter @prymeira/account-api prisma:seed && node apps/account-api/dist/src/server.js"]
