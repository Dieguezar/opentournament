import { count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, evidence, resultSubmissions, teams } from '@opentournament/database';
import { addEvidenceSchema, presignSchema } from '@opentournament/validation';
import { env } from '../config.js';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';
import {
  ALLOWED_EVIDENCE_TYPES,
  createPresignedDownload,
  createPresignedUpload,
  newEvidenceKey,
  objectExists,
} from '../services/storage.js';
import { loadMatchContext } from '../services/tournaments.js';

async function canAccessEvidence(
  submissionId: string,
  userId: string,
): Promise<{ allowed: boolean; tournamentId?: string }> {
  const [submission] = await db
    .select()
    .from(resultSubmissions)
    .where(eq(resultSubmissions.id, submissionId))
    .limit(1);
  if (!submission) return { allowed: false };
  const ctx = await loadMatchContext(db, submission.matchId);
  if (!ctx) return { allowed: false };
  if (submission.reportedBy === userId) return { allowed: true, tournamentId: ctx.tournament.id };
  if (await isTournamentAdmin(db, ctx.tournament.id, userId)) {
    return { allowed: true, tournamentId: ctx.tournament.id };
  }
  if (submission.teamId && (await isTeamCaptain(db, submission.teamId, userId))) {
    return { allowed: true, tournamentId: ctx.tournament.id };
  }
  return { allowed: false };
}

export async function registerEvidenceRoutes(app: FastifyInstance): Promise<void> {
  app.post('/files/presign', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = presignSchema.parse(request.body);
    const ext = ALLOWED_EVIDENCE_TYPES.get(body.contentType);
    if (!ext) {
      return reply.status(400).send({
        error: { code: 'INVALID_TYPE', message: 'Tipo de archivo no permitido' },
      });
    }
    if (body.sizeBytes > env.MAX_EVIDENCE_SIZE_MB * 1024 * 1024) {
      return reply.status(400).send({
        error: { code: 'FILE_TOO_LARGE', message: 'El archivo supera el tamaño máximo' },
      });
    }
    const key = newEvidenceKey(body.contentType);
    const uploadUrl = await createPresignedUpload(key, body.contentType);
    return reply.send({ uploadUrl, key });
  });

  app.post('/results/:resultId/evidence', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { resultId } = request.params as { resultId: string };
    const body = addEvidenceSchema.parse(request.body);
    const access = await canAccessEvidence(resultId, request.user!.id);
    if (!access.allowed) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Sin acceso a este reporte' },
      });
    }

    const [submission] = await db
      .select()
      .from(resultSubmissions)
      .where(eq(resultSubmissions.id, resultId))
      .limit(1);
    if (!submission) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }

    if (body.kind === 'screenshot') {
      if (!body.key?.startsWith('private/evidence/')) {
        return reply.status(400).send({
          error: { code: 'INVALID_KEY', message: 'Clave de archivo inválida' },
        });
      }
      if (!(await objectExists(body.key))) {
        return reply.status(400).send({
          error: { code: 'FILE_MISSING', message: 'El archivo no existe en el almacenamiento' },
        });
      }
      const [countRow] = await db
        .select({ value: count() })
        .from(evidence)
        .where(eq(evidence.resultSubmissionId, resultId));
      if ((countRow?.value ?? 0) >= env.MAX_EVIDENCE_FILES_PER_SUBMISSION) {
        return reply.status(400).send({
          error: { code: 'TOO_MANY_FILES', message: 'Límite de evidencias alcanzado' },
        });
      }
    }

    const [row] = await db
      .insert(evidence)
      .values({
        resultSubmissionId: resultId,
        kind: body.kind,
        url: body.kind === 'screenshot' ? body.key! : body.url!,
        mimeType: body.kind === 'screenshot' ? body.mimeType : null,
        sizeBytes: body.kind === 'screenshot' ? body.sizeBytes : null,
        uploadedBy: request.user!.id,
      })
      .returning();
    await db.insert(auditLogs).values({
      actorId: request.user!.id,
      action: 'evidence.added',
      resourceType: 'result_submission',
      resourceId: resultId,
    });
    return reply.status(201).send({ evidence: row });
  });

  app.get('/results/:resultId/evidence', async (request, reply) => {
    const { resultId } = request.params as { resultId: string };
    const access = await canAccessEvidence(resultId, request.user?.id ?? '');
    if (!access.allowed) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Sin acceso a este reporte' },
      });
    }
    const rows = await db
      .select({
        id: evidence.id,
        kind: evidence.kind,
        url: evidence.url,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
        createdAt: evidence.createdAt,
        uploadedBy: evidence.uploadedBy,
        teamName: teams.name,
      })
      .from(evidence)
      .innerJoin(resultSubmissions, eq(resultSubmissions.id, evidence.resultSubmissionId))
      .leftJoin(teams, eq(teams.id, resultSubmissions.teamId))
      .where(eq(evidence.resultSubmissionId, resultId));

    const items = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: row.kind === 'screenshot' ? await createPresignedDownload(row.url) : row.url,
      })),
    );
    return reply.send({ evidence: items });
  });
}
