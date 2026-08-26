export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export const DEFAULT_LOCALE = 'es' as const;
export const LOCALE_COOKIE = 'opentournament-locale';

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type MessageValues = Record<string, string | number>;

const es = {
  accessibility: {
    skipToContent: 'Saltar al contenido',
  },
  language: {
    label: 'Idioma',
    spanish: 'Español',
    english: 'English',
    switchToSpanish: 'Cambiar idioma a español',
    switchToEnglish: 'Switch language to English',
  },
  navigation: {
    primary: 'Principal',
    signIn: 'Iniciar sesión',
    register: 'Registrarse',
    apiUnavailable: 'API sin conexión',
    logout: 'Cerrar sesión',
    loggingOut: 'Cerrando sesión…',
    participantWorkspace: 'Participante',
    personalWorkspace: 'Workspace personal',
    myTournament: 'Mi torneo',
    tournaments: 'Torneos',
    newTournament: 'Nuevo torneo',
    newParticipant: 'Nuevo participante',
  },
  theme: {
    label: 'Tema visual',
    system: 'Usar tema del sistema',
    light: 'Usar tema claro',
    dark: 'Usar tema oscuro',
  },
  home: {
    tagline: 'La plataforma open source para crear, administrar y publicar torneos de esports.',
    signedOutTitle: 'Tu servidor, tus reglas',
    signedOutDescription:
      'Creá tu organización, publicá torneos, gestioná inscripciones, brackets, resultados y disputas. Todo autoalojable con Docker Compose.',
    createAccount: 'Crear cuenta',
    participantEyebrow: 'Tu competencia',
    participantDescription:
      'Volvé al torneo para seguir el bracket, revisar tus partidas y reportar resultados.',
    viewMyTournament: 'Ver mi torneo',
    reportResult: 'Reportar resultado',
    organizerEyebrow: 'Tu espacio',
    organizerGreeting: 'Hola, {name}',
    organizerDescription:
      'Retomá la organización desde el panel o creá un torneo con las plantillas de Smash Ultimate y League of Legends.',
    openDashboard: 'Abrir panel',
    createTournament: 'Crear torneo',
  },
  auth: {
    email: 'Correo',
    password: 'Contraseña',
    loginTitle: 'Iniciar sesión',
    loginSubmit: 'Entrar',
    loginSubmitting: 'Entrando…',
    loginError: 'Error al iniciar sesión',
    noAccount: '¿No tenés cuenta?',
    registerLink: 'Registrate',
    discordLogin: 'Entrar con Discord',
    registerTitle: 'Crear cuenta',
    displayName: 'Nombre',
    passwordRequirements: 'Contraseña (mínimo 8 caracteres)',
    registerSubmit: 'Crear cuenta',
    registerSubmitting: 'Creando…',
    registerError: 'Error al crear la cuenta',
    hasAccount: '¿Ya tenés cuenta?',
    loginLink: 'Iniciá sesión',
  },
} as const;

type DeepString<T> = {
  [Key in keyof T]: T[Key] extends string ? string : DeepString<T[Key]>;
};

export type Dictionary = DeepString<typeof es>;

const en: Dictionary = {
  accessibility: {
    skipToContent: 'Skip to content',
  },
  language: {
    label: 'Language',
    spanish: 'Español',
    english: 'English',
    switchToSpanish: 'Cambiar idioma a español',
    switchToEnglish: 'Switch language to English',
  },
  navigation: {
    primary: 'Primary',
    signIn: 'Sign in',
    register: 'Create account',
    apiUnavailable: 'API unavailable',
    logout: 'Sign out',
    loggingOut: 'Signing out…',
    participantWorkspace: 'Participant',
    personalWorkspace: 'Personal workspace',
    myTournament: 'My tournament',
    tournaments: 'Tournaments',
    newTournament: 'New tournament',
    newParticipant: 'New participant',
  },
  theme: {
    label: 'Color theme',
    system: 'Use system theme',
    light: 'Use light theme',
    dark: 'Use dark theme',
  },
  home: {
    tagline: 'The open-source platform for creating, managing, and publishing esports tournaments.',
    signedOutTitle: 'Your server, your rules',
    signedOutDescription:
      'Create your organization, publish tournaments, and manage registrations, brackets, results, and disputes. Fully self-hosted with Docker Compose.',
    createAccount: 'Create account',
    participantEyebrow: 'Your competition',
    participantDescription:
      'Return to the tournament to follow the bracket, review your matches, and report results.',
    viewMyTournament: 'View my tournament',
    reportResult: 'Report result',
    organizerEyebrow: 'Your workspace',
    organizerGreeting: 'Hello, {name}',
    organizerDescription:
      'Continue organizing from the dashboard or create a tournament with the Smash Ultimate and League of Legends templates.',
    openDashboard: 'Open dashboard',
    createTournament: 'Create tournament',
  },
  auth: {
    email: 'Email',
    password: 'Password',
    loginTitle: 'Sign in',
    loginSubmit: 'Sign in',
    loginSubmitting: 'Signing in…',
    loginError: 'Unable to sign in',
    noAccount: "Don't have an account?",
    registerLink: 'Create one',
    discordLogin: 'Continue with Discord',
    registerTitle: 'Create account',
    displayName: 'Name',
    passwordRequirements: 'Password (at least 8 characters)',
    registerSubmit: 'Create account',
    registerSubmitting: 'Creating account…',
    registerError: 'Unable to create the account',
    hasAccount: 'Already have an account?',
    loginLink: 'Sign in',
  },
};

export const dictionaries: Record<Locale, Dictionary> = { es, en };

export function resolveLocale(value: string | null | undefined): Locale {
  const normalized = value?.trim().toLowerCase();
  if (normalized?.startsWith('en')) return 'en';
  if (normalized?.startsWith('es')) return 'es';
  return DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function formatMessage(template: string, values: MessageValues): string {
  return template.replaceAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}

export function serializeLocaleCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
