import { MigrationInterface, QueryRunner } from 'typeorm'

export class TicketHistorySystemActor1767000000000 implements MigrationInterface {
  name = 'TicketHistorySystemActor1767000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_history_actor_type_enum" AS ENUM ('USER', 'SYSTEM');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `)
    await queryRunner.query(`
      ALTER TABLE "ticket_history"
      ADD COLUMN IF NOT EXISTS "actor_type" "ticket_history_actor_type_enum" NOT NULL DEFAULT 'USER'
    `)
    await queryRunner.query(`
      ALTER TABLE "ticket_history"
      ADD COLUMN IF NOT EXISTS "actor_name" varchar(160)
    `)
    await queryRunner.query(`
      ALTER TABLE "ticket_history"
      ALTER COLUMN "changed_by" DROP NOT NULL
    `)
    await queryRunner.query(`
      UPDATE "ticket_history" AS history
      SET "actor_name" = users."full_name"
      FROM "users"
      WHERE history."changed_by" = users."id"
        AND history."actor_name" IS NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ticket_history_event_id"
      ON "ticket_history" ((details->>'eventId'))
      WHERE details ? 'eventId'
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_ticket_history_ai_event"
      ON "ticket_history" ("ticket_id", (details->>'eventId'), "event_type")
      WHERE "event_type" IN ('AI_ASSIGNED', 'AI_ASSIGNMENT_FAILED') AND details ? 'eventId'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_ticket_history_ai_event"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_history_event_id"`)
    await queryRunner.query(`DELETE FROM "ticket_history" WHERE "changed_by" IS NULL`)
    await queryRunner.query(`ALTER TABLE "ticket_history" ALTER COLUMN "changed_by" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "ticket_history" DROP COLUMN IF EXISTS "actor_name"`)
    await queryRunner.query(`ALTER TABLE "ticket_history" DROP COLUMN IF EXISTS "actor_type"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_history_actor_type_enum"`)
  }
}
