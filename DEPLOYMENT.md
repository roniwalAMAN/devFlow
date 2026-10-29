# DevFlow Production Deployment Guide (Vercel + Render Architecture)

This document provides exact, production-grade instructions for deploying DevFlow with the following architecture:

- **Frontend Client**: Vercel (`apps/web`, Next.js 16 App Router)
- **Backend API & Real-time Server**: Render Web Service (`apps/server`, Express + persistent Socket.IO)
- **Background Job Processor**: Render Background Worker (or unified within Web Service via `RUN_WORKERS=true`)
- **Database**: Managed PostgreSQL 16 (Neon, Supabase, AWS RDS, or Render PostgreSQL)
- **Cache & Message Broker**: Managed Redis 7 (Upstash, Redis Cloud, Aiven, or Render Redis)
- **Source Control**: GitHub Monorepo (`pnpm` workspaces)

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │              Client Browser             │
                      └─────────────┬─────────────────────┬─────┘
                                    │                     │
                     HTTPS (Static) │                     │ WSS / HTTPS (API & Real-time)
                                    ▼                     ▼
             ┌──────────────────────────────┐    ┌─────────────────────────────────┐
             │            Vercel            │    │             Render              │
             │          (apps/web)          │    │          (apps/server)          │
             │    Next.js 16 App Router     │    │      Express + Socket.IO 4      │
             │   Static Assets & Hydration  │    │      Persistent Web Service     │
             └──────────────────────────────┘    └────────┬───────────────┬────────┘
                                                          │               │
                                           Queries / ORM  │               │ Events & Queues
                                                          ▼               ▼
                                           ┌────────────────────┐   ┌────────────────────┐
                                           │ Managed PostgreSQL │   │   Managed Redis    │
                                           │    (Prisma ORM)    │   │  (BullMQ + Cache)  │
                                           └────────────────────┘   └─────────┬──────────┘
                                                                              │
                                                                 Job Consumer │
                                                                              ▼
                                                                    ┌────────────────────┐
                                                                    │   Render Worker    │
                                                                    │ (apps/server/dist/ │
                                                                    │     worker.js)     │
                                                                    │ (Optional Separate)│
                                                                    └────────────────────┘
```

---

## 1. Prerequisites & Cryptographic Secret Generation

Before configuring hosting providers, generate secure production secrets locally on your workstation.

```bash
# 1. Generate 32-byte (base64) JWT Secret for short-lived access tokens
openssl rand -base64 32

# 2. Generate 32-byte (base64) JWT Refresh Secret for long-lived session tokens
openssl rand -base64 32

# 3. Generate exactly 64 hexadecimal characters (32 bytes) for AES-256-GCM encryption
# Used to encrypt sensitive GitHub OAuth access tokens at rest in PostgreSQL
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save these generated values in a temporary, secure password manager. **Never commit them to Git.**

---

## 2. Provisioning Managed PostgreSQL & Redis

### Step 2.1: Provision Managed PostgreSQL
1. Provision a PostgreSQL 16+ database from your preferred provider (Neon, Supabase, Render Postgres, AWS RDS, etc.).
2. Obtain the standard connection URI:
   ```
   postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslmode=require
   ```
3. **Connection Pooling Guidance**:
   - If using Supabase / Neon with connection poolers (e.g. pgBouncer on port `6543`), Prisma migrations require the direct connection (port `5432`). In your `DATABASE_URL`, use the pooled connection for standard queries and define `DIRECT_URL` if using Prisma CLI directly, or simply point `DATABASE_URL` to the direct session pooler port for Render services.

### Step 2.2: Provision Managed Redis
1. Provision a Redis 7+ instance (Render Redis, Upstash, Redis Cloud, Aiven, etc.).
2. BullMQ requires standard Redis command support (including `EVAL`, `XADD`, `SUBSCRIBE`).
3. If TLS is required by your provider, prefix the connection URI with `rediss://`:
   ```
   rediss://default:<PASSWORD>@<HOST>:<PORT>
   ```

---

## 3. GitHub Repository Preparation & Pushing

Ensure your local repository is up to date and clean before pushing:

```bash
# 1. Verify working directory is clean
git status

# 2. Run local type checks and regression tests
pnpm type-check
pnpm test

# 3. Validate Prisma schema
pnpm prisma:validate

# 4. Push changes to GitHub
git add .
git commit -m "chore: prepare repository for Vercel and Render deployment"
git push origin main
```

