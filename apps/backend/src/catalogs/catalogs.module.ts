import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category, Company, Priority, SlaPolicy, Ticket } from '../database/entities'
import { CatalogsService } from './catalogs.service'
import { CategoriesController, CompaniesController, PrioritiesController, SlaPoliciesController } from './catalogs.controller'
@Module({ imports: [TypeOrmModule.forFeature([Category, Priority, SlaPolicy, Company, Ticket])], providers: [CatalogsService], controllers: [CategoriesController, PrioritiesController, SlaPoliciesController, CompaniesController], exports: [CatalogsService] })
export class CatalogsModule {}
