import { MigrationInterface, QueryRunner } from 'typeorm'
import { KNOWLEDGE_SEED_ARTICLES } from '../../knowledge/articles.seed'

export class MustChangePasswordAndKnowledge1763000000000 implements MigrationInterface {
  name = 'MustChangePasswordAndKnowledge1763000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false`,
    )

    await queryRunner.query(`
      UPDATE "ticket_history"
      SET "reason" = replace("reason", 'asumiÃ³', 'asumió')
      WHERE "reason" LIKE '%asumiÃ³%'
    `)
    await queryRunner.query(`
      UPDATE "ticket_comments"
      SET "body" = replace("body", 'asumiÃ³', 'asumió')
      WHERE "body" LIKE '%asumiÃ³%'
    `)
    await queryRunner.query(`
      UPDATE "knowledge_articles"
      SET "title" = replace("title", 'contraseÃ±a', 'contraseña'),
          "content" = replace("content", 'contraseÃ±a', 'contraseña')
      WHERE "title" LIKE '%contraseÃ±a%' OR "content" LIKE '%contraseÃ±a%'
    `)

    const author = await queryRunner.query(
      `SELECT u.id FROM "users" u INNER JOIN "roles" r ON r.id = u.role_id WHERE r.code = 'ADMIN' ORDER BY u.created_at ASC LIMIT 1`,
    )
    const authorId = author[0]?.id as string | undefined
    if (!authorId) return

    const categories = (await queryRunner.query(`SELECT id, name FROM "categories"`)) as Array<{
      id: string
      name: string
    }>
    const categoryByName = new Map(categories.map((item) => [item.name, item.id]))

    for (const article of KNOWLEDGE_SEED_ARTICLES) {
      const categoryId = article.categoryName ? (categoryByName.get(article.categoryName) ?? null) : null
      const existing = (await queryRunner.query(`SELECT id FROM "knowledge_articles" WHERE title = $1 LIMIT 1`, [
        article.title,
      ])) as Array<{ id: string }>

      if (existing[0]) {
        await queryRunner.query(
          `UPDATE "knowledge_articles"
           SET "content" = $2, "tags" = $3, "category_id" = $4, "status" = 'ACTIVE', "updated_at" = now()
           WHERE "id" = $1`,
          [existing[0].id, article.content, article.tags, categoryId],
        )
      } else {
        await queryRunner.query(
          `INSERT INTO "knowledge_articles" ("title", "content", "tags", "status", "category_id", "author_id")
           VALUES ($1, $2, $3, 'ACTIVE', $4, $5)`,
          [article.title, article.content, article.tags, categoryId, authorId],
        )
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "must_change_password"`)
  }
}
