import { MigrationInterface, QueryRunner } from 'typeorm'

const PERMISSION_CODE = 'CRM_CONTACT_DELETE'
const MODULE_CODE = 'CRM_CONTACTS'

export class CrmContactDeletePermission1769000000000 implements MigrationInterface {
  name = 'CrmContactDeletePermission1769000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
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
      [
        PERMISSION_CODE,
        'Eliminar contactos',
        'Quitar un contacto de la cartera sin borrar el cliente ni su información relacionada.',
        'DELETE',
        MODULE_CODE,
      ],
    )

    await queryRunner.query(
      `
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT roles.id, permissions.id
      FROM "roles"
      CROSS JOIN "permissions"
      WHERE roles.code IN ('ADMIN', 'SALES')
        AND permissions.code = $1
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
      `,
      [PERMISSION_CODE],
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = $1)`,
      [PERMISSION_CODE],
    )
    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = $1`, [PERMISSION_CODE])
  }
}
