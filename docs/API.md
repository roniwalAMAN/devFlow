# DevFlow API Reference

This document provides a comprehensive reference for the DevFlow REST API and Socket.IO real-time events.

---

## 1. Authentication Endpoints

Base URL: `/api/auth`

| Method | Endpoint | Auth Required | Purpose | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | No | Register new user account | `{ "name": "Alex", "email": "alex@devflow.io", "password": "Password123!" }` | `201 Created` with tokens & user profile |
| `POST` | `/login` | No | Authenticate user with password | `{ "email": "alex@devflow.io", "password": "Password123!" }` | `200 OK` with `accessToken`, `refreshToken`, user |
| `POST` | `/refresh` | No | Rotate expired access token | `{ "refreshToken": "..." }` | `200 OK` with new `accessToken`, `refreshToken` |
| `POST` | `/logout` | No | Revoke active refresh token | `{ "refreshToken": "..." }` | `200 OK` `{ "success": true }` |
| `GET` | `/me` | Yes (Bearer) | Get current authenticated user profile | None | `200 OK` `{ "success": true, "data": { "user": {...} } }` |

---

## 2. Organization Endpoints

Base URL: `/api/organizations`

| Method | Endpoint | RBAC Required | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | Authenticated | Create a new organization | `{ "name": "Acme Engineering" }` |
| `GET` | `/` | Authenticated | List all organizations user belongs to | None |
| `GET` | `/:organizationId` | Member | Get organization details and member roster | None |
| `POST` | `/:organizationId/members` | OWNER, ADMIN | Directly add member to organization | `{ "email": "bob@devflow.io", "role": "DEVELOPER" }` |
| `DELETE` | `/:organizationId/members/:userId` | OWNER, ADMIN | Remove member from organization | None |
| `PATCH` | `/:organizationId/members/:userId/role` | OWNER, ADMIN | Update member role | `{ "role": "ADMIN" }` |

---

## 3. Organization Invites

Base URL: `/api/organizations/:organizationId/invites` & `/api/invites`

| Method | Endpoint | RBAC Required | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/:organizationId/invites` | OWNER, ADMIN | Send organization invite | `{ "email": "dev@company.com", "role": "DEVELOPER" }` |
| `GET` | `/:organizationId/invites` | OWNER, ADMIN | List pending invites | None |
| `DELETE` | `/:organizationId/invites/:inviteId` | OWNER, ADMIN | Revoke pending invite | None |
| `POST` | `/:organizationId/invites/:inviteId/resend` | OWNER, ADMIN | Resend invite notification | None |
| `POST` | `/api/invites/:token/accept` | Authenticated | Accept invite token | None |

---

## 4. Projects Endpoints

Base URL: `/api/organizations/:organizationId/projects`

| Method | Endpoint | RBAC Required | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | OWNER, ADMIN, DEVELOPER | Create a sprint project | `{ "name": "Cloud Platform", "description": "..." }` |
| `GET` | `/` | Member | List organization projects | None |
| `GET` | `/:projectId` | Member | Get project details & creator info | None |
| `PATCH` | `/:projectId` | OWNER, ADMIN, DEVELOPER | Update project metadata/slug | `{ "name": "New Name", "description": "..." }` |
| `DELETE` | `/:projectId` | OWNER, ADMIN | Delete project & cascade tasks | None |

---

## 5. Tasks & Kanban Endpoints

Base URL: `/api/organizations/:organizationId/projects/:projectId/tasks`

| Method | Endpoint | RBAC Required | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | OWNER, ADMIN, DEVELOPER | Create a new task | `{ "title": "Setup Redis", "status": "TODO", "priority": "HIGH" }` |
| `GET` | `/` | Member | List all project tasks | None |
| `GET` | `/:taskId` | Member | Get task details by ID | None |
| `PATCH` | `/:taskId` | OWNER, ADMIN, DEVELOPER | Partial task update | `{ "title": "Updated", "priority": "URGENT", "assigneeId": "..." }` |
| `PATCH` | `/:taskId/move` | OWNER, ADMIN, DEVELOPER | Move/reorder Kanban position | `{ "status": "IN_PROGRESS", "position": 1 }` |
| `DELETE` | `/:taskId` | OWNER, ADMIN | Delete task | None |

---

## 6. Task Comments Endpoints

Base URL: `/api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments`

| Method | Endpoint | Authorization | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | Member | Post a comment on a task | `{ "content": "Latency benchmark looks great." }` |
| `GET` | `/` | Member | List task comments chronologically | None |
| `PATCH` | `/:commentId` | Comment Author | Edit own comment | `{ "content": "Updated review notes." }` |
| `DELETE` | `/:commentId` | Author, OWNER, ADMIN | Delete comment | None |

---

## 7. Real-Time Team Chat

Base URL: `/api/organizations/:organizationId/chat/messages`

| Method | Endpoint | RBAC Required | Purpose | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | Member | Broadcast chat message to org room | `{ "content": "Sprint planning starting now." }` |
| `GET` | `/` | Member | Get chronological chat history | None |

---

## 8. Notifications Endpoints

Base URL: `/api/notifications`

| Method | Endpoint | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Authenticated | List notifications for authenticated user |
| `PATCH` | `/:id/read` | Authenticated | Mark a single notification as read |
| `PATCH` | `/read-all` | Authenticated | Mark all notifications as read |

---

## 9. GitHub Integration Endpoints

Base URL: `/api/github` & `/api/organizations/:id/projects/:id/github`

| Method | Endpoint | Purpose | Security |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/github/connect` | Initiates OAuth flow | Redirects to GitHub OAuth |
| `GET` | `/api/github/callback` | OAuth callback & token encryption | AES-256-GCM encryption at rest |
| `GET` | `/api/github/me` | Current GitHub connection status | Zero token leakage |
| `DELETE` | `/api/github/disconnect` | Unlinks GitHub account | Deletes stored credentials |
| `POST` | `.../projects/:id/github/repository` | Link repository to project | OWNER, ADMIN |
| `GET` | `.../projects/:id/github/repository` | Get repository details | Cached in Redis |
| `GET` | `.../projects/:id/github/commits` | Get recent commit history | Rate limited (60 req/min) |
| `GET` | `.../projects/:id/github/pulls` | Get pull requests with status pills | Rate limited |
| `GET` | `.../projects/:id/github/issues` | Get open repository issues | Rate limited |
| `DELETE` | `.../projects/:id/github/repository` | Unlink repository | OWNER, ADMIN |

