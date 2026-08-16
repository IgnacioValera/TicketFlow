import { MigrationInterface, QueryRunner } from 'typeorm'

export class CrmSchema1762000000000 implements MigrationInterface {
  name = 'CrmSchema1762000000000'
  transaction = false

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "roles_code_enum" ADD VALUE IF NOT EXISTS 'SALES'`)
    await queryRunner.query(`ALTER TYPE "roles_code_enum" ADD VALUE IF NOT EXISTS 'CLIENT'`)

    await queryRunner.query(`CREATE TYPE "client_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT')`)
    await queryRunner.query(`CREATE TYPE "client_segment_enum" AS ENUM ('ENTERPRISE', 'MID_MARKET', 'SMB')`)
    await queryRunner.query(`CREATE TYPE "opportunity_stage_enum" AS ENUM ('NEW', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')`)
    await queryRunner.query(`CREATE TYPE "crm_activity_type_enum" AS ENUM ('CALL', 'MEETING', 'TASK', 'NOTE')`)
    await queryRunner.query(`CREATE TYPE "crm_activity_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED')`)
    await queryRunner.query(`CREATE TYPE "crm_survey_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED')`)
    await queryRunner.query(`CREATE TYPE "crm_survey_trigger_enum" AS ENUM ('MANUAL', 'OPPORTUNITY_WON')`)
    await queryRunner.query(`CREATE TYPE "crm_question_type_enum" AS ENUM ('TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'NPS', 'RATING', 'YES_NO')`)

    await queryRunner.query(`ALTER TABLE "companies" RENAME TO "clients"`)
    await queryRunner.query(`ALTER TABLE "clients" RENAME COLUMN "contact_email" TO "email"`)
    await queryRunner.query(`ALTER TABLE "clients" RENAME COLUMN "contact_phone" TO "phone"`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" TYPE "client_status_enum" USING "status"::text::"client_status_enum"`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`)
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "segment" "client_segment_enum" NOT NULL DEFAULT 'SMB'`)
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "owner_id" uuid`)
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "score" int NOT NULL DEFAULT 50`)
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL`)

    await queryRunner.query(`ALTER TABLE "tickets" RENAME COLUMN "company_id" TO "client_id"`)

    await queryRunner.query(`
      CREATE TABLE "crm_contacts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "first_name" varchar(80) NOT NULL,
        "last_name" varchar(80) NOT NULL,
        "email" varchar(200) NOT NULL,
        "phone" varchar(40) NOT NULL DEFAULT '',
        "job_title" varchar(120) NOT NULL DEFAULT '',
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_crm_contacts_client" ON "crm_contacts" ("client_id")`)

    await queryRunner.query(`
      CREATE TABLE "crm_opportunities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "contact_id" uuid REFERENCES "crm_contacts"("id") ON DELETE SET NULL,
        "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "title" varchar(200) NOT NULL,
        "amount" double precision NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'MXN',
        "probability" int NOT NULL DEFAULT 10,
        "stage" "opportunity_stage_enum" NOT NULL DEFAULT 'NEW',
        "expected_close_date" date,
        "lost_reason" text,
        "notes" text NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_crm_opportunities_client" ON "crm_opportunities" ("client_id")`)
    await queryRunner.query(`CREATE INDEX "idx_crm_opportunities_stage" ON "crm_opportunities" ("stage")`)

    await queryRunner.query(`
      CREATE TABLE "crm_opportunity_stage_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "opportunity_id" uuid NOT NULL REFERENCES "crm_opportunities"("id") ON DELETE CASCADE,
        "changed_by" uuid NOT NULL REFERENCES "users"("id"),
        "old_stage" "opportunity_stage_enum",
        "new_stage" "opportunity_stage_enum" NOT NULL,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "crm_activities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "opportunity_id" uuid REFERENCES "crm_opportunities"("id") ON DELETE SET NULL,
        "contact_id" uuid REFERENCES "crm_contacts"("id") ON DELETE SET NULL,
        "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "type" "crm_activity_type_enum" NOT NULL,
        "status" "crm_activity_status_enum" NOT NULL DEFAULT 'PENDING',
        "subject" varchar(200) NOT NULL,
        "body" text NOT NULL DEFAULT '',
        "due_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_crm_activities_client" ON "crm_activities" ("client_id")`)

    await queryRunner.query(`
      CREATE TABLE "crm_surveys" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "status" "crm_survey_status_enum" NOT NULL DEFAULT 'DRAFT',
        "trigger" "crm_survey_trigger_enum" NOT NULL DEFAULT 'MANUAL',
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "crm_survey_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "survey_id" uuid NOT NULL REFERENCES "crm_surveys"("id") ON DELETE CASCADE,
        "prompt" text NOT NULL,
        "type" "crm_question_type_enum" NOT NULL,
        "required" boolean NOT NULL DEFAULT true,
        "position" int NOT NULL DEFAULT 0
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "crm_survey_question_options" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL REFERENCES "crm_survey_questions"("id") ON DELETE CASCADE,
        "label" varchar(200) NOT NULL,
        "value" varchar(80) NOT NULL DEFAULT '',
        "position" int NOT NULL DEFAULT 0
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "crm_survey_invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "survey_id" uuid NOT NULL REFERENCES "crm_surveys"("id") ON DELETE CASCADE,
        "opportunity_id" uuid REFERENCES "crm_opportunities"("id") ON DELETE CASCADE,
        "contact_id" uuid REFERENCES "crm_contacts"("id") ON DELETE SET NULL,
        "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_crm_invitation_opportunity_survey" ON "crm_survey_invitations" ("opportunity_id", "survey_id") WHERE "opportunity_id" IS NOT NULL`)

    await queryRunner.query(`
      CREATE TABLE "crm_survey_responses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invitation_id" uuid NOT NULL UNIQUE REFERENCES "crm_survey_invitations"("id") ON DELETE CASCADE,
        "survey_id" uuid NOT NULL REFERENCES "crm_surveys"("id") ON DELETE CASCADE,
        "nps_score" smallint,
        "submitted_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "crm_survey_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "response_id" uuid NOT NULL REFERENCES "crm_survey_responses"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "crm_survey_questions"("id") ON DELETE CASCADE,
        "text_value" text,
        "number_value" smallint,
        "option_ids" jsonb
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_survey_answers"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_survey_responses"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_survey_invitations"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_survey_question_options"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_survey_questions"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_surveys"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_activities"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_opportunity_stage_history"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_opportunities"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_contacts"`)
    await queryRunner.query(`ALTER TABLE "tickets" RENAME COLUMN "client_id" TO "company_id"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_owner_id_fkey"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "updated_at"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "created_at"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "score"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "owner_id"`)
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "segment"`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" TYPE "catalog_status_enum" USING "status"::text::"catalog_status_enum"`)
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`)
    await queryRunner.query(`ALTER TABLE "clients" RENAME COLUMN "phone" TO "contact_phone"`)
    await queryRunner.query(`ALTER TABLE "clients" RENAME COLUMN "email" TO "contact_email"`)
    await queryRunner.query(`ALTER TABLE "clients" RENAME TO "companies"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_question_type_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_survey_trigger_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_survey_status_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_activity_status_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_activity_type_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "opportunity_stage_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "client_segment_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "client_status_enum"`)
  }
}
