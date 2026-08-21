import 'dotenv/config'
import { DataSource, DataSourceOptions } from 'typeorm'
import { ENTITIES } from './entities'
import { postgresSsl, postgresUrlWithoutSslMode } from './postgres-ssl'
import { InitialSchema1760000000000 } from './migrations/1760000000000-InitialSchema'
import { SlaResolutionGteResponse1761000000000 } from './migrations/1761000000000-SlaResolutionGteResponse'
import { CrmSchema1762000000000 } from './migrations/1762000000000-CrmSchema'
import { MustChangePasswordAndKnowledge1763000000000 } from './migrations/1763000000000-MustChangePasswordAndKnowledge'
import { RepairMojibakeTexts1764000000000 } from './migrations/1764000000000-RepairMojibakeTexts'
import { CrmSurveyInvitationAutomation1765000000000 } from './migrations/1765000000000-CrmSurveyInvitationAutomation'
import { UserClientAndNotifications1766000000000 } from './migrations/1766000000000-UserClientAndNotifications'
import { TicketHistorySystemActor1767000000000 } from './migrations/1767000000000-TicketHistorySystemActor'
import { AccessModulesAndRolePermissions1768000000000 } from './migrations/1768000000000-AccessModulesAndRolePermissions'
import { CrmContactDeletePermission1769000000000 } from './migrations/1769000000000-CrmContactDeletePermission'

const migrations = [
  InitialSchema1760000000000,
  SlaResolutionGteResponse1761000000000,
  CrmSchema1762000000000,
  MustChangePasswordAndKnowledge1763000000000,
  RepairMojibakeTexts1764000000000,
  CrmSurveyInvitationAutomation1765000000000,
  UserClientAndNotifications1766000000000,
  TicketHistorySystemActor1767000000000,
  AccessModulesAndRolePermissions1768000000000,
  CrmContactDeletePermission1769000000000,
]

const ssl = postgresSsl()

function buildDataSourceOptions(): DataSourceOptions {
  const shared = {
    type: 'postgres' as const,
    ssl,
    entities: ENTITIES,
    migrations,
    migrationsTransactionMode: 'each' as const,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  }

  if (process.env.DATABASE_URL) {
    return { ...shared, url: postgresUrlWithoutSslMode(process.env.DATABASE_URL) }
  }

  return {
    ...shared,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'ticketflow',
    password: process.env.DB_PASSWORD || 'ticketflow_dev_password',
    database: process.env.DB_DATABASE || 'ticketflow',
  }
}

const AppDataSource = new DataSource(buildDataSourceOptions())

export default AppDataSource
