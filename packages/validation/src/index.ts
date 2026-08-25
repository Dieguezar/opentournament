import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo electrónico inválido')
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

export const displayNameSchema = z.string().trim().min(2).max(60);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo admite minúsculas, números y guiones');

export const localeSchema = z.enum(['es', 'en']);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarUrl: z.string().url().max(500).optional(),
  locale: localeSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const gameAdapterKeySchema = z.enum([
  'generic',
  'valorant',
  'cs2',
  'lol',
  'smash_ultimate',
]);

const smashStageNameSchema = z.string().trim().min(1).max(80);

function normalizeSmashNumericInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? Number(normalizedValue) : value;
}

function normalizeStageName(stageName: string): string {
  return stageName
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('en-US');
}

export const smashUltimateRulesSchema = z
  .object({
    game: z.literal('smash_ultimate'),
    stocks: z.preprocess(
      normalizeSmashNumericInput,
      z.number().int().min(1).max(10),
    ),
    timeLimitMinutes: z.preprocess(
      normalizeSmashNumericInput,
      z.number().int().min(1).max(60),
    ),
    itemsEnabled: z.boolean(),
    finalSmashMeterEnabled: z.boolean(),
    stageHazardsEnabled: z.boolean(),
    launchRate: z.preprocess(normalizeSmashNumericInput, z.number().min(0.5).max(2)),
    starters: z.array(smashStageNameSchema).min(1).max(20),
    counterpicks: z.array(smashStageNameSchema).min(1).max(20),
    stageBans: z.preprocess(
      normalizeSmashNumericInput,
      z.number().int().min(0).max(10),
    ),
    stageClause: z.enum(['none', 'modified_dsr', 'full_dsr']),
  })
  .superRefine((rules, ctx) => {
    const normalizedStarters = rules.starters.map(normalizeStageName);
    const normalizedCounterpicks = rules.counterpicks.map(normalizeStageName);

    if (new Set(normalizedStarters).size !== normalizedStarters.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Los escenarios iniciales no pueden repetirse',
        path: ['starters'],
      });
    }

    if (new Set(normalizedCounterpicks).size !== normalizedCounterpicks.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Los escenarios de counterpick no pueden repetirse',
        path: ['counterpicks'],
      });
    }

    const starterSet = new Set(normalizedStarters);
    if (normalizedCounterpicks.some((stageName) => starterSet.has(stageName))) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un escenario no puede ser inicial y counterpick a la vez',
        path: ['counterpicks'],
      });
    }

    const totalStages = starterSet.size + new Set(normalizedCounterpicks).size;
    if (totalStages > 0 && rules.stageBans >= totalStages) {
      ctx.addIssue({
        code: 'custom',
        message: 'Los vetos deben dejar al menos un escenario disponible',
        path: ['stageBans'],
      });
    }
  });

export const tournamentGameRulesSchema = z.discriminatedUnion('game', [
  smashUltimateRulesSchema,
]);

export const tournamentSettingsSchema = z.object({
  grandFinalReset: z.boolean().default(false),
  presencial: z.boolean().default(false),
  templateKey: z.string().trim().min(1).max(100).optional(),
  templateVersion: z.coerce.number().int().min(1).max(999).optional(),
  gameRules: tournamentGameRulesSchema.optional(),
});

const createTeamBaseShape = {
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(40),
};

const competitiveTeamTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(8)
  .regex(/^[A-Za-z0-9]+$/, 'El tag solo admite letras y números');

const smashPlayerTagSchema = z.string().trim().min(1).max(32);

const nonSmashGameAdapterKeySchema = z.enum(['generic', 'valorant', 'cs2', 'lol']);

export const createTeamSchema = z.union([
  z.object({
    ...createTeamBaseShape,
    tag: smashPlayerTagSchema.optional(),
    gameAdapterKey: z.literal('smash_ultimate'),
  }),
  z.object({
    ...createTeamBaseShape,
    tag: competitiveTeamTagSchema.optional(),
    gameAdapterKey: nonSmashGameAdapterKeySchema.optional(),
  }),
]);
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const addTeamMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['member', 'substitute']).default('member'),
});
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

export const assignTeamGameAdapterSchema = z.object({
  gameAdapterKey: gameAdapterKeySchema.refine(
    (gameAdapterKey) => gameAdapterKey !== 'generic',
    'Seleccioná un juego concreto para el equipo',
  ),
});
export type AssignTeamGameAdapterInput = z.infer<typeof assignTeamGameAdapterSchema>;

export const tournamentFormatSchema = z.enum(['single_elimination', 'double_elimination']);
export const tournamentVisibilitySchema = z.enum(['public', 'unlisted']);

