import { ForbiddenException } from '@nestjs/common'
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'
import { RoleCode, User } from '../database/entities'

export type ClientAccessMode = 'all' | 'owner' | 'tickets' | 'none'

export function clientAccessMode(user: User): ClientAccessMode {
  const code = user.role.code
  if (code === RoleCode.ADMIN || code === RoleCode.SUPERVISOR) return 'all'
  if (code === RoleCode.SALES) return 'owner'
  if (code === RoleCode.AGENT) return 'tickets'
  return 'none'
}

export function applyClientScope<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, user: User, alias = 'client') {
  const mode = clientAccessMode(user)
  if (mode === 'all') return qb
  if (mode === 'none') throw new ForbiddenException('No tienes acceso al CRM')
  if (mode === 'owner') {
    return qb.andWhere(`(${alias}.owner_id = :crmUserId OR ${alias}.owner_id IS NULL)`, { crmUserId: user.id })
  }
  return qb.andWhere(
    `EXISTS (SELECT 1 FROM tickets t WHERE t.client_id = ${alias}.id AND t.assignee_id = :crmUserId)`,
    { crmUserId: user.id },
  )
}

export function canAccessClient(user: User, client: { owner?: { id: string } | null; id: string }, agentClientIds: string[]) {
  const mode = clientAccessMode(user)
  if (mode === 'all') return true
  if (mode === 'owner') return !client.owner || client.owner.id === user.id
  if (mode === 'tickets') return agentClientIds.includes(client.id)
  return false
}
