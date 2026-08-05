import argon2 from 'argon2';
import { loadApiEnv } from '@opentournament/config';
import { createDb } from './client.js';
import { auditLogs, organizationMembers, organizations, users } from './schema.js';

async function main() {
  const env = loadApiEnv();
  if (!env.SEED_DEMO_DATA) {
    console.log('SEED_DEMO_DATA=false; no se ejecuta el seed de demostración.');
    return;
  }

  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      console.log('Ya existen usuarios; seed omitido (idempotente).');
      return;
    }

    const passwordHash = await argon2.hash('demo-password-123', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const [owner] = await db
      .insert(users)
      .values({
        email: 'admin@opentournament.local',
        passwordHash,
        displayName: 'Admin Demo',
        emailVerifiedAt: new Date(),
      })
      .returning();
    if (!owner) throw new Error('No se pudo crear el usuario de demostración.');

    const [org] = await db
      .insert(organizations)
      .values({
        slug: 'opentournament-demo',
        name: 'OpenTournament Demo',
        description: 'Organización de demostración para evaluar OpenTournament.',
      })
      .returning();
    if (!org) throw new Error('No se pudo crear la organización de demostración.');

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: owner.id,
      role: 'owner',
    });

    await db.insert(auditLogs).values({
      organizationId: org.id,
      actorId: owner.id,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: org.id,
      reason: 'seed de demostración',
    });

    console.log('Seed de demostración completado.');
    console.log('  Correo: admin@opentournament.local');
    console.log('  Contraseña: demo-password-123');
    console.log('  Organización: opentournament-demo');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error ejecutando el seed:', err);
  process.exitCode = 1;
});
