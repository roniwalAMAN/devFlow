# Multi-stage Dockerfile for @devflow/web
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# Stage 1: Dependencies
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM dependencies AS builder
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js Build
RUN pnpm --filter @devflow/web build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache wget
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web ./apps/web

RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["pnpm", "--filter", "@devflow/web", "start"]
