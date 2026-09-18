# Multi-stage Dockerfile for @devflow/web
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN apk add --no-cache libc6-compat
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

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js Build
RUN pnpm --filter @devflow/web build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "--filter", "@devflow/web", "start"]
