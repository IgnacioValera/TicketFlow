import { MigrationInterface, QueryRunner } from 'typeorm'

export class SlaResolutionGteResponse1761000000000 implements MigrationInterface {
  name = 'SlaResolutionGteResponse1761000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        invalid_count integer;
        invalid_names text;
      BEGIN
        SELECT COUNT(*)::int, string_agg(name, ', ' ORDER BY name)
        INTO invalid_count, invalid_names
        FROM sla_policies
        WHERE resolution_hours < response_hours;

        IF invalid_count > 0 THEN
          RAISE EXCEPTION 'No se puede aplicar la restricción SLA: hay % política(s) con tiempo de resolución menor que el de respuesta (%). Corrija esos registros antes de migrar; no se modificaron datos.', invalid_count, invalid_names;
        END IF;
      END $$;
    `)
    await queryRunner.query(`
      ALTER TABLE "sla_policies"
      ADD CONSTRAINT "sla_policies_resolution_gte_response"
      CHECK ("resolution_hours" >= "response_hours")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sla_policies" DROP CONSTRAINT IF EXISTS "sla_policies_resolution_gte_response"`)
  }
}
