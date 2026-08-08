import { DataSource } from 'typeorm'
import AppDataSource, * as dataSourceExports from './data-source'

describe('TypeORM CLI data source', () => {
  it('expone exactamente una instancia de DataSource', () => {
    const exportedDataSources = Object.values(dataSourceExports).filter(
      (value) => value instanceof DataSource,
    )

    expect(exportedDataSources).toHaveLength(1)
    expect(exportedDataSources[0]).toBe(AppDataSource)
  })
})
