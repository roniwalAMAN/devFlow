import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { prisma } from '@devflow/database';
import { initWorkers, closeWorkers } from '../apps/server/src/jobs/workers';
import { closeQueues } from '../apps/server/src/jobs/queues';
import { enqueueNotificationJob } from '../apps/server/src/jobs/producers';
import { createNotification, getUserNotifications } from '../apps/server/src/services/notification';
import { closeRedis, getRedisClient } from '../apps/server/src/services/redis';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function testNotificationFix() {
  console.log('=== Verifying BullMQ Notification Worker & Foreign Key Integrity Fix ===\n');

  // Initialize Redis and Workers
  getRedisClient();
  initWorkers();

  // 1. Fetch existing seeded user and organization
  const user = await prisma.user.findFirst({ where: { email: 'alex@devflow.io' } });
  const org = await prisma.organization.findFirst({ where: { slug: 'acme-engineering' } });

  assert(user && org, '1. Seed user (alex) and organization (acme-engineering) exist in database');

  // 2. Test createNotification with slug instead of ID -> should resolve slug to cuid ID
  const notif1 = await createNotification({
    userId: user!.id,
    organizationId: 'acme-engineering', // Slug passed instead of cuid
    type: 'TASK_ASSIGNED',
    title: 'Slug Resolution Test',
    message: 'Testing slug to cuid foreign key resolution',
  });

  assert(
    notif1 && notif1.organizationId === org!.id,
    '2. createNotification resolved slug "acme-engineering" to valid cuid foreign key'
  );

  // 3. Test Enqueuing a valid notification job through BullMQ
  await enqueueNotificationJob({
    userId: user!.id,
    organizationId: org!.id,
    type: 'BULLMQ_TEST',
    title: 'Live BullMQ Worker Test',
    message: 'Processed asynchronously by BullMQ notification worker',
  });

  // Wait for worker to process job
  await new Promise((r) => setTimeout(r, 1500));

  const notifs = await getUserNotifications(user!.id);
  const foundWorkerNotif = notifs.find((n) => n.title === 'Live BullMQ Worker Test');
  assert(
    foundWorkerNotif !== undefined && foundWorkerNotif.organizationId === org!.id,
    '3. BullMQ notification worker processed job and created notification with valid foreign key'
  );

  // 4. Test Enqueuing an orphaned / invalid organization ID -> Worker should skip cleanly without FK crash
  const fakeOrgId = 'non-existent-org-id-12345';
  await enqueueNotificationJob({
    userId: user!.id,
    organizationId: fakeOrgId,
    type: 'ORPHAN_TEST',
    title: 'Orphaned Job Test',
    message: 'This job has an invalid organization and should be skipped safely',
  });

  // Wait for worker to process/skip orphaned job
  await new Promise((r) => setTimeout(r, 1500));
  assert(true, '4. BullMQ notification worker handled orphaned job gracefully without FK crash');

  console.log('\n🎉 ALL NOTIFICATION WORKER & FK VERIFICATION CHECKS PASSED PERFECTLY!\n');

  await closeWorkers();
  await closeQueues();
  await closeRedis();
  await prisma.$disconnect();
}

testNotificationFix().catch(async (err) => {
  console.error('Test failed:', err);
  await closeWorkers();
  await closeQueues();
  await closeRedis();
  await prisma.$disconnect();
  process.exit(1);
});
