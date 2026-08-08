import 'dotenv/config'
import { DataSource } from 'typeorm'
import { ENTITIES } from './entities'
import { InitialSchema1760000000000 } from './migrations/1760000000000-InitialSchema'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'ticketflow',
  password: process.env.DB_PASSWORD || 'ticketflow_dev_password',
  database: process.env.DB_DATABASE || 'ticketflow',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ENTITIES,
  migrations: [InitialSchema1760000000000],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
})

export default AppDataSource
