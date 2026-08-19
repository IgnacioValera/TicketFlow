import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Not, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { assertSlaHours } from '../common/validation'
import { CatalogStatus, Category, Priority, SlaPolicy } from '../database/entities'
import { CatalogQueryDto, CreateCategoryDto, CreatePriorityDto, CreateSlaPolicyDto, UpdateCategoryDto, UpdatePriorityDto, UpdateSlaPolicyDto } from './dto'

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Priority) private readonly priorities: Repository<Priority>,
    @InjectRepository(SlaPolicy) private readonly policies: Repository<SlaPolicy>,
  ) {}

  async listCategories(query: CatalogQueryDto) { return this.listCatalog(this.categories, query, 'category') }
  async createCategory(dto: CreateCategoryDto) { await this.ensureUnique(this.categories, dto.name); return this.categories.save(this.categories.create({ name: dto.name.trim(), description: dto.description?.trim() ?? '' })) }
  async updateCategory(id: string, dto: UpdateCategoryDto) { const item = await this.find(this.categories, id, 'Categoría'); if (dto.name) { await this.ensureUnique(this.categories, dto.name, id); item.name = dto.name.trim() }; if (dto.description !== undefined) item.description = dto.description.trim(); return this.categories.save(item) }
  async deactivateCategory(id: string) { return this.setCategoryStatus(id, CatalogStatus.INACTIVE) }
  async setCategoryStatus(id: string, status: CatalogStatus) { const item = await this.find(this.categories, id, 'Categoría'); item.status = status; return this.categories.save(item) }

  async listPriorities(query: CatalogQueryDto) { return this.listCatalog(this.priorities, query, 'priority') }
  async createPriority(dto: CreatePriorityDto) { await this.ensureUnique(this.priorities, dto.name); if (await this.priorities.exists({ where: { level: dto.level } })) throw new ConflictException('Ya existe una prioridad con ese nivel'); return this.priorities.save(this.priorities.create({ ...dto, name: dto.name.trim(), color: dto.color ?? '#247b7b', description: dto.description?.trim() ?? '' })) }
  async updatePriority(id: string, dto: UpdatePriorityDto) { const item = await this.find(this.priorities, id, 'Prioridad'); if (dto.name) { await this.ensureUnique(this.priorities, dto.name, id); item.name = dto.name.trim() }; if (dto.level) item.level = dto.level; if (dto.color) item.color = dto.color; if (dto.description !== undefined) item.description = dto.description.trim(); return this.priorities.save(item) }

  async listPolicies(query: CatalogQueryDto) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.policies.createQueryBuilder('policy').leftJoinAndSelect('policy.priority', 'priority')
    if (query.status) qb.andWhere('policy.status = :status', { status: query.status })
    if (query.search) qb.andWhere(new Brackets((where) => where.where('LOWER(policy.name) LIKE :q').orWhere('LOWER(priority.name) LIKE :q')), { q: `%${query.search.toLowerCase()}%` })
    const [items, total] = await qb.orderBy('policy.resolutionHours', 'ASC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serializePolicy(item)), meta: pagination(page, perPage, total) }
  }
  async createPolicy(dto: CreateSlaPolicyDto) {
    assertSlaHours(dto.responseHours, dto.resolutionHours)
    await this.ensureUnique(this.policies, dto.name)
    const priority = await this.find(this.priorities, dto.priorityId, 'Prioridad')
    await this.ensureUniquePriority(priority.id)
    return this.serializePolicy(await this.policies.save(this.policies.create({ name: dto.name.trim(), priority, responseHours: dto.responseHours, resolutionHours: dto.resolutionHours })))
  }
  async updatePolicy(id: string, dto: UpdateSlaPolicyDto) {
    const item = await this.findPolicy(id)
    if (dto.name) { await this.ensureUnique(this.policies, dto.name, id); item.name = dto.name.trim() }
    if (dto.priorityId) {
      const priority = await this.find(this.priorities, dto.priorityId, 'Prioridad')
      await this.ensureUniquePriority(priority.id, id)
      item.priority = priority
    }
    const responseHours = dto.responseHours !== undefined ? dto.responseHours : item.responseHours
    const resolutionHours = dto.resolutionHours !== undefined ? dto.resolutionHours : item.resolutionHours
    if (dto.responseHours !== undefined || dto.resolutionHours !== undefined) {
      assertSlaHours(responseHours, resolutionHours)
      item.responseHours = responseHours
      item.resolutionHours = resolutionHours
    }
    return this.serializePolicy(await this.policies.save(item))
  }
  serializePolicy(item: SlaPolicy) { return { id: item.id, name: item.name, priorityId: item.priority.id, priorityName: item.priority.name, responseHours: item.responseHours, resolutionHours: item.resolutionHours, status: item.status } }

  private async listCatalog<T extends Category | Priority>(repository: Repository<T>, query: CatalogQueryDto, alias: string) { const { page, perPage, skip } = parsePagination(query.page, query.perPage); const qb = repository.createQueryBuilder(alias); if (query.status) qb.andWhere(`${alias}.status = :status`, { status: query.status }); if (query.search) qb.andWhere(`(LOWER(${alias}.name) LIKE :q OR LOWER(${alias}.description) LIKE :q)`, { q: `%${query.search.toLowerCase()}%` }); const [items, total] = await qb.orderBy(`${alias}.name`, 'ASC').skip(skip).take(perPage).getManyAndCount(); return { items, meta: pagination(page, perPage, total) } }
  private async ensureUniquePriority(priorityId: string, excludeId?: string) {
    const exists = await this.policies.exists({
      where: excludeId
        ? { priority: { id: priorityId }, id: Not(excludeId) }
        : { priority: { id: priorityId } },
    })
    if (exists) throw new ConflictException('Ya existe una política SLA para esa prioridad')
  }
  private async findPolicy(id: string) {
    const item = await this.policies.findOne({ where: { id }, relations: { priority: true } })
    if (!item) throw new NotFoundException('Política SLA no encontrada')
    return item
  }
  private async ensureUnique<T extends { id: string; name: string }>(repository: Repository<T>, name: string, excludeId?: string) { const qb = repository.createQueryBuilder('item').where('LOWER(item.name) = LOWER(:name)', { name: name.trim() }); if (excludeId) qb.andWhere('item.id <> :excludeId', { excludeId }); if (await qb.getExists()) throw new ConflictException('Ya existe un registro con ese nombre') }
  private async find<T extends { id: string }>(repository: Repository<T>, id: string, label: string): Promise<T> { const item = await repository.findOne({ where: { id } as never }); if (!item) throw new NotFoundException(`${label} no encontrada`); return item }
}
