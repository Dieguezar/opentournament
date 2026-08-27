import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Invalid email address').max(254);

export const passwordSchema = z
  .string()
  .min(8, 'The password must contain at least 8 characters')
  .max(128, 'The password is too long');

export const displayNameSchema = z.string().trim().min(2).max(60);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'The slug only allows lowercase letters, numbers, and hyphens',
  );

export const localeSchema = z.enum(['es', 'en']);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  locale: localeSchema.default('es'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const resendVerificationSchema = z.object({
  email: emailSchema,
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'The password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Invalid token'),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'The name must contain at least 2 characters').max(80),
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

export const gameAdapterKeySchema = z.enum(['generic', 'valorant', 'cs2', 'lol', 'smash_ultimate']);

const smashStageNameSchema = z.string().trim().min(1).max(80);

function normalizeSmashNumericInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? Number(normalizedValue) : value;
}

function normalizeStageName(stageName: string): string {
  return stageName.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

export const smashUltimateRulesSchema = z
  .object({
    game: z.literal('smash_ultimate'),
    stocks: z.preprocess(normalizeSmashNumericInput, z.number().int().min(1).max(10)),
    timeLimitMinutes: z.preprocess(normalizeSmashNumericInput, z.number().int().min(1).max(60)),
    itemsEnabled: z.boolean(),
    finalSmashMeterEnabled: z.boolean(),
    stageHazardsEnabled: z.boolean(),
    launchRate: z.preprocess(normalizeSmashNumericInput, z.number().min(0.5).max(2)),
    starters: z.array(smashStageNameSchema).min(1).max(20),
    counterpicks: z.array(smashStageNameSchema).min(1).max(20),
    stageBans: z.preprocess(normalizeSmashNumericInput, z.number().int().min(0).max(10)),
    stageClause: z.enum(['none', 'modified_dsr', 'full_dsr']),
  })
  .superRefine((rules, ctx) => {
    const normalizedStarters = rules.starters.map(normalizeStageName);
    const normalizedCounterpicks = rules.counterpicks.map(normalizeStageName);

    if (new Set(normalizedStarters).size !== normalizedStarters.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Starter stages cannot be duplicated',
        path: ['starters'],
      });
    }

    if (new Set(normalizedCounterpicks).size !== normalizedCounterpicks.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Counterpick stages cannot be duplicated',
        path: ['counterpicks'],
      });
    }

    const starterSet = new Set(normalizedStarters);
    if (normalizedCounterpicks.some((stageName) => starterSet.has(stageName))) {
      ctx.addIssue({
        code: 'custom',
        message: 'A stage cannot be both a starter and a counterpick',
        path: ['counterpicks'],
      });
    }

    const totalStages = starterSet.size + new Set(normalizedCounterpicks).size;
    if (totalStages > 0 && rules.stageBans >= totalStages) {
      ctx.addIssue({
        code: 'custom',
        message: 'Stage bans must leave at least one stage available',
        path: ['stageBans'],
      });
    }
  });

const leaguePatchVersionSchema = z
  .string()
  .trim()
  .regex(/^\d{1,2}\.\d{1,2}$/, 'Use a patch version such as 26.16')
  .nullable();

export const leagueOfLegendsRulesSchema = z
  .object({
    game: z.literal('lol'),
    map: z.literal('summoners_rift'),
    region: z.enum([
      'lan',
      'las',
      'br',
      'na',
      'euw',
      'eune',
      'kr',
      'jp',
      'oce',
      'tr',
      'ru',
      'ph',
      'sg',
      'th',
      'tw',
      'vn',
    ]),
    draftMode: z.literal('tournament_draft'),
    fearlessDraft: z.boolean(),
    patchPolicy: z.enum(['live', 'fixed']),
    patchVersion: leaguePatchVersionSchema,
    sideSelection: z.enum(['higher_seed_game_1_then_loser', 'alternating', 'coin_toss']),
    pauseBudgetMinutes: z.preprocess(normalizeSmashNumericInput, z.number().int().min(0).max(120)),
    spectatorDelayMinutes: z.preprocess(
      normalizeSmashNumericInput,
      z.number().int().min(0).max(30),
    ),
  })
  .superRefine((rules, ctx) => {
    if (rules.patchPolicy === 'fixed' && !rules.patchVersion) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide the fixed patch version',
        path: ['patchVersion'],
      });
    }
    if (rules.patchPolicy === 'live' && rules.patchVersion !== null) {
      ctx.addIssue({
        code: 'custom',
        message: 'A live patch policy must not specify a version',
        path: ['patchVersion'],
      });
    }
  });

export const tournamentGameRulesSchema = z.discriminatedUnion('game', [
  smashUltimateRulesSchema,
  leagueOfLegendsRulesSchema,
]);

