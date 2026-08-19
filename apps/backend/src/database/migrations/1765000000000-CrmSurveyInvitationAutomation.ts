import { MigrationInterface, QueryRunner } from 'typeorm'

export class CrmSurveyInvitationAutomation1765000000000 implements MigrationInterface {
  name = 'CrmSurveyInvitationAutomation1765000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" ADD COLUMN IF NOT EXISTS "created_by" uuid`)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" ADD COLUMN IF NOT EXISTS "trigger" "crm_survey_trigger_enum"`)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz`)
    await queryRunner.query(`
      UPDATE "crm_survey_invitations" invitation
      SET "trigger" = survey."trigger"
      FROM "crm_surveys" survey
      WHERE invitation."survey_id" = survey."id" AND invitation."trigger" IS NULL
    `)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" ALTER COLUMN "trigger" SET DEFAULT 'MANUAL'`)
    await queryRunner.query(`UPDATE "crm_survey_invitations" SET "trigger" = 'MANUAL' WHERE "trigger" IS NULL`)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" ALTER COLUMN "trigger" SET NOT NULL`)
    await queryRunner.query(`
      ALTER TABLE "crm_survey_invitations"
      DROP CONSTRAINT IF EXISTS "fk_crm_survey_invitations_created_by"
    `)
    await queryRunner.query(`
      ALTER TABLE "crm_survey_invitations"
      ADD CONSTRAINT "fk_crm_survey_invitations_created_by"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `)
    await queryRunner.query(`
      UPDATE "crm_surveys" AS survey
      SET "status" = 'CLOSED'
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "trigger" ORDER BY "created_at" ASC, "id" ASC) AS row_number
        FROM "crm_surveys"
        WHERE "status" = 'PUBLISHED' AND "trigger" <> 'MANUAL'
      ) AS ranked
      WHERE survey."id" = ranked."id" AND ranked.row_number > 1
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_crm_survey_published_auto_trigger"
      ON "crm_surveys" ("trigger")
      WHERE "status" = 'PUBLISHED' AND "trigger" <> 'MANUAL'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_crm_survey_published_auto_trigger"`)
    await queryRunner.query(`
      ALTER TABLE "crm_survey_invitations"
      DROP CONSTRAINT IF EXISTS "fk_crm_survey_invitations_created_by"
    `)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" DROP COLUMN IF EXISTS "revoked_at"`)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" DROP COLUMN IF EXISTS "trigger"`)
    await queryRunner.query(`ALTER TABLE "crm_survey_invitations" DROP COLUMN IF EXISTS "created_by"`)
  }
}