---

## 4. Render Backend Web Service Setup

Render hosts the persistent Node.js Express server and persistent Socket.IO WebSocket server.

### Step 4.1: Create Render Web Service
1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository (`devFlow`).
4. Select the `main` branch.
5. Configure the following service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `devflow-api` |
| **Region** | Choose the region closest to your PostgreSQL database (e.g., Oregon, Frankfurt) |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install && pnpm --filter @devflow/shared build && pnpm --filter @devflow/database prisma:generate && pnpm --filter @devflow/database build && pnpm --filter @devflow/server build` |
| **Start Command** | `pnpm --filter @devflow/server start` |
| **Plan Type** | Starter or Standard (Persistent instance required for Socket.IO WebSockets) |

### Step 4.2: Configure Health Check Path
In Render Web Service settings:
- **Health Check Path**: `/api/health`

### Step 4.3: Add Environment Variables in Render
Under the **Environment** tab of the Web Service, add the following variables:

| Key | Example / Format | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production security and error handling |
| `PORT` | `10000` | Render assigns `PORT` automatically; Express respects `process.env.PORT` |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Allowed CORS origins. Comma-separated if adding custom domains. |
| `DATABASE_URL` | `postgresql://...` | Connection URI to managed PostgreSQL |
| `REDIS_URL` | `rediss://...` | Connection URI to managed Redis |
| `JWT_SECRET` | *(Generated 32-byte string)* | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | *(Generated 32-byte string)* | Secret for validating refresh tokens |
| `JWT_EXPIRES_IN` | `15m` | Lifetime of access tokens |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Lifetime of refresh tokens |
| `ENCRYPTION_SECRET` | *(Generated 64 hex characters)* | AES-256-GCM symmetric key for OAuth tokens |
| `GITHUB_CLIENT_ID` | `Iv1...` | GitHub OAuth client ID (configured in Step 7) |
| `GITHUB_CLIENT_SECRET` | `...` | GitHub OAuth client secret |
| `GITHUB_CALLBACK_URL` | `https://devflow-api.onrender.com/api/github/callback` | Render backend URL + callback path |
| `GEMINI_API_KEY` | `AIzaSy...` | Google AI Studio API key |
| `RUN_WORKERS` | `true` | Runs BullMQ workers inside Express (set `false` if using Step 5) |

Click **Save Changes** and deploy the web service. Note the assigned public URL (e.g. `https://devflow-api.onrender.com`).

---

## 5. Background Jobs & Worker Strategy

### Strategy A: Unified In-Process Worker (Default & Recommended for Single-Instance)
- By leaving `RUN_WORKERS=true` (or unset), BullMQ background workers for notifications, GitHub sync, and AI jobs run directly inside the Render Web Service process.
- No additional worker service or billing cost is needed.
- `initWorkers()` has built-in idempotency protection to prevent duplicate worker instances.

