import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const MOJIBAKE = /Ã|Â|â|�/

function walk(dir: string, files: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'coverage' || name === 'migrations') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(ts|js|json)$/.test(name) && !name.endsWith('.spec.ts')) files.push(full)
  }
  return files
}

describe('Codificación UTF-8 del backend', () => {
  it('no introduce mojibake en el código fuente ni en los seeds', () => {
    const files = walk(join(__dirname, '..'))
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect({ file, match: source.match(MOJIBAKE)?.[0] ?? null }).toEqual({ file, match: null })
    }
  })
})
