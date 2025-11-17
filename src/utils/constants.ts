/**
 * Application constants and configuration values
 */

// Authentication
export const JWT_CONSTANTS = {
  SECRET_KEY: process.env.JWT_SECRET as string,
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SALT_ROUNDS: 12,
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 1000,
  MESSAGE: 'Muitas requisições deste IP, tente novamente mais tarde.',
} as const;

// File Upload
export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Pagination
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Health Check
export const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

// User Roles
export enum USER_ROLES {
  ADMINISTRADOR = 'ADMINISTRADOR',
  INSTRUTOR = 'INSTRUTOR',
  ENCARREGADO = 'ENCARREGADO',
  APRENDIZ = 'APRENDIZ',
}

// Request Status
export enum REQUEST_STATUS {
  EM_ANALISE = 'EM_ANALISE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
}

// User Phases
export enum USER_PHASES {
  PHASE_1 = '1',
  PHASE_2 = '2',
  PHASE_3 = '3',
  PHASE_4 = '4',
  PHASE_5 = '5',
  PHASE_6 = '6',
  PHASE_7 = '7',
  PHASE_8 = '8',
  PHASE_9 = '9',
  PHASE_10 = '10',
  PHASE_11 = '11',
  PHASE_12 = '12',
  PHASE_13 = '13',
  PHASE_14 = '14',
  PHASE_15 = '15',
  PHASE_16 = '16',
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Email ou senha estão incorretos',
  TOKEN_NOT_PROVIDED: 'Token não fornecido',
  INVALID_TOKEN: 'Token inválido',
  TOKEN_EXPIRED: 'Token expirado',
  USER_NOT_APPROVED: 'Sua solicitação ainda não foi aprovada. Aguarde a aprovação do professor.',
  USER_NOT_FOUND: 'Usuário não encontrado',
  EMAIL_ALREADY_EXISTS: 'Este email já está sendo usado. Tente fazer login ou use outro email.',

  // Authorization
  ACCESS_DENIED: 'Acesso negado',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes',

  // Validation
  REQUIRED_FIELD: (field: string) => `${field} é obrigatório`,
  INVALID_FIELD: (field: string) => `${field} inválido`,
  MIN_LENGTH: (field: string, min: number) => `${field} deve ter pelo menos ${min} caracteres`,
  MAX_LENGTH: (field: string, max: number) => `${field} deve ter no máximo ${max} caracteres`,

  // Business Logic
  CHURCH_NOT_FOUND: 'Igreja não encontrada',
  INVALID_CHURCH: 'Igreja inválida',
  ENCARREGADO_EXISTS: 'Já existe um Encarregado nesta igreja',
  REQUEST_ALREADY_EXISTS: 'Já existe uma solicitação pendente para este usuário',
  INVALID_ROLE: 'Função deve ser ADMINISTRADOR, INSTRUTOR, ENCARREGADO ou APRENDIZ',
  INVALID_PHASE: 'Fase deve ser um valor entre 1 e 16',

  // System
  INTERNAL_ERROR: 'Erro interno do servidor',
  DATABASE_ERROR: 'Erro de banco de dados',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login realizado com sucesso',
  REGISTER_SUCCESS: 'Sua solicitação foi enviada com sucesso! Aguarde a aprovação.',
  USER_CREATED: 'Usuário criado com sucesso',
  USER_UPDATED: 'Usuário atualizado com sucesso',
  USER_DELETED: 'Usuário excluído com sucesso',
  USER_STATUS_TOGGLED: (active: boolean) => `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`,
  REQUEST_APPROVED: 'Solicitação aprovada com sucesso',
  REQUEST_CREATED: 'Solicitação criada com sucesso',
} as const;
