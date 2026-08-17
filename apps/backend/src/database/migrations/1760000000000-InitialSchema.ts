import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)
    await queryRunner.query(`CREATE TYPE "roles_code_enum" AS ENUM ('ADMIN','SUPERVISOR','AGENT','REQUESTER')`)
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('ACTIVE','INACTIVE','LOCKED')`)
    await queryRunner.query(`CREATE TYPE "catalog_status_enum" AS ENUM ('ACTIVE','INACTIVE')`)
    await queryRunner.query(`CREATE TYPE "priority_level_enum" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL')`)
    await queryRunner.query(`CREATE TYPE "company_tier_enum" AS ENUM ('BRONZE','SILVER','GOLD','PLATINUM')`)
    await queryRunner.query(`CREATE TYPE "ticket_status_enum" AS ENUM ('OPEN','ASSIGNED','IN_PROGRESS','WAITING_USER','ESCALATED','RESOLVED','CLOSED','CANCELLED')`)

    await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" varchar(80) NOT NULL UNIQUE, "name" varchar(120) NOT NULL)`)
    await queryRunner.query(`CREATE TABLE "roles" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" "roles_code_enum" NOT NULL UNIQUE, "name" varchar(80) NOT NULL)`)
    await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE, "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE, PRIMARY KEY ("role_id","permission_id"))`)
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "full_name" varchar(160) NOT NULL, "email" varchar(200) NOT NULL UNIQUE, "password_hash" varchar NOT NULL, "status" "users_status_enum" NOT NULL DEFAULT 'ACTIVE', "role_id" uuid NOT NULL REFERENCES "roles"("id"), "last_login_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "token_hash" varchar(64) NOT NULL UNIQUE, "expires_at" timestamptz NOT NULL, "revoked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`)

    await queryRunner.query(`CREATE TABLE "categories" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(120) NOT NULL UNIQUE, "description" text NOT NULL DEFAULT '', "status" "catalog_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE TABLE "priorities" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(80) NOT NULL UNIQUE, "level" "priority_level_enum" NOT NULL UNIQUE, "color" varchar(20) NOT NULL DEFAULT '#247b7b', "description" text NOT NULL DEFAULT '', "status" "catalog_status_enum" NOT NULL DEFAULT 'ACTIVE')`)
    await queryRunner.query(`CREATE TABLE "sla_policies" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(120) NOT NULL UNIQUE, "priority_id" uuid NOT NULL UNIQUE REFERENCES "priorities"("id"), "response_hours" int NOT NULL CHECK ("response_hours" > 0), "resolution_hours" int NOT NULL CHECK ("resolution_hours" > 0), "status" "catalog_status_enum" NOT NULL DEFAULT 'ACTIVE')`)
    await queryRunner.query(`CREATE TABLE "companies" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL UNIQUE, "industry" varchar(100) NOT NULL DEFAULT '', "region" varchar(100) NOT NULL DEFAULT '', "tier" "company_tier_enum" NOT NULL DEFAULT 'BRONZE', "contact_email" varchar(200) NOT NULL DEFAULT '', "contact_phone" varchar(40) NOT NULL DEFAULT '', "status" "catalog_status_enum" NOT NULL DEFAULT 'ACTIVE')`)
    await queryRunner.query(`CREATE TABLE "ticket_counters" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "year" int NOT NULL UNIQUE, "value" int NOT NULL DEFAULT 0)`)

    await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "folio" varchar(30) NOT NULL UNIQUE, "title" varchar(200) NOT NULL, "description" text NOT NULL, "status" "ticket_status_enum" NOT NULL DEFAULT 'OPEN', "category_id" uuid NOT NULL REFERENCES "categories"("id"), "priority_id" uuid NOT NULL REFERENCES "priorities"("id"), "requester_id" uuid NOT NULL REFERENCES "users"("id"), "assignee_id" uuid REFERENCES "users"("id"), "company_id" uuid REFERENCES "companies"("id"), "sla_created_at" timestamptz NOT NULL, "sla_due_at" timestamptz NOT NULL, "resolution_hours" int NOT NULL, "closed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "IDX_tickets_status_created" ON "tickets" ("status","created_at")`)
    await queryRunner.query(`CREATE INDEX "IDX_tickets_requester" ON "tickets" ("requester_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_tickets_assignee" ON "tickets" ("assignee_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_tickets_sla_due" ON "tickets" ("sla_due_at")`)

    await queryRunner.query(`CREATE TABLE "ticket_comments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE, "author_id" uuid NOT NULL REFERENCES "users"("id"), "body" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "IDX_comments_ticket" ON "ticket_comments" ("ticket_id","created_at")`)
    await queryRunner.query(`CREATE TABLE "ticket_attachments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE, "uploaded_by" uuid NOT NULL REFERENCES "users"("id"), "file_name" varchar(255) NOT NULL, "stored_name" varchar(255) NOT NULL, "mime_type" varchar(150) NOT NULL, "size_bytes" int NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE TABLE "ticket_history" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE, "changed_by" uuid NOT NULL REFERENCES "users"("id"), "event_type" varchar(40) NOT NULL DEFAULT 'STATUS_CHANGED', "old_status" "ticket_status_enum", "new_status" "ticket_status_enum" NOT NULL, "reason" text, "details" jsonb, "created_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "IDX_history_ticket" ON "ticket_history" ("ticket_id","created_at")`)
    await queryRunner.query(`CREATE TABLE "satisfaction_surveys" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "ticket_id" uuid NOT NULL UNIQUE REFERENCES "tickets"("id") ON DELETE CASCADE, "submitted_by" uuid NOT NULL REFERENCES "users"("id"), "rating" smallint NOT NULL CHECK ("rating" BETWEEN 1 AND 5), "comment" text, "submitted_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE TABLE "knowledge_articles" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(200) NOT NULL, "content" text NOT NULL, "tags" varchar(220) NOT NULL DEFAULT '', "status" "catalog_status_enum" NOT NULL DEFAULT 'ACTIVE', "category_id" uuid REFERENCES "categories"("id"), "author_id" uuid NOT NULL REFERENCES "users"("id"), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`)
    await queryRunner.query(`CREATE INDEX "IDX_knowledge_search" ON "knowledge_articles" USING GIN (to_tsvector('spanish', "title" || ' ' || "content" || ' ' || "tags"))`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['knowledge_articles','satisfaction_surveys','ticket_history','ticket_attachments','ticket_comments','tickets','ticket_counters','companies','sla_policies','priorities','categories','refresh_tokens','users','role_permissions','roles','permissions']) await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`)
    for (const type of ['ticket_status_enum','company_tier_enum','priority_level_enum','catalog_status_enum','users_status_enum','roles_code_enum']) await queryRunner.query(`DROP TYPE IF EXISTS "${type}"`)
  }
}
