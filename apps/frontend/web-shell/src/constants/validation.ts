export const LIMITS = {
  USER_FULL_NAME: 160,
  USER_FULL_NAME_MIN: 3,
  EMAIL: 200,
  CATEGORY_NAME: 120,
  CATEGORY_NAME_MIN: 2,
  PRIORITY_NAME: 80,
  PRIORITY_NAME_MIN: 2,
  SLA_NAME: 120,
  SLA_NAME_MIN: 2,
  TICKET_TITLE: 200,
  TICKET_TITLE_MIN: 4,
  TICKET_DESCRIPTION: 10_000,
  TICKET_DESCRIPTION_MIN: 10,
  COMMENT_BODY: 5_000,
  REASON: 1_000,
  ESCALATE_REASON_MIN: 5,
  CATALOG_DESCRIPTION: 2_000,
  FILE_MAX_BYTES: 5 * 1024 * 1024,
  PASSWORD_MIN_CHARS: 8,
  PASSWORD_MAX_BYTES: 72,
  CLIENT_NAME: 160,
  CLIENT_INDUSTRY: 100,
  CLIENT_REGION: 100,
} as const

export const FILE_MAX_MB = 5

export const PASSWORD_REQUIREMENTS = [
  'Mínimo 8 caracteres',
  'Al menos una letra mayúscula',
  'Al menos una letra minúscula',
  'Al menos un número',
  'Al menos un símbolo',
  'No puede comenzar ni terminar con espacios',
] as const
