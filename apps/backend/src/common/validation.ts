import { BadRequestException } from '@nestjs/common'
import { Transform } from 'class-transformer'
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { LIMITS } from './limits'

export function Trim() {
  return Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
}

export function NormalizeEmail() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
}

export function maxLengthMessage(field: string, max: number) {
  return `${field} no puede superar ${max} caracteres`
}

export function requiredMessage(field: string) {
  return `${field} es obligatorio y no puede contener solo espacios`
}

export function minLengthMessage(field: string, min: number) {
  return `${field} debe tener al menos ${min} caracteres`
}

export function assertSlaHours(responseHours: number, resolutionHours: number) {
  if (!Number.isInteger(responseHours) || responseHours <= 0) {
    throw new BadRequestException('El tiempo de respuesta debe ser un entero positivo')
  }
  if (!Number.isInteger(resolutionHours) || resolutionHours <= 0) {
    throw new BadRequestException('El tiempo de resolución debe ser un entero positivo')
  }
  if (resolutionHours < responseHours) {
    throw new BadRequestException('El tiempo de resolución debe ser mayor o igual que el tiempo de respuesta')
  }
}

export function assertDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return
  if (startDate && Number.isNaN(Date.parse(startDate))) {
    throw new BadRequestException('La fecha inicial no tiene un formato válido')
  }
  if (endDate && Number.isNaN(Date.parse(endDate))) {
    throw new BadRequestException('La fecha final no tiene un formato válido')
  }
  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException('La fecha inicial debe ser menor o igual que la fecha final')
  }
}

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string }

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length > 0 && (password[0] === ' ' || password[password.length - 1] === ' ')) {
    return { ok: false, message: 'La contraseña no puede comenzar ni terminar con espacios' }
  }
  if (password.length < LIMITS.PASSWORD_MIN_CHARS) {
    return { ok: false, message: `La contraseña debe tener al menos ${LIMITS.PASSWORD_MIN_CHARS} caracteres` }
  }
  if (Buffer.byteLength(password, 'utf8') > LIMITS.PASSWORD_MAX_BYTES) {
    return { ok: false, message: `La contraseña no puede superar ${LIMITS.PASSWORD_MAX_BYTES} bytes UTF-8 (límite de bcrypt)` }
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos una letra mayúscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos una letra minúscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos un número' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos un símbolo' }
  }
  return { ok: true }
}

export function IsPasswordPolicy(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPasswordPolicy',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && validatePasswordPolicy(value).ok
        },
        defaultMessage(args: ValidationArguments) {
          if (typeof args.value !== 'string') return 'La contraseña es inválida'
          const result = validatePasswordPolicy(args.value)
          return result.ok ? 'La contraseña es inválida' : result.message
        },
      },
    })
  }
}

@ValidatorConstraint({ name: 'slaHoursOrder', async: false })
export class SlaHoursOrderConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as { responseHours?: number; resolutionHours?: number }
    if (object.responseHours == null || object.resolutionHours == null) return true
    return object.resolutionHours >= object.responseHours
  }

  defaultMessage() {
    return 'El tiempo de resolución debe ser mayor o igual que el tiempo de respuesta'
  }
}

@ValidatorConstraint({ name: 'dateRangeOrder', async: false })
export class DateRangeOrderConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as { startDate?: string; endDate?: string }
    if (!object.startDate || !object.endDate) return true
    return object.startDate <= object.endDate
  }

  defaultMessage() {
    return 'La fecha inicial debe ser menor o igual que la fecha final'
  }
}
