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

export const gameAdapterKeySchema = z.enum(['generic', 'valorant', 'cs2', 'lol']);

export const createTeamSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(40),
  tag: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/, 'El tag solo admite letras y números')
    .optional(),
  gameAdapterKey: gameAdapterKeySchema.optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const tournamentFormatSchema = z.enum(['single_elimination', 'double_elimination']);
export const tournamentVisibilitySchema = z.enum(['public', 'unlisted']);

export const createTournamentSchema = z.object({
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
  settings: z
    .object({
      grandFinalReset: z.boolean().default(false),
      presencial: z.boolean().default(false),
    })
    .default({ grandFinalReset: false, presencial: false }),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
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