---

## 10. AI Coding Assistant Endpoint

Base URL: `/api/ai/assistant`

- **Method**: `POST`
- **Rate Limit**: 20 requests / minute
- **Security**: Authenticated user, organization membership validation on project/task context, automated credential redaction.

### Request Body:
```json
{
  "prompt": "How do I optimize this query and prevent race conditions?",
  "context": {
    "projectId": "clx...",
    "taskId": "clx...",
    "code": "async function moveTask() { ... }",
    "language": "typescript"
  }
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "answer": "To prevent race conditions during position updates...",
    "suggestions": [
      "Wrap reordering logic in a Prisma interactive transaction",
      "Add composite index on [projectId, status, position]",
      "Use Redis distributed lock for high-concurrency columns"
    ]
  }
}
```

---

## 11. Activity & Audit Log Endpoint

- **Method**: `GET /api/organizations/:organizationId/activity?limit=50&offset=0`
- **RBAC**: `OWNER`, `ADMIN`
- **Output**: Chronological audited event timeline with actor details, action badges, and sanitized JSON metadata.

---

## 12. Health Check Endpoints

| Method | Endpoint | Output | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | `{ "status": "ok" }` | Basic API liveness |
| `GET` | `/api/health/db` | `{ "service": "database", "status": "ok" }` | PostgreSQL connection health |
| `GET` | `/api/health/redis` | `{ "service": "redis", "status": "ok" }` | Redis connection health |
| `GET` | `/api/health/full` | Full service status & uptime | Production container healthcheck |

---

## 13. Socket.IO Real-Time Events Matrix

| Event Name | Scope / Target Room | Trigger Action | Payload Content |
| :--- | :--- | :--- | :--- |
| `task:created` | `organization:<orgId>` | Task created | `{ organizationId, projectId, task }` |
| `task:updated` | `organization:<orgId>` | Task updated | `{ organizationId, projectId, task }` |
| `task:moved` | `organization:<orgId>` | Task moved/reordered | `{ organizationId, projectId, task, affectedTaskIds }` |
| `task:deleted` | `organization:<orgId>` | Task deleted | `{ organizationId, projectId, taskId }` |
| `comment:created`| `organization:<orgId>` | Comment created | `{ organizationId, projectId, taskId, comment }` |
| `comment:updated`| `organization:<orgId>` | Comment updated | `{ organizationId, projectId, taskId, comment }` |
| `comment:deleted`| `organization:<orgId>` | Comment deleted | `{ organizationId, projectId, taskId, commentId }` |
| `chat:message` | `organization:<orgId>` | Chat message sent | `{ organizationId, message }` |
| `notification:new` | `user:<userId>` | Task/comment trigger | `{ notification }` |
| `notification:read`| `user:<userId>` | Single read | `{ notificationId, readAt }` |
| `notification:read-all`| `user:<userId>`| All read | `{ readAt }` |
| `presence:online`| `organization:<orgId>` | User connects | `{ userId, organizationId }` |
| `presence:offline`| `organization:<orgId>` | User disconnects | `{ userId, organizationId }` |
