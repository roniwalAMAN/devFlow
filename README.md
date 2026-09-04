# DevFlow

A developer collaboration platform for project management, real-time collaboration, and team communication.

## Project Structure

```
devflow/
├── apps/
│   ├── web/              # Next.js frontend application
│   └── server/           # Express.js backend API
├── packages/
│   ├── database/         # Database layer (future: Prisma)
│   └── shared/           # Shared types and utilities
├── pnpm-workspace.yaml   # pnpm monorepo configuration
└── package.json          # Root package.json
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js, TypeScript
- **Package Manager**: pnpm
- **Architecture**: pnpm monorepo with workspaces

## Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm 8+ ([install pnpm](https://pnpm.io/installation))

## Setup

### 1. Install dependencies

```bash
pnpm install
```

This command will install dependencies for all workspaces (frontend, backend, and packages).

### 2. Create environment file

```bash
cp .env.example .env.local
```

## Development

### Run both frontend and backend concurrently

```bash
pnpm dev
```

This runs both applications in parallel:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### Run frontend only

```bash
cd apps/web
pnpm dev
```

Frontend will be available at: http://localhost:3000

### Run backend only

```bash
cd apps/server
pnpm dev
```

Backend will be available at: http://localhost:3001

### Test the API

Once the backend is running, test the health endpoint:

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "DevFlow API is running"
}
```

## Building

### Build all workspaces

```bash
pnpm build
```

### Build specific workspace

```bash
cd apps/web
pnpm build
```

or

```bash
cd apps/server
pnpm build
```

## Available Scripts

### Root level

- `pnpm dev` - Run all apps in development mode
- `pnpm build` - Build all workspaces
- `pnpm start` - Start all built applications

### Frontend (apps/web)

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Backend (apps/server)

- `pnpm dev` - Start Express server with hot reload
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Start compiled server
- `pnpm type-check` - Check TypeScript types

## Project Status

✅ Basic monorepo structure initialized
✅ Next.js frontend with TypeScript and Tailwind CSS
✅ Express backend with TypeScript
✅ pnpm workspaces configured
✅ Health check endpoint (/api/health)

### Coming Soon

- Authentication & Authorization
- Database (PostgreSQL + Prisma)
- Project Management API
- Kanban Board
- Real-time Collaboration
- Team Chat
- GitHub Integration
- AI Coding Assistant
- Notifications
- Analytics

## Development Notes

- Each application is isolated but part of the same monorepo
- Shared packages can be imported by prefixing with `@devflow/` (e.g., `@devflow/shared`)
- TypeScript is configured for strict mode across all workspaces
- Environment variables are configured via `.env.local`

## License

MIT
