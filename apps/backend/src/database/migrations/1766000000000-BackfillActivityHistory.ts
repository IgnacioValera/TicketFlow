import { MigrationInterface, QueryRunner } from 'typeorm'

export class BackfillActivityHistory1766000000000 implements MigrationInterface {
  name = 'BackfillActivityHistory1766000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "crm_activity_history" ("activity_id", "changed_by", "action", "details", "created_at")
      SELECT a."id", COALESCE(a."owner_id", (SELECT u."id" FROM "users" u ORDER BY u."created_at" ASC LIMIT 1)), 'CREATED', '{"source":"backfill"}'::jsonb, a."created_at"
      FROM "crm_activities" a
      WHERE NOT EXISTS (SELECT 1 FROM "crm_activity_history" h WHERE h."activity_id" = a."id")
    `)
    await queryRunner.query(`
      INSERT INTO "crm_activity_history" ("activity_id", "changed_by", "action", "details", "created_at")
      SELECT a."id", COALESCE(a."owner_id", (SELECT u."id" FROM "users" u ORDER BY u."created_at" ASC LIMIT 1)), a."status"::text::"crm_activity_history_action_enum", '{"source":"backfill"}'::jsonb, COALESCE(a."completed_at", a."updated_at")
      FROM "crm_activities" a
      WHERE a."status" IN ('COMPLETED', 'CANCELLED')
        AND NOT EXISTS (SELECT 1 FROM "crm_activity_history" h WHERE h."activity_id" = a."id" AND h."action" = a."status"::text::"crm_activity_history_action_enum")
    `)
  }

  async down(): Promise<void> {}
}