export const createTournamentSchema = z
  .object({
    organizationId: z.string().uuid(),
    gameAdapterKey: gameAdapterKeySchema.default('generic'),
    slug: slugSchema,
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2000).optional(),
    rules: z.string().trim().max(20_000).optional(),
    format: tournamentFormatSchema.default('single_elimination'),
    visibility: tournamentVisibilitySchema.default('public'),
    capacity: z.coerce.number().int().min(2).max(512).default(16),
    seriesConfig: z
      .object({
        bo: z.coerce.number().int().positive().max(9).default(3),
        drawsAllowed: z.boolean().default(false),
      })
      .default({ bo: 3, drawsAllowed: false }),
    registrationConfig: z
      .object({
        manualApproval: z.boolean().default(false),
        closesAt: z.string().datetime().optional(),
      })
      .default({ manualApproval: false }),
    checkinConfig: z
      .object({
        closesAt: z.string().datetime().optional(),
        delayToleranceMinutes: z.coerce.number().int().min(0).max(120).default(10),
      })
      .default({ delayToleranceMinutes: 10 }),
    settings: tournamentSettingsSchema.default({
      grandFinalReset: false,
      presencial: false,
    }),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .superRefine((tournament, ctx) => {
    const gameRules = tournament.settings.gameRules;
    if (gameRules && gameRules.game !== tournament.gameAdapterKey) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las reglas del juego no corresponden al adaptador seleccionado',
        path: ['settings', 'gameRules', 'game'],
      });
    }

    if (
      tournament.gameAdapterKey === 'smash_ultimate' &&
      tournament.seriesConfig.drawsAllowed
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Smash Ultimate no admite empates',
        path: ['seriesConfig', 'drawsAllowed'],
      });
    }

    if (
      tournament.gameAdapterKey === 'smash_ultimate' &&
      tournament.seriesConfig.bo !== 3 &&
      tournament.seriesConfig.bo !== 5
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Smash Ultimate sólo admite series BO3 o BO5',
        path: ['seriesConfig', 'bo'],
      });
    }

    const hasTemplateMetadata =
      tournament.settings.templateKey !== undefined ||
      tournament.settings.templateVersion !== undefined;
    if (tournament.gameAdapterKey !== 'smash_ultimate' && hasTemplateMetadata) {
      ctx.addIssue({
        code: 'custom',
        message: 'El adaptador seleccionado no admite metadatos de plantilla',
        path: ['settings', 'templateKey'],
      });
    }
  });
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  rules: z.string().trim().max(20_000).nullable().optional(),
  visibility: tournamentVisibilitySchema.optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const registerTeamSchema = z.object({
  teamId: z.string().uuid(),
});
export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;

export const registrationDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});
export type RegistrationDecisionInput = z.infer<typeof registrationDecisionSchema>;

export const checkInSchema = z.object({
  teamId: z.string().uuid(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const updateMatchSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  lobbyUrl: z.string().url().optional(),
  maps: z.array(z.string().min(1).max(40)).max(9).optional(),
});
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;

export const walkoverSchema = z.object({
  winnerTeamId: z.string().uuid(),
});
export type WalkoverInput = z.infer<typeof walkoverSchema>;

export const seedsSchema = z.object({
  seeds: z
    .array(
      z.object({
        teamId: z.string().uuid(),
        seed: z.coerce.number().int().min(1).max(512),
      }),
    )
    .max(512),
});
export type SeedsInput = z.infer<typeof seedsSchema>;

export const reportResultSchema = z.object({
  winnerTeamId: z.string().uuid().nullable().optional(),
  draw: z.boolean().default(false),
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
});
export type ReportResultInput = z.infer<typeof reportResultSchema>;

export const presignSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive(),
});
export type PresignInput = z.infer<typeof presignSchema>;

export const addEvidenceSchema = z
  .object({
    kind: z.enum(['screenshot', 'link']),
    key: z.string().trim().max(500).optional(),
    mimeType: z.string().trim().max(100).optional(),
    sizeBytes: z.coerce.number().int().positive().optional(),
    url: z.string().url().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'screenshot' && (!value.key || !value.mimeType || !value.sizeBytes)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Para capturas se requieren key, mimeType y sizeBytes',
        path: ['key'],
      });
    }
    if (value.kind === 'link' && !value.url) {
      ctx.addIssue({ code: 'custom', message: 'Para enlaces se requiere url', path: ['url'] });
    }
  });
export type AddEvidenceInput = z.infer<typeof addEvidenceSchema>;

export const createDisputeSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.enum(['captain_request', 'system']).default('captain_request'),
  message: z.string().trim().min(1).max(5000).optional(),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const disputeMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type DisputeMessageInput = z.infer<typeof disputeMessageSchema>;

export const assignRefereeSchema = z.object({
  assigneeId: z.string().uuid(),
});
export type AssignRefereeInput = z.infer<typeof assignRefereeSchema>;

export const resolveDisputeSchema = z.object({
  winnerTeamId: z.string().uuid().nullable().optional(),
  draw: z.boolean().default(false),
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
  rationale: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(5000),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
