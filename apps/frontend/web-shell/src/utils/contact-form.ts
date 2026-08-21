import { LIMITS } from '@/constants/validation'
import { maxLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export const EMPTY_CONTACT_FORM = {
  clientId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
}

export type ContactFormValues = typeof EMPTY_CONTACT_FORM
export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>

export function validateContactForm(form: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {}
  const client = requiredTrimmed(form.clientId, 'El cliente')
  if (client) errors.clientId = 'Selecciona un cliente'
  const firstName = requiredTrimmed(form.firstName, 'El nombre') ?? maxLengthAfterTrim(form.firstName, 'El nombre', LIMITS.CONTACT_NAME)
  if (firstName) errors.firstName = firstName
  const lastName = requiredTrimmed(form.lastName, 'El apellido') ?? maxLengthAfterTrim(form.lastName, 'El apellido', LIMITS.CONTACT_NAME)
  if (lastName) errors.lastName = lastName
  const email = requiredTrimmed(form.email, 'El correo')
  if (email) errors.email = email
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'El correo no es válido'
  const job = maxLengthAfterTrim(form.jobTitle, 'El puesto', LIMITS.CONTACT_JOB)
  if (job) errors.jobTitle = job
  return errors
}
