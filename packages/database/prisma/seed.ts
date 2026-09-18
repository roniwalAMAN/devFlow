import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { PrismaClient, MemberRole, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DevFlow database seed...');

  // 1. Clean existing sample data if needed (idempotent upserts)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Seed Demo Users
  const alex = await prisma.user.upsert({
    where: { email: 'alex@devflow.io' },
    update: { passwordHash, name: 'Alex Mercer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop' },
    create: {
      email: 'alex@devflow.io',
      name: 'Alex Mercer',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop',
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@devflow.io' },
    update: { passwordHash, name: 'Charlie Davis', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop' },
    create: {
      email: 'charlie@devflow.io',
      name: 'Charlie Davis',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@devflow.io' },
    update: { passwordHash, name: 'Bob Smith', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop' },
    create: {
      email: 'bob@devflow.io',
      name: 'Bob Smith',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop',
    },
  });

  const dana = await prisma.user.upsert({
    where: { email: 'dana@devflow.io' },
    update: { passwordHash, name: 'Dana Lee', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop' },
    create: {
      email: 'dana@devflow.io',
      name: 'Dana Lee',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop',
    },
  });

  console.log('✓ Seeded users: Alex (Owner), Charlie (Admin), Bob (Dev), Dana (Viewer)');

  // 3. Seed Primary Organization
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-engineering' },
    update: { name: 'Acme Engineering', ownerId: alex.id },
    create: {
      name: 'Acme Engineering',
      slug: 'acme-engineering',
      ownerId: alex.id,
    },
  });

  // Seed Memberships
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: alex.id, organizationId: acmeOrg.id } },
    update: { role: MemberRole.OWNER },
    create: { userId: alex.id, organizationId: acmeOrg.id, role: MemberRole.OWNER },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: charlie.id, organizationId: acmeOrg.id } },
    update: { role: MemberRole.ADMIN },
    create: { userId: charlie.id, organizationId: acmeOrg.id, role: MemberRole.ADMIN },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: bob.id, organizationId: acmeOrg.id } },
    update: { role: MemberRole.DEVELOPER },
    create: { userId: bob.id, organizationId: acmeOrg.id, role: MemberRole.DEVELOPER },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: dana.id, organizationId: acmeOrg.id } },
    update: { role: MemberRole.VIEWER },
    create: { userId: dana.id, organizationId: acmeOrg.id, role: MemberRole.VIEWER },
  });

  console.log('✓ Seeded organization & RBAC members');

  // 4. Seed Projects
  const cloudProj = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId: acmeOrg.id, slug: 'cloud-platform-migration' } },
    update: {
      name: 'Cloud Platform Migration',
      description: 'Zero-downtime infrastructure migration to resilient containerized microservices.',
      githubRepoOwner: 'facebook',
      githubRepoName: 'react',
      githubRepoId: '10270250',
    },
    create: {
      organizationId: acmeOrg.id,
      name: 'Cloud Platform Migration',
      slug: 'cloud-platform-migration',
      description: 'Zero-downtime infrastructure migration to resilient containerized microservices.',
      createdById: alex.id,
      githubRepoOwner: 'facebook',
      githubRepoName: 'react',
      githubRepoId: '10270250',
    },
  });

  const collabProj = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId: acmeOrg.id, slug: 'realtime-collab-engine' } },
    update: {
      name: 'Real-Time Collab Engine',
      description: 'Distributed WebSocket event broadcasting with Redis PubSub and presence tracking.',
      githubRepoOwner: 'vercel',
      githubRepoName: 'next.js',
      githubRepoId: '70107786',
    },
    create: {
      organizationId: acmeOrg.id,
      name: 'Real-Time Collab Engine',
      slug: 'realtime-collab-engine',
      description: 'Distributed WebSocket event broadcasting with Redis PubSub and presence tracking.',
      createdById: alex.id,
      githubRepoOwner: 'vercel',
      githubRepoName: 'next.js',
      githubRepoId: '70107786',
    },
  });

  console.log('✓ Seeded projects with GitHub repository links');

  // 5. Seed Tasks for Cloud Project
  const tasksData = [
    {
      title: 'Architect Redis stream consumer pipeline',
      description: 'Build fault-tolerant BullMQ workers with exponential backoff and dead-letter queues.',
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      position: 0,
      assigneeId: bob.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() + 86400000 * 3),
    },
    {
      title: 'Draft OAuth 2.1 PKCE security specification',
      description: 'Define secure authorization grant flow for third-party CLI integrations.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      position: 1,
      assigneeId: charlie.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() + 86400000 * 5),
    },
    {
      title: 'Optimize Prisma query latency & index coverage',
      description: 'Add composite indexes for organization-scoped task moves and chat histories.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      position: 0,
      assigneeId: bob.id,
      createdById: charlie.id,
      dueDate: new Date(Date.now() + 86400000 * 2),
    },
    {
      title: 'Build real-time team presence indicator',
      description: 'Track multi-device user connections in memory and broadcast status changes.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      position: 1,
      assigneeId: alex.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() + 86400000 * 4),
    },
    {
      title: 'Design GitHub repository sync drawer',
      description: 'Implement live commit list, PR status pills, and issue cards in the sidebar.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      position: 0,
      assigneeId: bob.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() + 86400000 * 1),
    },
    {
      title: 'Set up JWT access/refresh authentication',
      description: 'Stateless access tokens paired with revocable database refresh tokens.',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      position: 0,
      assigneeId: alex.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() - 86400000 * 2),
    },
    {
      title: 'Configure monorepo with pnpm and Tailwind CSS',
      description: 'Shared database client, Express API server, and Next.js 16 web client.',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      position: 1,
      assigneeId: charlie.id,
      createdById: alex.id,
      dueDate: new Date(Date.now() - 86400000 * 4),
    },
  ];

  // Clear existing tasks for clean seed
  await prisma.task.deleteMany({ where: { projectId: cloudProj.id } });

  const createdTasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        projectId: cloudProj.id,
        ...t,
      },
    });
    createdTasks.push(task);
  }

  console.log(`✓ Seeded ${createdTasks.length} Kanban tasks across all columns`);

  // 6. Seed Comments on the first IN_PROGRESS task
  const activeTask = createdTasks.find((t) => t.status === TaskStatus.IN_PROGRESS);
  if (activeTask) {
    await prisma.taskComment.createMany({
      data: [
        {
          taskId: activeTask.id,
          authorId: alex.id,
          content: 'Identified a slow query on `findMany` when fetching nested relations. Adding indexes cuts p99 latency by 85%.',
        },
        {
          taskId: activeTask.id,
          authorId: bob.id,
          content: 'Benchmark looks incredible! I will verify the migration plan in staging before merging.',
        },
      ],
    });
    console.log('✓ Seeded task comments');
  }

  // 7. Seed Team Chat Messages
  await prisma.chatMessage.createMany({
    data: [
      {
        organizationId: acmeOrg.id,
        authorId: alex.id,
        content: 'Welcome to Acme Engineering! The sprint board is live with real-time Socket.IO synchronization.',
      },
      {
        organizationId: acmeOrg.id,
        authorId: bob.id,
        content: 'All background BullMQ queues and Redis rate limiters are humming along nicely.',
      },
      {
        organizationId: acmeOrg.id,
        authorId: charlie.id,
        content: 'GitHub repository links and Gemini AI coding assistant are fully configured.',
      },
    ],
  });
  console.log('✓ Seeded team chat messages');

  // 8. Seed Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        organizationId: acmeOrg.id,
        userId: alex.id,
        action: 'ORGANIZATION_CREATED',
        entityType: 'ORGANIZATION',
        entityId: acmeOrg.id,
        metadata: { name: acmeOrg.name, slug: acmeOrg.slug },
      },
      {
        organizationId: acmeOrg.id,
        userId: alex.id,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: cloudProj.id,
        metadata: { name: cloudProj.name, slug: cloudProj.slug },
      },
      {
        organizationId: acmeOrg.id,
        userId: alex.id,
        action: 'GITHUB_REPO_LINKED',
        entityType: 'PROJECT',
        entityId: cloudProj.id,
        metadata: { repo: `${cloudProj.githubRepoOwner}/${cloudProj.githubRepoName}` },
      },
      {
        organizationId: acmeOrg.id,
        userId: charlie.id,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: createdTasks[0].id,
        metadata: { title: createdTasks[0].title, priority: createdTasks[0].priority },
      },
    ],
  });
  console.log('✓ Seeded organization audit logs');

  console.log('\n🎉 Seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('  Alex Mercer  (Owner):     alex@devflow.io    / Password123!');
  console.log('  Charlie Davis (Admin):    charlie@devflow.io / Password123!');
  console.log('  Bob Smith    (Developer): bob@devflow.io     / Password123!');
  console.log('  Dana Lee     (Viewer):    dana@devflow.io    / Password123!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
