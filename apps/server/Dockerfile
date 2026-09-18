# Multi-stage Dockerfile for @devflow/server
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Stage 1: Dependencies
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM dependencies AS builder
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Generate Prisma Client & Build TypeScript
RUN pnpm --filter @devflow/database prisma:generate
RUN pnpm --filter @devflow/database build
RUN pnpm --filter @devflow/server build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built node_modules and output artifacts
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=dependencies /app/apps/server/node_modules ./apps/server/node_modules

COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]