### Strategy B: Dedicated Render Background Worker (For Horizontal Scaling)
If you scale the Render Web Service to multiple instances, each web instance would otherwise compete for jobs. To separate web traffic from background jobs:
1. In the Web Service environment, set `RUN_WORKERS=false`.
2. In the Render Dashboard, click **New +** > **Background Worker**.
3. Select your repository (`devFlow`).
4. Configure:
   - **Name**: `devflow-worker`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm --filter @devflow/shared build && pnpm --filter @devflow/database prisma:generate && pnpm --filter @devflow/database build && pnpm --filter @devflow/server build`
   - **Start Command**: `pnpm --filter @devflow/server run worker`
5. Configure Environment Variables for the worker:
   - `NODE_ENV=production`
   - `DATABASE_URL` (same as backend)
   - `REDIS_URL` (same as backend)
   - `ENCRYPTION_SECRET` (same as backend)
   - `GEMINI_API_KEY` (same as backend)

---

## 6. Running Safe Database Migrations

> [!CAUTION]
> Never run `prisma migrate dev` or `prisma db push --force-reset` on production. These commands can drop tables or erase live records.

### Non-Destructive Migration Command
The safe, non-destructive deployment migration command is:
```bash
pnpm prisma:migrate
```
*(Under the hood, this executes `prisma migrate deploy --schema packages/database/prisma/schema.prisma`, which inspects pending migration files and applies only unapplied migrations safely in sequence).*

### How to Apply Production Migrations:

#### Option 1: Automated via Render Pre-Deploy Command (Recommended)
1. In the Render Dashboard for your web service (`devflow-api`), go to **Settings**.
2. Scroll to the **Pre-Deploy Command** field.
3. Enter:
   ```bash
   pnpm prisma:migrate
   ```
4. Save Changes. Render will now automatically run pending migrations before every deployment and halt if a migration fails.

#### Option 2: Automated via Render Start Command
Alternatively, update the **Start Command** in Render Web Service settings to run migrations before starting Node:
```bash
pnpm prisma:migrate && pnpm --filter @devflow/server start
```

#### Option 3: Manual via Render Web Service Shell
1. In the Render Dashboard for `devflow-api`, navigate to the **Shell** tab.
2. Run:
   ```bash
   pnpm prisma:migrate
   ```
3. Once completed, your PostgreSQL database will contain all 13 core tables, and registration/login will immediately work.

#### Option 4: Via Local Machine targeting Production Database
```bash
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>?sslmode=require" pnpm prisma:migrate
```

---

## 7. GitHub OAuth Application Configuration

To enable developer repository and issue integration:

1. Go to [GitHub Developer Settings > OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in the parameters:
   - **Application name**: `DevFlow Workspace`
   - **Homepage URL**: `https://your-frontend.vercel.app` (your Vercel frontend URL)
   - **Authorization callback URL**: `https://devflow-api.onrender.com/api/github/callback` (your Render backend URL + `/api/github/callback`)
4. Click **Register application**.
5. Copy the **Client ID** into Render's `GITHUB_CLIENT_ID`.
6. Click **Generate a new client secret** and copy into Render's `GITHUB_CLIENT_SECRET`.

---

## 8. Vercel Frontend Setup (`apps/web`)

The Next.js 16 frontend is isolated and communicates with the backend exclusively via HTTPS and WSS. It does not import `@devflow/database` or `@prisma/client`.

### Step 8.1: Import Project into Vercel
1. Log in to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository (`devFlow`).

### Step 8.2: Configure Monorepo Settings in Vercel
In the project configuration screen:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Next.js` |
| **Root Directory** | Click *Edit* and select `apps/web` |
| **Include files outside the root directory in the Build Step** | **Check / Enable** (required so Vercel resolves `pnpm-lock.yaml` and `pnpm-workspace.yaml` at root) |
| **Build Command** | Leave default or set to `pnpm run build` |
| **Output Directory** | Leave default (`.next`) |
| **Install Command** | Leave default or set to `pnpm install` |

### Step 8.3: Add Environment Variables in Vercel
Under the **Environment Variables** section, add:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://devflow-api.onrender.com` | Base URL of deployed Render backend Express API (no trailing slash) |
| `NEXT_PUBLIC_SOCKET_URL` | `https://devflow-api.onrender.com` | Base URL of deployed Render persistent Socket.IO server (no trailing slash) |

> [!IMPORTANT]
> Next.js inlines `NEXT_PUBLIC_*` variables at **build time**.
> These environment variables must be defined before starting the build. If you update the Render backend domain later, you must trigger a redeployment in Vercel.

### Step 8.4: Deploy Frontend
Click **Deploy**. Vercel will install dependencies, build the Next.js bundle, and publish the project to a URL such as `https://devflow.vercel.app`.

### Step 8.5: Update Backend CORS Allowlist
Now that your Vercel URL is known:
1. Return to the Render Dashboard for `devflow-api`.
2. Under **Environment**, update `CLIENT_URL` with your actual Vercel domain:
   ```
   CLIENT_URL=https://dev-flow-jet-nine.vercel.app
   ```
   *(If you use multiple domains, comma-separate them: `https://dev-flow-jet-nine.vercel.app,https://yourdomain.com` without trailing slashes)*.
3. Save changes so the backend restarts with the updated CORS allowlist.

---

## 9. Post-Deployment Verification & Testing Checklist

Perform these step-by-step verification checks against the deployed application:

