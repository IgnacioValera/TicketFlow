import { MigrationInterface, QueryRunner } from 'typeorm'

export class ActivityHistory1765000000000 implements MigrationInterface {
  name = 'ActivityHistory1765000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "crm_activity_history_action_enum" AS ENUM ('CREATED', 'UPDATED', 'COMPLETED', 'CANCELLED')`)
    await queryRunner.query(`CREATE TABLE "crm_activity_history" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "activity_id" uuid NOT NULL REFERENCES "crm_activities"("id") ON DELETE CASCADE, "changed_by" uuid NOT NULL REFERENCES "users"("id"), "action" "crm_activity_history_action_enum" NOT NULL, "details" jsonb, "created_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "idx_crm_activity_history_activity" ON "crm_activity_history" ("activity_id", "created_at")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "crm_activity_history"`)
    await queryRunner.query(`DROP TYPE "crm_activity_history_action_enum"`)
  }
}