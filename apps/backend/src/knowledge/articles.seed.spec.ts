import { KNOWLEDGE_SEED_ARTICLES } from './articles.seed'

describe('Artículos de conocimiento', () => {
  it('incluye el flujo real de restablecimiento sin correo ni enlaces', () => {
    const article = KNOWLEDGE_SEED_ARTICLES.find((item) => item.title === 'Cómo restablecer la contraseña')
    expect(article).toBeDefined()
    expect(article?.content).toMatch(/administrador/i)
    expect(article?.content).not.toMatch(/correo institucional/i)
    expect(article?.content).not.toMatch(/enlace recibido/i)
    expect(article?.content).not.toMatch(/SMS/i)
  })

  it('no duplica títulos y cubre al menos diez artículos útiles', () => {
    const titles = KNOWLEDGE_SEED_ARTICLES.map((item) => item.title)
    expect(new Set(titles).size).toBe(titles.length)
    expect(titles.length).toBeGreaterThanOrEqual(11)
  })

  it('conserva acentos en títulos y contenidos', () => {
    const joined = KNOWLEDGE_SEED_ARTICLES.map((item) => `${item.title} ${item.content}`).join('\n')
    expect(joined).toMatch(/contraseña/)
    expect(joined).toMatch(/información|atención|resolución|Asignación/)
    expect(joined).not.toMatch(/Ã|Â|�/)
  })

  it('mantiene títulos estables para evitar duplicados al re-sembrar', () => {
    const titles = KNOWLEDGE_SEED_ARTICLES.map((item) => item.title.trim().toLowerCase())
    expect(titles.length).toBe(new Set(titles).size)
  })
})
