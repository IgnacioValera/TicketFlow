import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, IsNull, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { Notification, RoleCode, Ticket, User, UserStatus } from '../database/entities'
import { isUniqueViolation } from '../crm/db-errors'
import {
  copyForRecipient,
  notificationRecipients,
  NotificationType,
} from './notification-rules'

export interface DispatchNotificationInput {
  type: NotificationType
  actor: User | null
  ticket: Ticket
  dedupeKey: string
  previousAssigneeId?: string | null
  statusLabel?: string
}

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly notifications: Repository<Notification>) {}

  async list(user: User, query: { page?: number; perPage?: number; unread?: boolean }) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage ?? 20)
    const qb = this.notifications
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.ticket', 'ticket')
      .where('notification.recipient_user_id = :userId', { userId: user.id })
    if (query.unread) qb.andWhere('notification.read_at IS NULL')
    const [items, total] = await qb.orderBy('notification.createdAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async unreadCount(user: User) {
    const count = await this.notifications.count({ where: { recipient: { id: user.id }, readAt: IsNull() } })
    return { count }
  }

  async markRead(id: string, user: User) {
    const notification = await this.notifications.findOne({
      where: { id, recipient: { id: user.id } },
      relations: { ticket: true },
    })
    if (!notification) throw new NotFoundException('Notificación no encontrada')
    if (!notification.readAt) {
      notification.readAt = new Date()
      await this.notifications.save(notification)
    }
    return this.serialize(notification)
  }

  async markAllRead(user: User) {
    await this.notifications
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => 'NOW()' })
      .where('recipient_user_id = :userId', { userId: user.id })
      .andWhere('read_at IS NULL')
      .execute()
    return { updated: true }
  }

  async dispatch(manager: EntityManager, input: DispatchNotificationInput) {
    const ticket = input.ticket
    const supervisorIds =
      input.type === NotificationType.ESCALATED ? await this.supervisorIds(manager) : []
    const recipientIds = notificationRecipients({
      type: input.type,
      actorId: input.actor?.id ?? '',
      requesterId: ticket.requester.id,
      assigneeId: ticket.assignee?.id ?? null,
      previousAssigneeId: input.previousAssigneeId,
      supervisorIds,
    })
    for (const recipientId of recipientIds) {
      const copy = copyForRecipient(input.type, ticket.folio, recipientId, ticket.requester.id, {
        statusLabel: input.statusLabel,
      })
      try {
        await manager.save(
          manager.create(Notification, {
            recipient: { id: recipientId } as User,
            actor: input.actor ? ({ id: input.actor.id } as User) : null,
            ticket,
            dedupeKey: input.dedupeKey,
            type: input.type,
            title: copy.title,
            message: copy.message,
            readAt: null,
          }),
        )
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
    }
  }

  serialize(item: Notification) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      ticketId: item.ticket?.id ?? null,
      ticketFolio: item.ticket?.folio ?? null,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    }
  }

  private async supervisorIds(manager: EntityManager) {
    const supervisors = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .where('role.code = :role', { role: RoleCode.SUPERVISOR })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .getMany()
    return supervisors.map((user) => user.id)
  }
}
