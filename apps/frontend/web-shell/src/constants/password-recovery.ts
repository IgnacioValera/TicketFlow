export const FORGOT_PASSWORD_LINK = '¿Olvidaste tu contraseña?'

export const ACCESS_RECOVERY_TITLE = 'Recuperación de acceso'

export const ACCESS_RECOVERY_INSTRUCTIONS = [
  'Por seguridad, TicketFlow no recupera ni muestra contraseñas existentes. Solicita a un administrador que restablezca tu acceso.',
  'El administrador te proporcionará una contraseña temporal que deberás cambiar al iniciar sesión.',
] as const

export const ACCESS_RECOVERY_COPY_TEXT = ACCESS_RECOVERY_INSTRUCTIONS.join('\n\n')
