import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, organizationMembers, organizations, users } from '@opentournament/database';
import { createOrganizationSchema, inviteMemberSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';

async function getMembership(organizationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return member ?? null;
}

export async function registerOrganizationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/organizations', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = createOrganizationSchema.parse(request.body);
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, body.slug), isNull(organizations.deletedAt)))
      .limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({
        error: { code: 'SLUG_TAKEN', message: 'That slug is already in use' },
      });
    }

    const [org] = await db
      .insert(organizations)
      .values({
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
      })
      .returning();
    if (!org) {
      return reply.status(500).send({
        error: { code: 'ORG_CREATE_FAILED', message: 'The organization could not be created' },
      });
    }

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: request.user!.id,
      role: 'owner',
    });
    await db.insert(auditLogs).values({
      organizationId: org.id,
      actorId: request.user!.id,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: org.id,
    });

    return reply.status(201).send({ organization: org });
  });

  app.get('/organizations', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    return reply.send({ organizations: request.user!.organizations });
  });

  app.get('/organizations/:orgId', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { orgId } = request.params as { orgId: string };
    const member = await getMembership(orgId, request.user!.id);
    if (!member) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You are not a member of this organization' },
      });
    }
    const [org] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
      .limit(1);
    if (!org) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    return reply.send({ organization: org, role: member.role });
  });

  app.get('/organizations/by-slug/:slug', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { slug } = request.params as { slug: string };
    const [org] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)))
      .limit(1);
    if (!org) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    const member = await getMembership(org.id, request.user!.id);
    if (!member) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You are not a member of this organization' },
      });
    }
    const members = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        email: users.email,
        displayName: users.displayName,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, org.id));
    return reply.send({ organization: org, role: member.role, members });
  });

  app.get('/organizations/:orgId/members', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { orgId } = request.params as { orgId: string };
    const member = await getMembership(orgId, request.user!.id);
    if (!member) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You are not a member of this organization' },
      });
    }
    const members = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        email: users.email,
        displayName: users.displayName,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, orgId));
    return reply.send({ members });
  });

  app.post('/organizations/:orgId/members', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { orgId } = request.params as { orgId: string };
    const member = await getMembership(orgId, request.user!.id);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'An organization admin or owner role is required' },
      });
    }
    const body = inviteMemberSchema.parse(request.body);
    if (body.role === 'owner' && member.role !== 'owner') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only an owner can assign the owner role' },
      });
    }
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, body.email), isNull(users.deletedAt)))
      .limit(1);
    if (!target) {
      return reply.status(404).send({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account exists with that email address; ask the user to register first',
        },
      });
    }
    const existing = await getMembership(orgId, target.id);
    if (existing) {
      return reply.status(409).send({
        error: {
          code: 'ALREADY_MEMBER',
          message: 'The user is already a member of the organization',
        },
      });
    }
    await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: target.id,
      role: body.role,
    });
    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorId: request.user!.id,
      action: 'organization.member_added',
      resourceType: 'organization',
      resourceId: orgId,
      after: { userId: target.id, role: body.role },
    });
    return reply.status(201).send({ ok: true });
  });
}
