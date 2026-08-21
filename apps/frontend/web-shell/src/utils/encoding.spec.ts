import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { assignmentDescription, TICKET_FLOW_COPY } from '@/views/tickets/ticket-flow-copy'

const MOJIBAKE = /Ã|Â|â|�/

function walk(dir: string, files: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, files)
      continue
    }
    if (name.endsWith('.spec.ts')) continue
    if (/\.(ts|tsx|json)$/.test(name)) files.push(full)
  }
  return files
}

describe('Codificación del flujo visual', () => {
  it('expone los textos con acentos correctos', () => {
    expect(TICKET_FLOW_COPY.conversation).toBe('Conversación')
    expect(TICKET_FLOW_COPY.timeline).toBe('Cronología')
    expect(TICKET_FLOW_COPY.assignment).toBe('Asignación')
    expect(TICKET_FLOW_COPY.attention).toBe('Atención')
    expect(TICKET_FLOW_COPY.technicalAnalysis).toBe('Análisis técnico')
    expect(TICKET_FLOW_COPY.duration).toBe('Duración')
    expect(TICKET_FLOW_COPY.only).toBe('Sólo')
    expect(TICKET_FLOW_COPY.loadingHistory).toBe('Cargando historial…')
    expect(TICKET_FLOW_COPY.emptyEvents).toBe('Este ticket todavía no tiene eventos registrados.')
    expect(assignmentDescription('Agente Soporte')).toBe(
      'Agente Soporte asumió la responsabilidad operativa del caso.',
    )
  })

  it('no contiene mojibake en los archivos de la interfaz', () => {
    const files = walk(join(process.cwd(), 'src'))
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect({ file, match: source.match(MOJIBAKE)?.[0] ?? null }).toEqual({ file, match: null })
    }
  })
})
