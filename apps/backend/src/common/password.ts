import { randomInt } from 'crypto'
import { validatePasswordPolicy } from './validation'

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%&*-_'
const ALL = `${UPPER}${LOWER}${DIGITS}${SYMBOLS}`

function pick(alphabet: string) {
  return alphabet[randomInt(alphabet.length)]
}

export function generateTemporaryPassword() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)]
    while (chars.length < 12) chars.push(pick(ALL))
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    const password = `Tf-${chars.join('')}`
    if (validatePasswordPolicy(password).ok) return password
  }
  throw new Error('No se pudo generar una contraseña temporal válida')
}
