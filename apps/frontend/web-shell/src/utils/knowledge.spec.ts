import { describe, expect, it } from 'vitest'
import { knowledgeExcerpt, parseKnowledgeTags } from '@/types/knowledge.types'

describe('Presentación de conocimiento', () => {
  it('separa etiquetas en chips', () => {
    expect(parseKnowledgeTags('contraseña, acceso, cuenta, administrador')).toEqual([
      'contraseña',
      'acceso',
      'cuenta',
      'administrador',
    ])
  })

  it('genera un extracto del contenido', () => {
    expect(knowledgeExcerpt('Texto breve')).toBe('Texto breve')
    expect(knowledgeExcerpt('a'.repeat(200)).endsWith('…')).toBe(true)
  })
})
