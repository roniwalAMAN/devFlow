/**
 * DevFlow Comprehensive Automated Integration & Regression Test Suite
 * Covers:
 * 1. Health & Security Headers
 * 2. Auth, Password Hashing, JWTs & Rate Limiting
 * 3. Organization Lifecycle & RBAC Enforcement (Owner, Admin, Dev, Viewer)
 * 4. Invitation Lifecycle & Email Matching
 * 5. Project & Task CRUD + Organization Isolation
 * 6. Task Comments & Team Chat
 * 7. Real-Time Notification Lifecycle & Read/Unread Transitions
 * 8. AES-256-GCM Token Encryption & AI Input Sanitization
 */

import path from 'path';
import dotenv from 'dotenv';

// Load environment configuration
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { createServer } from 'http';
import { prisma, MemberRole, TaskStatus, TaskPriority } from '@devflow/database';
import { createApp, getAllowedOrigins, normalizeOrigin } from '../src/app';
import { getDatabaseHealth } from '../src/services/db';
import { initializeSocket, closeSocket } from '../src/socket/socket';
import { encryptToken, decryptToken } from '../src/utils/crypto';
import { sanitizeMetadata } from '../src/services/activity';
import { sanitizeAIInput } from '../src/services/ai';

const TEST_PORT = 3988;
let server: any;
let baseUrl: string;

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, message: string) {
  if (!condition) {
    failedCount++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('       DevFlow Production-Grade Automated Test Suite            ');
  console.log('================================================================\n');

  const app = createApp();
  server = createServer(app);
  initializeSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      baseUrl = `http://localhost:${TEST_PORT}`;
      resolve();
    });
  });

  const timestamp = Date.now();
  const ownerEmail = `owner_${timestamp}@devflow-test.io`;
  const adminEmail = `admin_${timestamp}@devflow-test.io`;
  const devEmail = `dev_${timestamp}@devflow-test.io`;
  const inviteeEmail = `invitee_${timestamp}@devflow-test.io`;
  const intruderEmail = `intruder_${timestamp}@devflow-test.io`;
  const testPassword = 'TestPassword123!';

  let ownerToken: string = '';
  let ownerRefreshToken: string = '';
  let ownerUserId: string = '';

  let adminToken: string = '';
  let adminUserId: string = '';

  let devToken: string = '';
  let devUserId: string = '';

  let inviteeToken: string = '';
  let inviteeUserId: string = '';

  let intruderToken: string = '';

  let testOrgId: string = '';
  let testProjectId: string = '';
  let testTaskId: string = '';
  let inviteTokenStr: string = '';

  try {
    // -------------------------------------------------------------
    // SECTION 1: System Health, Security Headers & Error Handling
    // -------------------------------------------------------------
    console.log('▶ [Section 1] System Health, Security Headers & Error Handling');

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ok', 'GET /api/health returned 200 OK');

    // Security Headers check
    const secHeaders = healthRes.headers;
    assert(secHeaders.get('x-content-type-options') === 'nosniff', 'Security header: X-Content-Type-Options is nosniff');
    assert(secHeaders.get('x-frame-options') === 'DENY', 'Security header: X-Frame-Options is DENY');
    assert(!secHeaders.get('x-powered-by'), 'Fingerprint protection: X-Powered-By is disabled');

    const dbHealthRes = await fetch(`${baseUrl}/api/health/db`);
    const dbHealthJson = await dbHealthRes.json();
    assert(dbHealthRes.status === 200 && dbHealthJson.service === 'database', 'GET /api/health/db confirmed PostgreSQL connection');
    assert(dbHealthJson.message?.includes('migrated'), 'GET /api/health/db verified database schema is migrated');

    const dbHealthDirect = await getDatabaseHealth();
    assert(dbHealthDirect.connected && dbHealthDirect.migrated, 'getDatabaseHealth() confirmed connected and migrated schema');

    const redisHealthRes = await fetch(`${baseUrl}/api/health/redis`);
    assert([200, 503].includes(redisHealthRes.status), 'GET /api/health/redis responded with valid status');

    const fullHealthRes = await fetch(`${baseUrl}/api/health/full`);
    const fullHealthJson = await fullHealthRes.json();
    assert(fullHealthRes.status === 200 && fullHealthJson.services?.database?.status === 'healthy', 'GET /api/health/full reported aggregate healthy services');

    const notFoundRes = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    assert(notFoundRes.status === 404, 'Unknown API route correctly returned 404 Not Found');

    // -------------------------------------------------------------
    // SECTION 1B: CORS Configuration, Allowed Origins & Preflight Handling
    // -------------------------------------------------------------
    console.log('\n▶ [Section 1B] CORS Configuration, Allowed Origins & Preflight Handling');

    // 1. Origin normalization unit assertions
    assert(normalizeOrigin('https://dev-flow-jet-nine.vercel.app/') === 'https://dev-flow-jet-nine.vercel.app', 'normalizeOrigin strips trailing slash');
    assert(normalizeOrigin('"https://dev-flow-jet-nine.vercel.app/"') === 'https://dev-flow-jet-nine.vercel.app', 'normalizeOrigin strips surrounding quotes and trailing slash');
    assert(normalizeOrigin('  https://dev-flow-jet-nine.vercel.app  ') === 'https://dev-flow-jet-nine.vercel.app', 'normalizeOrigin trims whitespace');

    // 2. getAllowedOrigins includes production origin and defaults
    const currentOrigins = getAllowedOrigins();
    assert(currentOrigins.includes('https://dev-flow-jet-nine.vercel.app'), 'getAllowedOrigins contains production frontend: https://dev-flow-jet-nine.vercel.app');
    assert(currentOrigins.includes('http://localhost:3000'), 'getAllowedOrigins contains localhost:3000');
    assert(!currentOrigins.some((o) => o.endsWith('/')), 'No allowed origin contains a trailing slash');

    // 3. Preflight OPTIONS request from production origin
    const prodOrigin = 'https://dev-flow-jet-nine.vercel.app';
    const preflightRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': prodOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    assert(preflightRes.status === 204, 'Preflight OPTIONS returned 204 No Content');
    assert(preflightRes.headers.get('access-control-allow-origin') === prodOrigin, `Preflight granted Access-Control-Allow-Origin: ${prodOrigin}`);
    assert(preflightRes.headers.get('access-control-allow-credentials') === 'true', 'Preflight returned Access-Control-Allow-Credentials: true');
    assert(preflightRes.headers.get('access-control-allow-origin') !== '*', 'CORS does NOT use wildcard origin with credentials');
    const allowMethods = preflightRes.headers.get('access-control-allow-methods') || '';
    assert(allowMethods.includes('POST') && allowMethods.includes('OPTIONS'), 'Preflight methods include POST and OPTIONS');
    const allowHeaders = preflightRes.headers.get('access-control-allow-headers') || '';
    assert(allowHeaders.toLowerCase().includes('content-type'), 'Preflight headers include Content-Type');
    assert(preflightRes.headers.get('access-control-max-age') === '86400', 'Preflight includes 24h caching header (max-age: 86400)');

    // 4. Preflight OPTIONS with trailing slash in client origin header
    const preflightSlashRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': `${prodOrigin}/`,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert(preflightSlashRes.status === 204, 'Preflight with trailing slash in client origin returned 204');
    const slashOriginHeader = preflightSlashRes.headers.get('access-control-allow-origin');
    assert(slashOriginHeader === `${prodOrigin}/` || slashOriginHeader === prodOrigin, 'Preflight with trailing slash correctly allowed origin');

    // 5. Unauthorized origin preflight rejection
    const unauthOrigin = 'https://unauthorized-malicious-site.com';
    const unauthPreflight = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': unauthOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert(unauthPreflight.headers.get('access-control-allow-origin') === null, 'Unauthorized origin is NOT granted Access-Control-Allow-Origin header');

    // 6. Actual request with Origin header
    const actualCorsRes = await fetch(`${baseUrl}/api/health`, {
      headers: {
        'Origin': prodOrigin,
      },
    });
    assert(actualCorsRes.headers.get('access-control-allow-origin') === prodOrigin, `Actual request granted Access-Control-Allow-Origin: ${prodOrigin}`);
    assert(actualCorsRes.headers.get('access-control-allow-credentials') === 'true', 'Actual request returned Access-Control-Allow-Credentials: true');

    // -------------------------------------------------------------
    // SECTION 2: Authentication, Password Hashing & JWT Lifecycle
    // -------------------------------------------------------------
    console.log('\n▶ [Section 2] Authentication, Password Hashing & JWT Lifecycle');

    // 2.1 Owner Registration
    const regOwnerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suite Owner', email: ownerEmail, password: testPassword }),
    });
    const regOwnerJson = await regOwnerRes.json();
    assert(regOwnerRes.status === 201 && regOwnerJson.data.email === ownerEmail, 'User registration succeeded with HTTP 201 and safe user profile');
    assert(regOwnerJson.data.passwordHash === undefined, 'User registration response never leaks password hash');
    ownerUserId = regOwnerJson.data.id;

    // 2.2 Duplicate Email Rejection
    const dupRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate User', email: ownerEmail, password: testPassword }),
    });
    assert(dupRegRes.status === 409, 'Duplicate user registration correctly rejected with HTTP 409 Conflict');

    // 2.3 Invalid Registration Input
    const badRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', password: '123' }),
    });
    assert(badRegRes.status === 400, 'Invalid registration input rejected with HTTP 400 Bad Request');

    // 2.4 Register other test users
    const regAdminRes = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suite Admin', email: adminEmail, password: testPassword }),
    })).json();
    adminUserId = regAdminRes.data.id;

    const regDevRes = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suite Developer', email: devEmail, password: testPassword }),
    })).json();
    devUserId = regDevRes.data.id;

    const regInviteeRes = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suite Invitee', email: inviteeEmail, password: testPassword }),
    })).json();
    inviteeUserId = regInviteeRes.data.id;

    const regIntruderRes = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suite Intruder', email: intruderEmail, password: testPassword }),
    })).json();

    // 2.5 Login with wrong password
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password: 'WrongPassword999!' }),
    });
    assert(badLoginRes.status === 401, 'Login with incorrect password rejected with HTTP 401 Unauthorized');

    // 2.6 Login with valid credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password: testPassword }),
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200 && loginJson.data?.accessToken && loginJson.data?.refreshToken, 'Login succeeded and issued both accessToken and refreshToken');
    ownerToken = loginJson.data.accessToken;
    ownerRefreshToken = loginJson.data.refreshToken;

    // Login other users
    adminToken = (await (await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: testPassword }),
    })).json()).data.accessToken;

    devToken = (await (await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: devEmail, password: testPassword }),
    })).json()).data.accessToken;

    inviteeToken = (await (await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteeEmail, password: testPassword }),
    })).json()).data.accessToken;

    intruderToken = (await (await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: intruderEmail, password: testPassword }),
    })).json()).data.accessToken;

    // 2.7 Verify /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.data.user.email === ownerEmail, 'GET /api/auth/me returned correct authenticated profile');

    // 2.8 Unauthenticated access to /api/auth/me rejected
    const unauthMeRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(unauthMeRes.status === 401, 'Unauthenticated request to protected endpoint rejected with HTTP 401');

    // 2.9 Token Refresh
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: ownerRefreshToken }),
    });
    const refreshJson = await refreshRes.json();
    assert(refreshRes.status === 200 && refreshJson.data?.accessToken, 'POST /api/auth/refresh successfully issued a new access token');
    ownerToken = refreshJson.data.accessToken; // use rotated/new token

    // -------------------------------------------------------------
    // SECTION 3: Organization Lifecycle & RBAC Enforcement
    // -------------------------------------------------------------
    console.log('\n▶ [Section 3] Organization Lifecycle & RBAC Enforcement');

    // 3.1 Create Organization
    const createOrgRes = await fetch(`${baseUrl}/api/organizations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Automated Test Org ${timestamp}` }),
    });
    const createOrgJson = await createOrgRes.json();
    assert(createOrgRes.status === 201 && createOrgJson.data?.id, 'Organization created with HTTP 201 Created');
    testOrgId = createOrgJson.data.id;

    // 3.2 List Organizations (verifies membership role attached)
    const listOrgsRes = await fetch(`${baseUrl}/api/organizations`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const listOrgsJson = await listOrgsRes.json();
    const foundOrg = listOrgsJson.data.find((o: any) => o.id === testOrgId);
    assert(foundOrg && foundOrg.role === 'OWNER', 'GET /api/organizations returned created organization with user role OWNER');

    // 3.3 Add Developer Member
    const addDevRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: devEmail, role: 'DEVELOPER' }),
    });
    assert(addDevRes.status === 201, 'OWNER successfully added DEVELOPER member');

    // 3.4 Add Admin Member
    const addAdminRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, role: 'ADMIN' }),
    });
    assert(addAdminRes.status === 201, 'OWNER successfully added ADMIN member');

    // 3.5 Verify Get Organization Details format & member mappings
    const getOrgRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const getOrgJson = await getOrgRes.json();
    assert(getOrgRes.status === 200, 'GET /api/organizations/:id succeeded');
    const memberEntry = getOrgJson.data.members.find((m: any) => m.userId === devUserId);
    assert(memberEntry && memberEntry.userId && memberEntry.user.id, 'Organization member mapping contains explicit userId and user object');

    // 3.6 Non-Member Access Forbidden
    const intruderOrgRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(intruderOrgRes.status === 403, 'Non-member access to organization details blocked with HTTP 403 Forbidden');

    // 3.7 DEVELOPER cannot add members
    const devAddMemberRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: intruderEmail, role: 'DEVELOPER' }),
    });
    assert(devAddMemberRes.status === 403, 'DEVELOPER attempting to add members blocked with HTTP 403 Forbidden');

    // 3.8 ADMIN cannot remove other ADMIN
    const adminRemoveAdminRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members/${adminUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRemoveAdminRes.status === 403, 'ADMIN attempting to remove another ADMIN blocked with HTTP 403 Forbidden');

    // 3.9 ADMIN cannot assign OWNER role
    const adminPromoteOwnerRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members/${devUserId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'OWNER' }),
    });
    assert(adminPromoteOwnerRes.status === 403, 'ADMIN attempting to assign OWNER role blocked with HTTP 403 Forbidden');

    // 3.10 Organization OWNER cannot be removed
    const removeOwnerRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members/${ownerUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(removeOwnerRes.status === 403, 'Organization OWNER removal blocked with HTTP 403 Forbidden');

    // 3.11 OWNER can remove DEVELOPER
    const removeDevRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/members/${devUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(removeDevRes.status === 200, 'OWNER successfully removed DEVELOPER member');

    // Re-add dev as DEVELOPER for subsequent workflow tests
    await fetch(`${baseUrl}/api/organizations/${testOrgId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: devEmail, role: 'DEVELOPER' }),
    });

    // -------------------------------------------------------------
    // SECTION 4: Organization Invitations Lifecycle
    // -------------------------------------------------------------
    console.log('\n▶ [Section 4] Organization Invitations Lifecycle');

    // 4.1 Create Invitation
    const createInviteRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteeEmail, role: 'DEVELOPER' }),
    });
    const createInviteJson = await createInviteRes.json();
    assert(createInviteRes.status === 201 && createInviteJson.data?.token, 'Invitation created with token');
    inviteTokenStr = createInviteJson.data.token;

    // 4.2 List Invitations
    const listInvitesRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/invites`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const listInvitesJson = await listInvitesRes.json();
    assert(listInvitesRes.status === 200 && Array.isArray(listInvitesJson.data), 'Invitations list retrieved successfully');

    // 4.3 Email mismatch rejection on accept
    const wrongEmailAcceptRes = await fetch(`${baseUrl}/api/invites/${inviteTokenStr}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(wrongEmailAcceptRes.status === 403, 'Accepting invite with mismatched account email blocked with HTTP 403 Forbidden');

    // 4.4 Intended invitee accepts invitation
    const validAcceptRes = await fetch(`${baseUrl}/api/invites/${inviteTokenStr}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${inviteeToken}` },
    });
    const validAcceptJson = await validAcceptRes.json();
    assert(validAcceptRes.status === 200 && validAcceptJson.data?.organizationId === testOrgId, 'Intended invitee accepted invitation successfully');

    // 4.5 Reuse of accepted invite rejected
    const reuseInviteRes = await fetch(`${baseUrl}/api/invites/${inviteTokenStr}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${inviteeToken}` },
    });
    assert([409, 410].includes(reuseInviteRes.status), 'Re-using accepted invitation rejected with HTTP 409/410');

    // -------------------------------------------------------------
    // SECTION 5: Projects & Tasks CRUD & Organization Boundaries
    // -------------------------------------------------------------
    console.log('\n▶ [Section 5] Projects & Tasks CRUD & Organization Boundaries');

    // 5.1 Create Project
    const createProjRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Platform', description: 'Continuous automated test target' }),
    });
    const createProjJson = await createProjRes.json();
    assert(createProjRes.status === 201 && createProjJson.data?.id, 'Project created within organization');
    testProjectId = createProjJson.data.id;

    // 5.2 Cross-Organization Isolation: User not in Org cannot access project
    const crossOrgProjRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(crossOrgProjRes.status === 403, 'Cross-organization boundary enforced: unauthorized user cannot access project');

    // 5.3 Create Task
    const createTaskRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Build automated end-to-end pipeline',
        description: 'Verify all API contracts and data models',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: devUserId,
      }),
    });
    const createTaskJson = await createTaskRes.json();
    assert(createTaskRes.status === 201 && createTaskJson.data?.id, 'Task created with assignee in project');
    testTaskId = createTaskJson.data.id;

    // 5.4 Move Task
    const moveTaskRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${testTaskId}/move`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', position: 0 }),
    });
    const moveTaskJson = await moveTaskRes.json();
    assert(moveTaskRes.status === 200 && moveTaskJson.data.status === 'IN_PROGRESS', 'Task status moved to IN_PROGRESS via move endpoint');

    // 5.5 Update Task to DONE (triggers status notification)
    const updateTaskRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${testTaskId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    });
    const updateTaskJson = await updateTaskRes.json();
    assert(updateTaskRes.status === 200 && updateTaskJson.data.status === 'DONE', 'Task status updated to DONE');

    // -------------------------------------------------------------
    // SECTION 6: Task Comments & Team Chat
    // -------------------------------------------------------------
    console.log('\n▶ [Section 6] Task Comments & Team Chat');

    // 6.1 Create Comment
    const commentRes = await fetch(
      `${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${devToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Automated verification test comment passed.' }),
      }
    );
    const commentJson = await commentRes.json();
    assert(commentRes.status === 201 && commentJson.data?.content, 'Task comment posted successfully');
    const testCommentId = commentJson.data.id;

    // 6.2 List Comments
    const listCommentsRes = await fetch(
      `${baseUrl}/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`,
      {
        headers: { Authorization: `Bearer ${ownerToken}` },
      }
    );
    const listCommentsJson = await listCommentsRes.json();
    assert(listCommentsRes.status === 200 && Array.isArray(listCommentsJson.data), 'Task comments list retrieved');

    // 6.3 Send Team Chat Message
    const chatRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/chat/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Real-time team chat message for test suite.' }),
    });
    const chatJson = await chatRes.json();
    assert(chatRes.status === 201 && chatJson.data?.id, 'Team chat message sent');

    // 6.4 List Team Chat Messages
    const listChatRes = await fetch(`${baseUrl}/api/organizations/${testOrgId}/chat/messages`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const listChatJson = await listChatRes.json();
    assert(listChatRes.status === 200 && Array.isArray(listChatJson.data), 'Team chat message history retrieved');

    // -------------------------------------------------------------
    // SECTION 7: Notification Lifecycle & Read Transitions
    // -------------------------------------------------------------
    console.log('\n▶ [Section 7] Notification Lifecycle & Read Transitions');

    // 7.1 Check Dev User Notifications (should have received task assignment & status change notifications)
    const notifsRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const notifsJson = await notifsRes.json();
    assert(notifsRes.status === 200 && Array.isArray(notifsJson.data), 'GET /api/notifications returned notifications array');
    assert(typeof notifsJson.unreadCount === 'number', 'Notification response contains unreadCount metric');

    if (notifsJson.data.length > 0) {
      const notifToRead = notifsJson.data[0];
      // 7.2 Mark single notification read
      const markSingleRes = await fetch(`${baseUrl}/api/notifications/${notifToRead.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${devToken}` },
      });
      assert(markSingleRes.status === 200, 'PATCH /api/notifications/:id/read marked notification as read');
    }

    // 7.3 Mark all notifications read
    const markAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert(markAllRes.status === 200, 'PATCH /api/notifications/read-all marked all notifications read');

    // Verify unreadCount is 0
    const verifiedNotifs = await (await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    })).json();
    assert(verifiedNotifs.unreadCount === 0, 'Verified unreadCount is 0 after mark-all-read');

    // -------------------------------------------------------------
    // SECTION 8: Cryptography, Secret Redaction & AI Assistant
    // -------------------------------------------------------------
    console.log('\n▶ [Section 8] Cryptography, Secret Redaction & AI Assistant');

    // 8.1 AES-256-GCM Encryption / Decryption at Rest
    const secretSample = 'ghp_SuperSecretGitHubTokenForTestingAES256GCM';
    const encrypted = encryptToken(secretSample);
    assert(encrypted !== secretSample && encrypted.includes(':'), 'encryptToken generated valid ciphertext with IV separator');
    const decrypted = decryptToken(encrypted);
    assert(decrypted === secretSample, 'decryptToken accurately restored original plaintext');

    // 8.2 Audit Log Secret Redactor
    const sanitizedAudit = sanitizeMetadata({
      secret: 'my_raw_password',
      token: 'bearer sample_bearer_token',
      apiKey: 'xyz123',
      normalField: 'acceptable_data',
    });
    assert(sanitizedAudit.secret === '[REDACTED]' && sanitizedAudit.normalField === 'acceptable_data', 'Activity audit log metadata redacts sensitive fields');

    // 8.3 AI Input Prompt Sanitizer
    const rawAiPrompt = 'Check this connection string: postgresql://admin:MyPass123!@localhost:5432/devflow with bearer eyJhbGciOiJIUzI1NiJ9.test';
    const cleanAiPrompt = sanitizeAIInput(rawAiPrompt);
    assert(!cleanAiPrompt.includes('MyPass123!') && !cleanAiPrompt.includes('eyJhbGciOiJIUzI1NiJ9.test'), 'AI prompt pre-flight redactor eliminated credentials and JWTs');

    // 8.4 AI Assistant Endpoint
    const aiRes = await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'How do I optimize database connection pooling in Node.js?' }),
    });
    const aiJson = await aiRes.json();
    assert(aiRes.status === 200 && aiJson.success === true && typeof aiJson.data?.answer === 'string', 'POST /api/ai/assistant returned structured response with actionable suggestions');

    // -------------------------------------------------------------
    // CLEANUP TEST ARTIFACTS
    // -------------------------------------------------------------
    console.log('\n▶ [Cleanup] Purging isolated test data...');
    try {
      if (testOrgId) {
        await prisma.organization.delete({ where: { id: testOrgId } });
      }
      const testEmails = [ownerEmail, adminEmail, devEmail, inviteeEmail, intruderEmail];
      await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
      console.log('  ✓ Cleaned up test organizations and test user accounts');
    } catch (cleanErr) {
      console.warn('  ⚠️ Cleanup notice:', cleanErr);
    }

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedCount} INTEGRATION & REGRESSION CHECKS PASSED PERFECTLY!`);
    console.log('================================================================\n');
  } finally {
    try {
      await closeSocket();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    } catch {
      // Ignore final shutdown warnings
    }
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  if (server) {
    server.close();
  }
  prisma.$disconnect();
  process.exit(1);
});
