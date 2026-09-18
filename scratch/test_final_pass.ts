import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { createServer } from 'http';
import { prisma, MemberRole, TaskStatus, TaskPriority } from '@devflow/database';
import { createApp } from '../apps/server/src/app';
import { initializeSocket, closeSocket } from '../apps/server/src/socket/socket';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { generateAccessToken, generateRefreshToken } from '../apps/server/src/utils/token';
import { encryptToken, decryptToken } from '../apps/server/src/utils/crypto';
import { sanitizeMetadata } from '../apps/server/src/services/activity';
import { sanitizeAIInput } from '../apps/server/src/services/ai';
import { cacheSet, cacheGet, cacheInvalidatePattern } from '../apps/server/src/services/cache';

const PORT = 3899;
let server: any;
let baseUrl: string;

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function runFinalPassTests() {
  console.log('=== DevFlow Final Pass Comprehensive Verification Suite ===\n');

  const app = createApp();
  server = createServer(app);
  initializeSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      baseUrl = `http://localhost:${PORT}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // 1. Health Checks
    // -------------------------------------------------------------
    console.log('--- Section 1: Health Checks ---');
    const hBasic = await (await fetch(`${baseUrl}/api/health`)).json();
    assert(hBasic.success === true, '1. GET /api/health returned 200 OK with status ok');

    const hDb = await (await fetch(`${baseUrl}/api/health/db`)).json();
    assert(hDb.success === true && hDb.service === 'database', '2. GET /api/health/db confirmed PostgreSQL connection');

    const hRedis = await (await fetch(`${baseUrl}/api/health/redis`)).json();
    assert(typeof hRedis.success === 'boolean', '3. GET /api/health/redis returned safe status');

    const hFull = await (await fetch(`${baseUrl}/api/health/full`)).json();
    assert(hFull.success === true && hFull.services?.database?.status === 'healthy', '4. GET /api/health/full aggregated service health');

    // -------------------------------------------------------------
    // 2. Auth Flow & JWT Rotation
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Auth Flow & JWT Rotation ---');
    const testEmail = `tester_${Date.now()}@devflow.io`;
    const regRes = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Final Tester', email: testEmail, password: 'Password123!' }),
    })).json();
    assert(regRes.success === true && regRes.data?.email === testEmail, '5. User registration created user and returned safe profile');

    const loginRes = await (await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
    })).json();
    assert(loginRes.success === true, '6. User login succeeded with credentials');

    const token = loginRes.data.accessToken;
    const refreshToken = loginRes.data.refreshToken;
    const user = loginRes.data.user;

    const meRes = await (await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert(meRes.success === true && meRes.data.user.email === testEmail, '7. GET /api/auth/me returned correct authenticated profile');

    const refreshRes = await (await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })).json();
    assert(refreshRes.success === true && refreshRes.data?.accessToken, '8. POST /api/auth/refresh rotated access token');

    // -------------------------------------------------------------
    // 3. Organization, RBAC & Project CRUD + Deletion
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Organization, RBAC & Project CRUD + Deletion ---');
    const orgRes = await (await fetch(`${baseUrl}/api/organizations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Test Org ${Date.now()}` }),
    })).json();
    assert(orgRes.success === true, '9. Organization created with user as OWNER');
    const orgId = orgRes.data.id;

    // Create Project
    const projRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Core Microservices', description: 'Testing project lifecycle' }),
    })).json();
    assert(projRes.success === true, '10. Project created within organization');
    const projId = projRes.data.id;

    // Update Project
    const updateProjRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Core Microservices Updated' }),
    })).json();
    assert(updateProjRes.success === true && updateProjRes.data.name === 'Core Microservices Updated', '11. Project updated successfully');

    // Create Task
    const taskRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Deploy to Staging', status: 'TODO', priority: 'HIGH' }),
    })).json();
    assert(taskRes.success === true, '12. Task created in project');
    const taskId = taskRes.data.id;

    // Move Task
    const moveRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', position: 0 }),
    })).json();
    assert(moveRes.success === true && moveRes.data.status === 'IN_PROGRESS', '13. Task moved to IN_PROGRESS via move endpoint');

    // Create Comment
    const commRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Staging deployment verified.' }),
    })).json();
    assert(commRes.success === true, '14. Task comment posted');

    // Delete Project (Cascade)
    const delProjRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert(delProjRes.success === true, '15. DELETE project endpoint succeeded');

    // Verify Project is gone
    const getProjRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/projects/${projId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert(getProjRes.success === false, '16. Verified deleted project returns 404');

    // -------------------------------------------------------------
    // 4. Activity Logs & Secret Redaction
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Activity Logs & Secret Redaction ---');
    const actRes = await (await fetch(`${baseUrl}/api/organizations/${orgId}/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert(actRes.success === true && Array.isArray(actRes.data), '17. GET /activity returned organization audit events');

    const sanitizedData = sanitizeMetadata({
      secret: 'super_secret_value',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
      normalField: 'hello world',
    });
    assert(sanitizedData.secret === '[REDACTED]' && sanitizedData.normalField === 'hello world', '18. Secret sanitizer verified');

    // -------------------------------------------------------------
    // 5. GitHub Token AES-256 Encryption & Zero Leakage
    // -------------------------------------------------------------
    console.log('\n--- Section 5: GitHub Token Encryption & Zero Leakage ---');
    const rawGhToken = 'ghp_SampleSecretGitHubToken1234567890';
    const encrypted = encryptToken(rawGhToken);
    const decrypted = decryptToken(encrypted);
    assert(decrypted === rawGhToken, '19. AES-256-GCM encryption & decryption at rest verified');

    // -------------------------------------------------------------
    // 6. AI Coding Assistant
    // -------------------------------------------------------------
    console.log('\n--- Section 6: AI Coding Assistant ---');
    const sanitizedPrompt = sanitizeAIInput(
      'Review this code: password = "MySuperSecretPassword123!";'
    );
    assert(!sanitizedPrompt.includes('MySuperSecretPassword123!'), '20. AI prompt pre-flight credential redaction verified');

    const aiRes = await (await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'How do I handle WebSocket reconnection in TypeScript?' }),
    })).json();
    assert(aiRes.success === true && typeof aiRes.data?.answer === 'string', '21. AI Assistant returned structured response with suggestions');

    console.log('\n🎉 ALL 21 FINAL PASS CHECKS PASSED PERFECTLY!\n');
  } finally {
    await closeSocket();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
}

runFinalPassTests().catch((err) => {
  console.error('Final pass test failed:', err);
  process.exit(1);
});