export const resultReportingModeSchema = z.enum(['bilateral', 'winner_reports', 'staff_only']);

export const tournamentSettingsSchema = z.object({
  grandFinalReset: z.boolean().default(false),
  presencial: z.boolean().default(false),
  reportingMode: resultReportingModeSchema.default('bilateral'),
  templateKey: z.string().trim().min(1).max(100).optional(),
  templateVersion: z.coerce.number().int().min(1).max(999).optional(),
  gameRules: tournamentGameRulesSchema.optional(),
});

const createTeamBaseShape = {
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, 'The name must contain at least 2 characters').max(40),
};

const competitiveTeamTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(8)
  .regex(/^[A-Za-z0-9]+$/, 'The tag only allows letters and numbers');

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
    'Select a specific game for the team',
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
      reportingMode: 'bilateral',
    }),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .superRefine((tournament, ctx) => {
    const gameRules = tournament.settings.gameRules;
    if (gameRules && gameRules.game !== tournament.gameAdapterKey) {
      ctx.addIssue({
        code: 'custom',
        message: 'The game rules do not match the selected adapter',
        path: ['settings', 'gameRules', 'game'],
      });
    }

    if (
      (tournament.gameAdapterKey === 'smash_ultimate' || tournament.gameAdapterKey === 'lol') &&
      tournament.seriesConfig.drawsAllowed
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'The selected game does not allow draws',
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
        message: 'Smash Ultimate only supports BO3 or BO5 sets',
        path: ['seriesConfig', 'bo'],
      });
    }

    const hasTemplateMetadata =
      tournament.settings.templateKey !== undefined ||
      tournament.settings.templateVersion !== undefined;
    if (
      tournament.gameAdapterKey !== 'smash_ultimate' &&
      tournament.gameAdapterKey !== 'lol' &&
      hasTemplateMetadata
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'The selected adapter does not support template metadata',
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
  reportingMode: resultReportingModeSchema.optional(),
});
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const registerTeamSchema = z.object({
  teamId: z.string().uuid(),
});
export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;

export const createParticipantAccessPassSchema = z.object({
  teamId: z.string().uuid(),
  expiresInHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 365)
    .default(24 * 7),
});
export type CreateParticipantAccessPassInput = z.infer<typeof createParticipantAccessPassSchema>;

export const exchangeParticipantAccessPassSchema = z.object({
  token: z.string().trim().min(43).max(256),
});
export type ExchangeParticipantAccessPassInput = z.infer<
  typeof exchangeParticipantAccessPassSchema
>;

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

export const smashGameResultSchema = z.object({
  number: z.preprocess(normalizeSmashNumericInput, z.number().int().min(1).max(5)),
  stage: smashStageNameSchema,
  homeCharacter: z.string().trim().min(1).max(80),
  awayCharacter: z.string().trim().min(1).max(80),
  winnerTeamId: z.string().uuid(),
  homeStocks: z.preprocess(normalizeSmashNumericInput, z.number().int().min(0).max(10)),
  awayStocks: z.preprocess(normalizeSmashNumericInput, z.number().int().min(0).max(10)),
});
export type SmashGameResultInput = z.infer<typeof smashGameResultSchema>;

export const leagueGameResultSchema = z.object({
  number: z.preprocess(normalizeSmashNumericInput, z.number().int().min(1).max(5)),
  winnerTeamId: z.string().uuid(),
  blueTeamId: z.string().uuid(),
  durationMinutes: z.preprocess(normalizeSmashNumericInput, z.number().int().min(5).max(180)),
  riotMatchId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid Riot Match ID')
    .optional(),
});
export type LeagueGameResultInput = z.infer<typeof leagueGameResultSchema>;

export const reportResultSchema = z
  .object({
    winnerTeamId: z.string().uuid().nullable().optional(),
    draw: z.boolean().default(false),
    staffOverride: z.boolean().optional(),
    homeScore: z.coerce.number().int().min(0).max(99).optional(),
    awayScore: z.coerce.number().int().min(0).max(99).optional(),
    games: z.array(smashGameResultSchema).min(1).max(5).optional(),
    lolGames: z.array(leagueGameResultSchema).min(1).max(5).optional(),
  })
  .superRefine((report, ctx) => {
    if (report.games && report.lolGames) {
      ctx.addIssue({
        code: 'custom',
        message: 'A report cannot mix details from different games',
        path: ['lolGames'],
      });
    }
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
        message: 'Screenshot evidence requires key, mimeType, and sizeBytes',
        path: ['key'],
      });
    }
    if (value.kind === 'link' && !value.url) {
      ctx.addIssue({ code: 'custom', message: 'Link evidence requires a URL', path: ['url'] });
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
  rationale: z
    .string()
    .trim()
    .min(10, 'The rationale must contain at least 10 characters')
    .max(5000),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
