import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ENTITIES } from './entities'

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const ssl = config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false
  const databaseUrl = config.get<string>('DATABASE_URL')

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl,
      entities: ENTITIES,
      synchronize: false,
      logging: config.get('DB_LOGGING') === 'true',
    }
  }

  return {
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: Number(config.get('DB_PORT', 5432)),
    username: config.get('DB_USERNAME', 'ticketflow'),
    password: config.get('DB_PASSWORD', 'ticketflow_dev_password'),
    database: config.get('DB_DATABASE', 'ticketflow'),
    ssl,
    entities: ENTITIES,
    synchronize: false,
    logging: config.get('DB_LOGGING') === 'true',
  }
}