### Automated Smoke Test
Run the automated smoke test script against your live Render backend from your local machine:
```bash
API_URL=https://devflow-api.onrender.com pnpm --filter @devflow/server exec tsx ../../scripts/smoke_test.ts
```
The test verifies:
- [x] Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, no `X-Powered-By`)
- [x] Database health (`/api/health/db`) and Redis connectivity (`/api/health/full`)
- [x] User registration, password hashing, and login
- [x] JWT token generation and authentication state (`/api/auth/me`)
- [x] Organization creation and member role assignment
- [x] Project creation, task creation, status updates, and deletion
- [x] Comments, team chat messages, and notification read transitions
- [x] AI Assistant integration and graceful degradation
- [x] 404 security handling on invalid API paths
- [x] Clean test data cleanup

### Manual Frontend End-to-End Checklist
Open your Vercel frontend URL in the browser and test:
1. **Authentication**: Register a new user, log out, and log back in.
2. **Organizations**: Create an organization. Invite a teammate using their email.
3. **RBAC Controls**: Verify that members with `VIEWER` role cannot create tasks or edit organization settings, while `ADMIN` and `OWNER` can.
4. **Real-time Tasks & Kanban**: Open two browser tabs on the same project task board. Create a task in Tab 1 and verify it appears immediately in Tab 2 without refreshing.
5. **Real-time Chat**: Send a message in the organization chat channel and verify instant delivery across tabs.
6. **Presence & Cursors**: Verify online user indicators show active members in the room.
7. **Notifications**: Trigger an assignment or mention and verify the notification bell badge increments in real time.
8. **AI Assistant**: Open the AI Assistant panel, ask for a code review or task summary, and verify the response stream completes cleanly.
9. **GitHub Integration**: Click "Connect GitHub", authorize via OAuth, and verify connected repositories, commits, and pull requests render.

---

## 10. Diagnosing Deployment & WebSocket Errors

### 1. WebSocket / Socket.IO Connection Failures
- **Symptoms**: Browser console shows `WebSocket connection to 'wss://.../socket.io/' failed` or falls back to HTTP long-polling.
- **Root Cause & Fixes**:
  1. Verify `NEXT_PUBLIC_SOCKET_URL` matches your Render service URL exactly (e.g. `https://devflow-api.onrender.com`, without a trailing slash).
  2. Verify `CLIENT_URL` on Render includes your exact Vercel frontend origin (`https://devflow.vercel.app`, without a trailing slash).
  3. Ensure Render service plan is persistent (Free web services spin down after inactivity, dropping WebSocket connections; use Starter or above).

### 2. CORS Errors in Browser (`Origin has been blocked by CORS policy`)
- **Symptoms**: Fetch requests to `/api/*` fail with CORS header missing.
- **Fix**: Check `CLIENT_URL` in Render environment variables. Ensure the protocol (`https://`) and domain match the browser's URL bar exactly. Comma-separate multiple domains if needed.

### 3. IP Rate Limiting Affecting Multiple Users
- **Symptoms**: Unexpected 429 Too Many Requests errors.
- **Fix**: Express has `app.set('trust proxy', 1)` enabled, ensuring Render's `X-Forwarded-For` header provides the true client IP. Ensure no intermediate CDN strips client headers.

### 4. BullMQ / Redis Connection Drops
- **Symptoms**: Render server logs show `[Redis] Redis connection error`.
- **Fix**: Ensure your `REDIS_URL` uses `rediss://` (with two 's's) if your managed Redis provider enforces TLS/SSL.

---

## 11. Backup, Rollback & Disaster Recovery Procedures

### Routine Database Backups
Before executing any schema migration:
```bash
# Dump PostgreSQL database using pg_dump:
pg_dump "postgresql://user:pass@host:5432/devflow?sslmode=require" -Fc -f devflow_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Database Restore Procedure
If data corruption occurs:
```bash
# Restore PostgreSQL database using pg_restore:
pg_restore -d "postgresql://user:pass@host:5432/devflow?sslmode=require" --clean --if-exists devflow_backup_YYYYMMDD_HHMMSS.dump
```

### Frontend Rollback on Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/) > Select project `devFlow`.
2. Navigate to the **Deployments** tab.
3. Locate the previous healthy deployment.
4. Click the three dots (`...`) > **Promote to Production** (instant zero-downtime rollback).

### Backend Rollback on Render
1. Go to the [Render Dashboard](https://dashboard.render.com/) > Select `devflow-api`.
2. Under the **Events** or **Deploys** tab, select the previous successful deploy.
3. Click **Rollback** to revert to the previous container image and code SHA.
