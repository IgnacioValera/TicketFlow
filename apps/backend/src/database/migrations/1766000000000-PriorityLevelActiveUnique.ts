import { MigrationInterface, QueryRunner } from 'typeorm'

export class PriorityLevelActiveUnique1766000000000 implements MigrationInterface {
  name = 'PriorityLevelActiveUnique1766000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "priorities" DROP CONSTRAINT IF EXISTS "priorities_level_key"`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "priorities_level_active_uidx" ON "priorities" ("level") WHERE "status" = 'ACTIVE'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "priorities_level_active_uidx"`)
    await queryRunner.query(`ALTER TABLE "priorities" ADD CONSTRAINT "priorities_level_key" UNIQUE ("level")`)
  }
}
