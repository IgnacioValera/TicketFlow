import { DataSource, getMetadataArgsStorage } from 'typeorm'
import AppDataSource, * as dataSourceExports from './data-source'
import { User } from './entities'
import { MustChangePasswordAndKnowledge1763000000000 } from './migrations/1763000000000-MustChangePasswordAndKnowledge'
import { CrmSurveyInvitationAutomation1765000000000 } from './migrations/1765000000000-CrmSurveyInvitationAutomation'
import { TicketHistorySystemActor1767000000000 } from './migrations/1767000000000-TicketHistorySystemActor'
import { AccessModulesAndRolePermissions1768000000000 } from './migrations/1768000000000-AccessModulesAndRolePermissions'

describe('TypeORM CLI data source', () => {
  it('expone exactamente una instancia de DataSource', () => {
    const exportedDataSources = Object.values(dataSourceExports).filter(
      (value) => value instanceof DataSource,
    )

    expect(exportedDataSources).toHaveLength(1)
    expect(exportedDataSources[0]).toBe(AppDataSource)
  })

  it('registra la migración de must_change_password sin duplicarla', () => {
    const migrations = (AppDataSource.options.migrations ?? []) as unknown[]
    const matches = migrations.filter((migration) => migration === MustChangePasswordAndKnowledge1763000000000)
    expect(matches).toHaveLength(1)
  })

  it('registra la migración de automatización de encuestas CRM', () => {
    const migrations = (AppDataSource.options.migrations ?? []) as unknown[]
    const matches = migrations.filter((migration) => migration === CrmSurveyInvitationAutomation1765000000000)
    expect(matches).toHaveLength(1)
  })

  it('registra la migración de actor de sistema en el historial', () => {
    const migrations = (AppDataSource.options.migrations ?? []) as unknown[]
    const matches = migrations.filter((migration) => migration === TicketHistorySystemActor1767000000000)
    expect(matches).toHaveLength(1)
  })

  it('registra la migración de módulos y privilegios dinámicos', () => {
    const migrations = (AppDataSource.options.migrations ?? []) as unknown[]
    const matches = migrations.filter((migration) => migration === AccessModulesAndRolePermissions1768000000000)
    expect(matches).toHaveLength(1)
  })

  it('mapea mustChangePassword a must_change_password con default false', () => {
    const column = getMetadataArgsStorage().columns.find(
      (item) => item.target === User && item.propertyName === 'mustChangePassword',
    )
    expect(column?.options.name).toBe('must_change_password')
    expect(column?.options.default).toBe(false)
  })
})
