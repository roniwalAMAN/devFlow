# DevFlow

> **Real-time engineering workspace for teams to manage projects, tasks, collaboration, and developer workflows.**

[![CI Pipeline](https://github.com/roniwalAMAN/devFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/roniwalAMAN/devFlow/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-1.5%20Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev)

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client ["Next.js Frontend (@devflow/web)"]
        UI_Dash[Executive Dashboard]
        UI_KB[Live Kanban Board]
        UI_Chat[Real-Time Team Chat]
        UI_AI[AI Coding Assistant]
        UI_GH[GitHub Integration Hub]
        UI_Act[Audit Log Timeline]
        
        SocketClient[Socket.IO Client]
        APIClient[Axios/Fetch API Client]
        
        UI_Dash & UI_KB & UI_Chat & UI_AI & UI_GH & UI_Act --> APIClient
        UI_KB & UI_Chat & UI_Dash --> SocketClient
    end

    subgraph Backend ["Express + Socket.IO Server (@devflow/server)"]
        Router[Express REST API]
        RateLimiter[Redis Sliding-Window Rate Limiter]
        AuthMW[JWT Auth & RBAC Middleware]
        
        SocketServer[Socket.IO Server]
        PresenceMgr[In-Memory Presence Tracker]
        
        CacheService[Redis Cache Layer]
        CryptoUtil[AES-256-GCM Token Encryption]
        Sanitizer[Credential & Secret Redactor]
        
        AIService[Gemini AI Service]
        GHService[GitHub REST API Client]
        AuditService[Activity / Audit Logger]
        BullMQProd[BullMQ Job Producers]
    end

    subgraph Workers ["BullMQ Workers (@devflow/server)"]
        W_AI[AI Queue Worker]
        W_Notif[Notification Queue Worker]
        W_GH[GitHub Sync Queue Worker]
        W_Anal[Analytics Aggregation Worker]
    end

    subgraph Storage ["Database & Storage"]
        Redis[(Redis 7)]
        Postgres[(PostgreSQL 16 + Prisma)]
    end

    APIClient --> RateLimiter --> Router --> AuthMW
    SocketClient <--> SocketServer <--> PresenceMgr
    
    AuthMW --> CacheService <--> Redis
    AuthMW --> AIService --> Sanitizer
    AuthMW --> GHService --> CryptoUtil
    AuthMW --> AuditService --> Postgres
    AuthMW --> BullMQProd --> Redis
    
    Redis --> W_AI & W_Notif & W_GH & W_Anal
    W_AI & W_Notif & W_GH & W_Anal --> Postgres
    
    Router -- "Broadcast Events" --> SocketServer
    SocketServer -- "Push to organization:<orgId> or user:<userId>" --> SocketClient
```

---

## 2. Features Breakdown

- **Multi-Tenant Workspaces**: Organization-based tenancy with dedicated slugs, member rosters, and role-based access control.
- **Granular RBAC**: Strict permission enforcement (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`).
- **Interactive Kanban Board**: Column-based sprint boards (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with drag/drop reordering, instant optimistic updates, and multi-user sync.
- **Real-Time Collaboration**: Instant Socket.IO broadcasting for task events, comment threads, team chat, user-targeted notifications, and multi-tab presence.
- **AI Coding Assistant**: Integrated Google Gemini 1.5 Flash assistant with pre-flight credential redaction, contextual code attachment, test generation, and bug fixing.
- **GitHub Repository Sync**: AES-256-GCM encrypted OAuth tokens at rest, zero frontend leakage, live branch/commit history, pull request status pills, and open issues viewer.
- **Redis Caching & Sliding-Window Rate Limiting**: Intelligent read-through caching with automatic invalidation on mutations and sliding-window rate limiters.
- **BullMQ Background Processing**: Multi-queue setup (`ai`, `notifications`, `github`, `analytics`) with exponential backoff retries.
- **Organization Audit Trail**: Comprehensive audit logs capturing workspace lifecycle events with automatic secret redaction.
- **Containerized Deployment**: Multi-stage production `Dockerfile`s and `docker-compose.yml` for turnkey local orchestration.

---

## 3. Monorepo Structure

```
devFlow/
├── apps/
│   ├── server/               # Express + Socket.IO + BullMQ backend
│   │   ├── src/
│   │   │   ├── controllers/  # REST route controllers
│   │   │   ├── jobs/         # BullMQ queues & worker processors
│   │   │   ├── middleware/   # JWT Auth, RBAC & Redis rate limiters
│   │   │   ├── routes/       # Express route definitions
│   │   │   ├── services/     # Business logic, Redis cache & GitHub/AI clients
│   │   │   ├── socket/       # Socket.IO handlers & presence tracking
│   │   │   └── utils/        # AES-256-GCM crypto & secret sanitizer
│   │   └── Dockerfile        # Multi-stage server container
│   └── web/                  # Next.js 16 App Router frontend
│       ├── src/
│       │   ├── app/          # App Router pages (/dashboard, /github, /settings, etc.)
│       │   ├── components/   # KanbanBoard, AIAssistant, TeamChat, Navbar, etc.
│       │   ├── context/      # AuthContext & CollaborationContext
│       │   └── lib/          # API client & Socket.IO client
│       └── Dockerfile        # Multi-stage web container
├── packages/
│   ├── database/             # Prisma schema, migrations & seed scripts
│   └── shared/               # Shared TypeScript interfaces & utilities
├── docs/
│   └── API.md                # Comprehensive API and WebSocket reference
├── .github/workflows/
│   └── ci.yml                # Automated CI pipeline
└── docker-compose.yml        # Orchestration for PostgreSQL, Redis, Server & Web
```

---

## 4. Quickstart & Local Development

### Prerequisites
- Node.js `20.x` or higher
- pnpm `11.x` (`corepack enable && corepack prepare pnpm@11.25.0 --activate`)
- PostgreSQL `16` & Redis `7` (or Docker)

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/roniwalAMAN/devFlow.git
cd devFlow

# 2. Copy environment template
cp .env.example .env

# 3. Start entire stack in containers
docker compose up --build
```

Access the application:
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health/full`

---

### Option B: Local Setup with pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local

# 3. Run database migrations & seed demo data
pnpm --filter @devflow/database prisma:migrate
pnpm --filter @devflow/database seed

# 4. Start backend & frontend dev servers concurrently
pnpm dev
```

---

## 5. Demo Credentials

The database seed initializes standard demo accounts for evaluation:

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Alex Mercer** | `OWNER` | `alex@devflow.io` | `Password123!` |
| **Charlie Davis** | `ADMIN` | `charlie@devflow.io` | `Password123!` |
| **Bob Smith** | `DEVELOPER` | `bob@devflow.io` | `Password123!` |
| **Dana Lee** | `VIEWER` | `dana@devflow.io` | `Password123!` |

---

## 6. Environment Variables Reference

See [.env.example](file:///Users/amanroniwal/Desktop/devFlow/.env.example) for the complete list:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://devflow:devflow_secret@localhost:5432/devflow?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | Express backend port | `3001` |
| `CLIENT_URL` | Next.js frontend origin | `http://localhost:3000` |
| `JWT_SECRET` | Secret key for signing access tokens | `devflow-super-secret-jwt-key-for-local-dev-min-32-chars` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `devflow-super-secret-jwt-refresh-key-local-32-chars` |
| `ENCRYPTION_SECRET` | 32-byte hex key for AES-256-GCM token encryption | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| `GEMINI_API_KEY` | Google Gemini AI API key | `AIzaSy...` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | `Iv1...` |
| `GITHUB_CLIENT_SECRET`| GitHub OAuth App Client Secret | `...` |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL | `http://localhost:3001/api/github/callback` |

---

## 7. Automated Testing & Verification

```bash
# Typecheck all workspaces
pnpm --filter @devflow/server type-check

# Run Next.js production build
pnpm --filter @devflow/web build

# Run database validation
pnpm --filter @devflow/database prisma:validate

# Execute integration test suite
npx tsx scratch/test_final_pass.ts
```

---

## 8. Security & Engineering Best Practices

- **Zero Token Leakage**: GitHub OAuth tokens are encrypted at rest using AES-256-GCM and never exposed to the frontend or API responses.
- **Pre-Flight AI Sanitization**: Regex sanitization scrubs passwords, database URIs, Bearer tokens, GitHub PATs, and private keys before dispatching to the Gemini API.
- **Sliding-Window Rate Limiting**: Built on Redis to safeguard sensitive auth, AI, and GitHub proxy routes against abuse.
- **Graceful Error Degradation**: Outages in Redis, BullMQ, Gemini, or GitHub API will degrade cleanly without crashing the Node.js process.
- **Audit Logging**: Comprehensive, sanitized activity logging on all workspace mutations.

---

## 9. License

ISC License. Built for engineering teams and portfolio demonstration.
