import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { result } from '../common/api'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { RequirePermissions } from '../common/security'
import { CatalogQueryDto, CreateCategoryDto, CreatePriorityDto, CreateSlaPolicyDto, UpdateCatalogStatusDto, UpdateCategoryDto, UpdatePriorityDto, UpdateSlaPolicyDto } from './dto'
import { CatalogsService } from './catalogs.service'

@ApiBearerAuth() @ApiTags('Categorías') @Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CatalogsService) {}
  @Get() async list(@Query() query: CatalogQueryDto) { const r = await this.service.listCategories(query); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CATEGORY_MANAGE') @Post() async create(@Body() dto: CreateCategoryDto) { return result(await this.service.createCategory(dto), 'Categoría creada') }
  @RequirePermissions('CATEGORY_MANAGE') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateCategoryDto) { return result(await this.service.updateCategory(id, dto), 'Categoría actualizada') }
  @RequirePermissions('CATEGORY_MANAGE') @Patch(':id/status') async status(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateCatalogStatusDto) { return result(await this.service.setCategoryStatus(id, dto.status), 'Estado de categoría actualizado') }
  @RequirePermissions('CATEGORY_MANAGE') @Delete(':id') async remove(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.deactivateCategory(id), 'Categoría desactivada') }
}
@ApiBearerAuth() @ApiTags('Prioridades') @Controller('priorities')
export class PrioritiesController {
  constructor(private readonly service: CatalogsService) {}
  @Get() async list(@Query() query: CatalogQueryDto) { const r = await this.service.listPriorities(query); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('PRIORITY_MANAGE') @Post() async create(@Body() dto: CreatePriorityDto) { return result(await this.service.createPriority(dto), 'Prioridad creada') }
  @RequirePermissions('PRIORITY_MANAGE') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePriorityDto) { return result(await this.service.updatePriority(id, dto), 'Prioridad actualizada') }
}
@ApiBearerAuth() @ApiTags('SLA') @Controller('sla-policies')
export class SlaPoliciesController {
  constructor(private readonly service: CatalogsService) {}
  @Get() async list(@Query() query: CatalogQueryDto) { const r = await this.service.listPolicies(query); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('SLA_MANAGE') @Post() async create(@Body() dto: CreateSlaPolicyDto) { return result(await this.service.createPolicy(dto), 'Política SLA creada') }
  @RequirePermissions('SLA_MANAGE') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateSlaPolicyDto) { return result(await this.service.updatePolicy(id, dto), 'Política SLA actualizada') }
}
