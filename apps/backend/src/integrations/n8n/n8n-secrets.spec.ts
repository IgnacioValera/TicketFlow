import { secretsMatch } from './n8n-secrets'

describe('Comparación de secretos n8n', () => {
  it('acepta la clave correcta y rechaza la incorrecta o vacía', () => {
    const expected = 'integration-key-at-least-32-characters-long'
    expect(secretsMatch(expected, expected)).toBe(true)
    expect(secretsMatch('otra-clave', expected)).toBe(false)
    expect(secretsMatch(undefined, expected)).toBe(false)
    expect(secretsMatch(expected, undefined)).toBe(false)
  })
})
