import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category, Priority, SlaPolicy } from '../database/entities'
import { CatalogsService } from './catalogs.service'
import { CategoriesController, PrioritiesController, SlaPoliciesController } from './catalogs.controller'
@Module({ imports: [TypeOrmModule.forFeature([Category, Priority, SlaPolicy])], providers: [CatalogsService], controllers: [CategoriesController, PrioritiesController, SlaPoliciesController], exports: [CatalogsService] })
export class CatalogsModule {}
