import { Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'
import { Repository } from 'typeorm'
import { result } from '../common/api'
import { LIMITS } from '../common/limits'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { CurrentUser, RequirePermissions } from '../common/security'
import { maxLengthMessage, minLengthMessage, Trim } from '../common/validation'
import { CatalogStatus, Category, KnowledgeArticle, User } from '../database/entities'

export class CreateArticleDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.ARTICLE_TITLE_MIN, { message: minLengthMessage('El título', LIMITS.ARTICLE_TITLE_MIN) })
  @MaxLength(LIMITS.ARTICLE_TITLE, { message: maxLengthMessage('El título', LIMITS.ARTICLE_TITLE) })
  title: string

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.ARTICLE_CONTENT_MIN, { message: minLengthMessage('El contenido', LIMITS.ARTICLE_CONTENT_MIN) })
  @MaxLength(LIMITS.ARTICLE_CONTENT, { message: maxLengthMessage('El contenido', LIMITS.ARTICLE_CONTENT) })
  content: string

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Las etiquetas no pueden contener solo espacios' })
  @MaxLength(LIMITS.ARTICLE_TAGS, { message: maxLengthMessage('Las etiquetas', LIMITS.ARTICLE_TAGS) })
  tags?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de categoría no es un UUID válido' })
  categoryId?: string
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeArticle) private readonly articles: Repository<KnowledgeArticle>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
  ) {}

  async list(search?: string) {
    const qb = this.articles.createQueryBuilder('article').leftJoinAndSelect('article.category', 'category').leftJoinAndSelect('article.author', 'author').where('article.status = :status', { status: CatalogStatus.ACTIVE })
    if (search) qb.andWhere('(LOWER(article.title) LIKE :q OR LOWER(article.tags) LIKE :q)', { q: `%${search.toLowerCase()}%` })
    return qb.orderBy('article.updatedAt', 'DESC').getMany()
  }

  private async resolveCategory(categoryId?: string) {
    if (categoryId === undefined) return undefined
    const category = await this.categories.findOneBy({ id: categoryId })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    return category
  }

  async create(dto: CreateArticleDto, user: User) {
    const category = dto.categoryId === undefined ? null : await this.resolveCategory(dto.categoryId)
    return this.articles.save(this.articles.create({
      title: dto.title.trim(),
      content: dto.content.trim(),
      tags: dto.tags?.trim() ?? '',
      category: category ?? null,
      author: user,
    }))
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.find(id)
    if (dto.title) article.title = dto.title.trim()
    if (dto.content) article.content = dto.content.trim()
    if (dto.tags !== undefined) article.tags = dto.tags.trim()
    if (dto.categoryId !== undefined) {
      article.category = (await this.resolveCategory(dto.categoryId)) ?? null
    }
    return this.articles.save(article)
  }

  async remove(id: string) {
    const article = await this.find(id)
    article.status = CatalogStatus.INACTIVE
    return this.articles.save(article)
  }

  async find(id: string) {
    const article = await this.articles.findOne({ where: { id }, relations: { category: true, author: true } })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return article
  }
}

@ApiTags('Base de conocimiento') @ApiBearerAuth() @Controller('knowledge-articles')
class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}
  @Get() async list(@Query('search') search?: string) { return result(await this.service.list(search)) }
  @Get(':id') async find(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.find(id)) }
  @RequirePermissions('KNOWLEDGE_MANAGE') @Post() async create(@Body() dto: CreateArticleDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Artículo creado') }
  @RequirePermissions('KNOWLEDGE_MANAGE') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateArticleDto) { return result(await this.service.update(id, dto), 'Artículo actualizado') }
  @RequirePermissions('KNOWLEDGE_MANAGE') @Delete(':id') async remove(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.remove(id), 'Artículo desactivado') }
}

@Module({ imports: [TypeOrmModule.forFeature([KnowledgeArticle, Category])], providers: [KnowledgeService], controllers: [KnowledgeController] })
export class KnowledgeModule {}
