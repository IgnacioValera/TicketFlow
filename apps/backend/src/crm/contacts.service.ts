import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { toCsv } from '../common/csv'
import { CrmContact, User } from '../database/entities'
import { applyClientScope } from './access'
import { ContactsQueryDto, CreateContactDto, UpdateContactDto } from './dto'
import { ClientsService } from './clients.service'

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(CrmContact) private readonly contacts: Repository<CrmContact>,
    private readonly clients: ClientsService,
  ) {}

  async list(query: ContactsQueryDto, user: User) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.contacts.createQueryBuilder('contact').leftJoinAndSelect('contact.client', 'client').leftJoinAndSelect('client.owner', 'owner')
    applyClientScope(qb, user)
    if (query.clientId) qb.andWhere('client.id = :clientId', { clientId: query.clientId })
    if (query.search) {
      qb.andWhere(new Brackets((where) => where.where('LOWER(contact.firstName) LIKE :q').orWhere('LOWER(contact.lastName) LIKE :q').orWhere('LOWER(contact.email) LIKE :q')), { q: `%${query.search.toLowerCase()}%` })
    }
    const [items, total] = await qb.orderBy('contact.lastName', 'ASC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateContactDto, user: User) {
    const client = await this.clients.getAccessible(dto.clientId, user)
    const contact = await this.contacts.save(this.contacts.create({
      client, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email: dto.email.toLowerCase().trim(),
      phone: dto.phone?.trim() ?? '', jobTitle: dto.jobTitle?.trim() ?? '', isPrimary: Boolean(dto.isPrimary),
    }))
    if (contact.isPrimary) await this.clearOtherPrimaries(client.id, contact.id)
    return this.serialize(await this.find(contact.id))
  }

  async update(id: string, dto: UpdateContactDto, user: User) {
    const contact = await this.find(id)
    await this.clients.getAccessible(contact.client.id, user)
    if (dto.clientId && dto.clientId !== contact.client.id) {
      contact.client = await this.clients.getAccessible(dto.clientId, user)
    }
    if (dto.firstName) contact.firstName = dto.firstName.trim()
    if (dto.lastName) contact.lastName = dto.lastName.trim()
    if (dto.email) contact.email = dto.email.toLowerCase().trim()
    if (dto.phone !== undefined) contact.phone = dto.phone.trim()
    if (dto.jobTitle !== undefined) contact.jobTitle = dto.jobTitle.trim()
    if (dto.isPrimary !== undefined) contact.isPrimary = dto.isPrimary
    await this.contacts.save(contact)
    if (contact.isPrimary) await this.clearOtherPrimaries(contact.client.id, contact.id)
    return this.serialize(await this.find(id))
  }

  async remove(id: string, user: User) {
    const contact = await this.find(id)
    await this.clients.getAccessible(contact.client.id, user)
    await this.contacts.remove(contact)
    return { id }
  }

  async exportCsv(query: ContactsQueryDto, user: User) {
    const { items } = await this.list({ ...query, page: 1, perPage: 100 }, user)
    return toCsv(items.map((item) => ({
      nombre: item.firstName, apellido: item.lastName, correo: item.email, telefono: item.phone, puesto: item.jobTitle,
      cliente: item.clientName, primario: item.isPrimary ? 'sí' : 'no',
    })))
  }

  serialize(item: CrmContact) {
    return {
      id: item.id, clientId: item.client.id, clientName: item.client.name, firstName: item.firstName, lastName: item.lastName,
      email: item.email, phone: item.phone, jobTitle: item.jobTitle, isPrimary: item.isPrimary,
      createdAt: item.createdAt.toISOString(),
    }
  }

  async findForClient(id: string, clientId: string) {
    const contact = await this.contacts.findOne({ where: { id }, relations: { client: true } })
    if (!contact || contact.client.id !== clientId) throw new UnprocessableEntityException('El contacto no pertenece al cliente')
    return contact
  }

  private async find(id: string) {
    const contact = await this.contacts.findOne({ where: { id }, relations: { client: true } })
    if (!contact) throw new NotFoundException('Contacto no encontrado')
    return contact
  }

  private async clearOtherPrimaries(clientId: string, keepId: string) {
    await this.contacts.createQueryBuilder().update().set({ isPrimary: false }).where('client_id = :clientId AND id <> :keepId', { clientId, keepId }).execute()
  }
}
