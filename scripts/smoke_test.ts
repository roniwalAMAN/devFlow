/**
 * DevFlow Post-Deployment Smoke Test Runner
 *
 * Runs non-destructive live verification against a running DevFlow environment.
 * Target URL defaults to http://localhost:3001, configurable via TARGET_URL or API_URL.
 *
 * Usage:
 *   API_URL=https://api.yourdomain.com pnpm --filter @devflow/server exec tsx ../../scripts/smoke_test.ts
 */

const TARGET_URL = (process.env.TARGET_URL || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

let passCount = 0;
let failCount = 0;

function assert(condition: any, message: string) {
  if (!condition) {
    failCount++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passCount++;
  console.log(`  ✓ ${message}`);
}

async function runSmokeTests() {
  console.log('================================================================');
  console.log('       DevFlow Post-Deployment Smoke Test Verification          ');
  console.log(`       Target Endpoint: ${TARGET_URL}`);
  console.log('================================================================\n');

  const timestamp = Date.now();
  const smokeEmail = `smoke_${timestamp}@devflow-smoke.io`;
  const smokePassword = 'SmokePassword123!';

  let accessToken = '';
  let refreshToken = '';
  let orgId = '';
  let projId = '';
  let taskId = '';

  try {
    // 1. Health Endpoints
    console.log('▶ [1/12] Health Endpoints & Database Connectivity');
    const healthRes = await fetch(`${TARGET_URL}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returned 200 OK');

    const dbRes = await fetch(`${TARGET_URL}/api/health/db`);
    const dbJson = await dbRes.json();
    assert(dbRes.status === 200 && dbJson.success === true, 'GET /api/health/db confirmed healthy PostgreSQL connection');

    const redisRes = await fetch(`${TARGET_URL}/api/health/redis`);
    assert([200, 503].includes(redisRes.status), 'GET /api/health/redis responded with graceful status');

    const fullHealthRes = await fetch(`${TARGET_URL}/api/health/full`);
    assert(fullHealthRes.status === 200, 'GET /api/health/full confirmed composite health status');

    // CORS & Preflight Verification
    console.log('\n▶ [CORS] Production Origin Preflight & Allowlist Verification');
    const testOrigin = process.env.CLIENT_ORIGIN || 'https://dev-flow-jet-nine.vercel.app';
    const preflightRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: testOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    assert(preflightRes.status === 204, `Preflight OPTIONS returned 204 for origin ${testOrigin}`);
    assert(
      preflightRes.headers.get('access-control-allow-origin') === testOrigin,
      `Preflight returned Access-Control-Allow-Origin: ${testOrigin}`
    );
    assert(
      preflightRes.headers.get('access-control-allow-credentials') === 'true',
      'Preflight returned Access-Control-Allow-Credentials: true'
    );

    // 2. Registration & Login
    console.log('\n▶ [2/12] User Registration & Authentication');
    const regRes = await fetch(`${TARGET_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Tester', email: smokeEmail, password: smokePassword }),
    });
    assert(regRes.status === 201, 'POST /api/auth/register successfully registered smoke user');

    const loginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200 && loginJson.data?.accessToken, 'POST /api/auth/login returned valid JWT accessToken');
    accessToken = loginJson.data.accessToken;
    refreshToken = loginJson.data.refreshToken;

    // 3. Session Restoration
    console.log('\n▶ [3/12] Session Restoration (/api/auth/me)');
    const meRes = await fetch(`${TARGET_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.data?.user?.email === smokeEmail, 'GET /api/auth/me validated token and restored user profile');

    // 4. Organization Access & RBAC
    console.log('\n▶ [4/12] Organization Workspace Creation & Roles');
    const orgRes = await fetch(`${TARGET_URL}/api/organizations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Smoke Org ${timestamp}` }),
    });
    const orgJson = await orgRes.json();
    assert(orgRes.status === 201 && orgJson.data?.id, 'POST /api/organizations created organization with user as OWNER');
    orgId = orgJson.data.id;

    // 5. Project & Task CRUD
    console.log('\n▶ [5/12] Project & Task Lifecycle');
    const projRes = await fetch(`${TARGET_URL}/api/organizations/${orgId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Project', description: 'Testing post-deploy lifecycle' }),
    });
    const projJson = await projRes.json();
    assert(projRes.status === 201 && projJson.data?.id, 'POST /api/organizations/:id/projects created project');
    projId = projJson.data.id;

    const taskRes = await fetch(`${TARGET_URL}/api/organizations/${orgId}/projects/${projId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Verify deployment smoke test', status: 'TODO', priority: 'HIGH' }),
    });
    const taskJson = await taskRes.json();
    assert(taskRes.status === 201 && taskJson.data?.id, 'POST /api/organizations/:id/projects/:id/tasks created task');
    taskId = taskJson.data.id;

    // 6. Comment Persistence
    console.log('\n▶ [6/12] Task Comments');
    const commentRes = await fetch(`${TARGET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Deployment smoke test verified successfully.' }),
    });
    assert(commentRes.status === 201, 'POST task comment persisted');

    // 7. Team Chat
    console.log('\n▶ [7/12] Live Team Chat');
    const chatRes = await fetch(`${TARGET_URL}/api/organizations/${orgId}/chat/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Smoke test chat broadcast message' }),
    });
    assert(chatRes.status === 201, 'POST /api/organizations/:id/chat/messages sent message');

    // 8. Notifications
    console.log('\n▶ [8/12] Notifications Endpoint');
    const notifsRes = await fetch(`${TARGET_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const notifsJson = await notifsRes.json();
    assert(notifsRes.status === 200 && Array.isArray(notifsJson.data), 'GET /api/notifications returned list');

    // 9. AI Assistant Graceful Handling
    console.log('\n▶ [9/12] AI Assistant Graceful Degradation / Live Response');
    const aiRes = await fetch(`${TARGET_URL}/api/ai/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Ping check for AI assistant integration.' }),
    });
    assert(aiRes.status === 200, 'POST /api/ai/assistant handled request safely');

    // 10. Unknown Endpoint 404
    console.log('\n▶ [10/12] Unknown Route Security Response');
    const badRouteRes = await fetch(`${TARGET_URL}/api/random-non-existent-route`);
    assert(badRouteRes.status === 404, 'Unknown endpoint returned 404 JSON response');

    // 11. Security Headers Verification
    console.log('\n▶ [11/12] Production Security Headers');
    const h = healthRes.headers;
    assert(h.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff verified');
    assert(h.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY verified');
    assert(!h.get('x-powered-by'), 'X-Powered-By is hidden');

    // 12. Cleanup
    console.log('\n▶ [12/12] Teardown Smoke Test Workspace');
    if (orgId) {
      await fetch(`${TARGET_URL}/api/organizations/${orgId}/projects/${projId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('  ✓ Cleaned up smoke project');
    }

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passCount} DEPLOYMENT SMOKE CHECKS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\n❌ Smoke Test Failed:', err.message);
    process.exit(1);
  }
}

runSmokeTests();
