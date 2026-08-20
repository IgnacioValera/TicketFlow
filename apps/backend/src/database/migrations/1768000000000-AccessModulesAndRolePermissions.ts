import { MigrationInterface, QueryRunner } from 'typeorm'
import { ACCESS_MODULES, PERMISSION_DEFINITIONS, ROLE_DESCRIPTIONS } from '../../common/access-catalog'
import { PERMISSIONS } from '../../common/permissions'

export class AccessModulesAndRolePermissions1768000000000 implements MigrationInterface {
  name = 'AccessModulesAndRolePermissions1768000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "access_modules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(80) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "description" varchar(400) NOT NULL DEFAULT '',
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" varchar(400) NOT NULL DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" varchar(40) NOT NULL DEFAULT 'MANAGE'`)
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module_id" uuid`)
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`)

    await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" varchar(400) NOT NULL DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "permissions_version" int NOT NULL DEFAULT 1`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permission_audits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "target_role_id" uuid REFERENCES "roles"("id") ON DELETE SET NULL,
        "target_module_id" uuid REFERENCES "access_modules"("id") ON DELETE SET NULL,
        "action" varchar(40) NOT NULL,
        "previous_permissions" jsonb,
        "new_permissions" jsonb,
        "added_permissions" jsonb,
        "removed_permissions" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_permission_audits_role_created" ON "permission_audits" ("target_role_id", "created_at")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_permission_audits_module_created" ON "permission_audits" ("target_module_id", "created_at")`)

    for (const module of ACCESS_MODULES) {
      await queryRunner.query(
        `
        INSERT INTO "access_modules" ("code", "name", "description", "is_active", "is_system", "sort_order")
        VALUES ($1, $2, $3, true, $4, $5)
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "is_system" = EXCLUDED."is_system",
          "sort_order" = EXCLUDED."sort_order",
          "updated_at" = now()
        `,
        [module.code, module.name, module.description, module.isSystem, module.sortOrder],
      )
    }

    for (const permission of PERMISSION_DEFINITIONS) {
      await queryRunner.query(
        `
        INSERT INTO "permissions" ("code", "name", "description", "action", "module_id")
        SELECT $1, $2, $3, $4, modules.id
        FROM "access_modules" AS modules
        WHERE modules.code = $5
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "action" = EXCLUDED."action",
          "module_id" = EXCLUDED."module_id",
          "updated_at" = now()
        `,
        [permission.code, permission.name, permission.description, permission.action, permission.moduleCode],
      )
    }

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "permissions"
        ADD CONSTRAINT "FK_permissions_module"
        FOREIGN KEY ("module_id") REFERENCES "access_modules"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `)

    const adminPermissions = [
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_PERMISSION_MANAGE,
      PERMISSIONS.MODULE_VIEW,
      PERMISSIONS.MODULE_MANAGE,
      PERMISSIONS.PERMISSION_AUDIT_VIEW,
    ]
    await queryRunner.query(
      `
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT roles.id, permissions.id
      FROM "roles"
      CROSS JOIN "permissions"
      WHERE roles.code = 'ADMIN'
        AND permissions.code = ANY($1::varchar[])
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
      `,
      [adminPermissions],
    )

    for (const [code, description] of Object.entries(ROLE_DESCRIPTIONS)) {
      await queryRunner.query(`UPDATE "roles" SET "description" = $2 WHERE "code" = $1 AND ("description" IS NULL OR "description" = '')`, [
        code,
        description,
      ])
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminPermissions = [
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_PERMISSION_MANAGE,
      PERMISSIONS.MODULE_VIEW,
      PERMISSIONS.MODULE_MANAGE,
      PERMISSIONS.PERMISSION_AUDIT_VIEW,
    ]
    await queryRunner.query(
      `
      DELETE FROM "role_permissions"
      USING "permissions"
      WHERE "role_permissions"."permission_id" = "permissions"."id"
        AND "permissions"."code" = ANY($1::varchar[])
      `,
      [adminPermissions],
    )
    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = ANY($1::varchar[])`, [adminPermissions])
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permission_audits_module_created"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permission_audits_role_created"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "permission_audits"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "FK_permissions_module"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "module_id"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "action"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "description"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "created_at"`)
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "updated_at"`)
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "permissions_version"`)
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "description"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "access_modules"`)
  }
}
