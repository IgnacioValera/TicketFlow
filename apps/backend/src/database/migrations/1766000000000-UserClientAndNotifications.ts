import { MigrationInterface, QueryRunner } from 'typeorm'

export class UserClientAndNotifications1766000000000 implements MigrationInterface {
  name = 'UserClientAndNotifications1766000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "client_id" uuid`)
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_client"
    `)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_client"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_client_id" ON "users" ("client_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tickets_client_id" ON "tickets" ("client_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tickets_requester_id" ON "tickets" ("requester_id")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_user_id" uuid NOT NULL,
        "actor_user_id" uuid,
        "ticket_id" uuid,
        "dedupe_key" varchar(120) NOT NULL,
        "type" varchar(40) NOT NULL,
        "title" varchar(160) NOT NULL,
        "message" varchar(280) NOT NULL,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "fk_notifications_recipient"
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "fk_notifications_recipient"
      FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "fk_notifications_actor"
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "fk_notifications_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "fk_notifications_ticket"
    `)
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "fk_notifications_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_notifications_recipient_dedupe"
      ON "notifications" ("recipient_user_id", "dedupe_key")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_created"
      ON "notifications" ("recipient_user_id", "created_at" DESC)
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_unread"
      ON "notifications" ("recipient_user_id") WHERE "read_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_requester_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_client_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_client_id"`)
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_client"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "client_id"`)
  }
}
