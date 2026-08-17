import { MigrationInterface, QueryRunner } from 'typeorm'

const REPLACEMENTS: Array<[string, string]> = [
  ['asumiÃ³', 'asumió'],
  ['contraseÃ±a', 'contraseña'],
  ['CONVERSACIÃ“N', 'CONVERSACIÓN'],
  ['CronologÃ­a', 'Cronología'],
  ['AsignaciÃ³n', 'Asignación'],
  ['ClasificaciÃ³n', 'Clasificación'],
  ['AtenciÃ³n', 'Atención'],
  ['AnÃ¡lisis tÃ©cnico', 'Análisis técnico'],
  ['DuraciÃ³n', 'Duración'],
  ['SÃ³lo', 'Sólo'],
  ['LÃ­mite', 'Límite'],
  ['LÃ­nea', 'Línea'],
  ['resoluciÃ³n', 'resolución'],
  ['informaciÃ³n', 'información'],
  ['âˆ’', '-'],
]

const TARGETS: Array<[string, string[]]> = [
  ['ticket_history', ['reason']],
  ['ticket_comments', ['body']],
  ['tickets', ['title', 'description']],
  ['knowledge_articles', ['title', 'content', 'tags']],
]

export class RepairMojibakeTexts1764000000000 implements MigrationInterface {
  name = 'RepairMojibakeTexts1764000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, columns] of TARGETS) {
      const exists = await queryRunner.query(`SELECT to_regclass('public.${table}') AS name`)
      if (!exists[0]?.name) continue
      for (const column of columns) {
        for (const [broken, fixed] of REPLACEMENTS) {
          await queryRunner.query(
            `UPDATE "${table}" SET "${column}" = replace("${column}", $1, $2) WHERE "${column}" LIKE $3`,
            [broken, fixed, `%${broken}%`],
          )
        }
      }
    }
  }

  async down(): Promise<void> {
    return
  }
}
