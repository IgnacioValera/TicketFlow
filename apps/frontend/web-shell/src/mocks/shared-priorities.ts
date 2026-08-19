import type { Priority } from '@/types/catalog.types'

const INITIAL_PRIORITIES: Priority[] = [
  {
    id: '1',
    name: 'Baja',
    level: 'LOW',
    color: '#94a3b8',
    description: 'Impacto minimo en operaciones',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Media',
    level: 'MEDIUM',
    color: '#247b7b',
    description: 'Afecta a un grupo reducido de usuarios',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Alta',
    level: 'HIGH',
    color: '#f97316',
    description: 'Interrumpe procesos importantes',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Critica',
    level: 'CRITICAL',
    color: '#db3a34',
    description: 'Detiene operaciones criticas del negocio',
    status: 'ACTIVE',
  },
]

type MockStore = typeof globalThis & {
  __ticketFlowMockPriorities?: Priority[]
}

function getStore() {
  const store = globalThis as MockStore
  if (!store.__ticketFlowMockPriorities) {
    store.__ticketFlowMockPriorities = INITIAL_PRIORITIES.map((priority) => ({ ...priority }))
  }
  return store.__ticketFlowMockPriorities
}

export const sharedMockPriorities = getStore()

export function getSharedPriorityMeta(id: string) {
  const priority = getStore().find((item) => item.id === id)
  if (!priority) return null
  return {
    name: priority.name,
    color: priority.color,
    resolutionHours:
      priority.level === 'LOW'
        ? 72
        : priority.level === 'MEDIUM'
          ? 48
          : priority.level === 'HIGH'
            ? 24
            : 8,
  }
}
