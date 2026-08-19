import { MigrationInterface, QueryRunner } from 'typeorm'

export class ContactStatus1767000000000 implements MigrationInterface {
  name = 'ContactStatus1767000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "crm_contact_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`)
    await queryRunner.query(`ALTER TABLE "crm_contacts" ADD COLUMN "status" "crm_contact_status_enum" NOT NULL DEFAULT 'ACTIVE'`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crm_contacts" DROP COLUMN "status"`)
    await queryRunner.query(`DROP TYPE "crm_contact_status_enum"`)
  }
}