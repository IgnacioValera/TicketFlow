import 'dotenv/config'
import { DataSource } from 'typeorm'
import { ENTITIES } from './entities'
import { InitialSchema1760000000000 } from './migrations/1760000000000-InitialSchema'
import { SlaResolutionGteResponse1761000000000 } from './migrations/1761000000000-SlaResolutionGteResponse'
import { CrmSchema1762000000000 } from './migrations/1762000000000-CrmSchema'
import { MustChangePasswordAndKnowledge1763000000000 } from './migrations/1763000000000-MustChangePasswordAndKnowledge'
import { RepairMojibakeTexts1764000000000 } from './migrations/1764000000000-RepairMojibakeTexts'
import { CrmSurveyInvitationAutomation1765000000000 } from './migrations/1765000000000-CrmSurveyInvitationAutomation'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'ticketflow',
  password: process.env.DB_PASSWORD || 'ticketflow_dev_password',
  database: process.env.DB_DATABASE || 'ticketflow',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ENTITIES,
  migrations: [
    InitialSchema1760000000000,
    SlaResolutionGteResponse1761000000000,
    CrmSchema1762000000000,
    MustChangePasswordAndKnowledge1763000000000,
    RepairMojibakeTexts1764000000000,
    CrmSurveyInvitationAutomation1765000000000,
  ],
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
})

export default AppDataSource
