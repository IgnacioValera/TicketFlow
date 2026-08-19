import { http, HttpResponse } from 'msw'
import type { CrmClient, CrmDashboard } from '@/types/crm.types'

const mockClients: CrmClient[] = [
  {
    id: 'c1',
    name: 'Acme Corp',
    industry: 'Tecnología',
    region: 'Centro',
    tier: 'GOLD',
    segment: 'ENTERPRISE',
    email: 'contacto@acme.test',
    phone: '7771112233',
    status: 'ACTIVE',
    score: 92,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    createdAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Globex',
    industry: 'Manufactura',
    region: 'Norte',
    tier: 'SILVER',
    segment: 'MID_MARKET',
    email: 'contacto@globex.test',
    phone: '7772223344',
    status: 'ACTIVE',
    score: 78,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    createdAt: '2025-03-20T00:00:00.000Z',
  },
  {
    id: 'c3',
    name: 'Initech',
    industry: 'Servicios',
    region: 'Sur',
    tier: 'BRONZE',
    segment: 'SMB',
    email: 'contacto@initech.test',
    phone: '7773334455',
    status: 'ACTIVE',
    score: 61,
    ownerId: null,
    ownerName: null,
    createdAt: '2025-06-10T00:00:00.000Z',
  },
]

const mockDashboard: CrmDashboard = {
  pipeline: [
    { stage: 'NEW', count: 1, amount: 10000 },
    { stage: 'QUALIFICATION', count: 1, amount: 25000 },
    { stage: 'PROPOSAL', count: 1, amount: 40000 },
    { stage: 'NEGOTIATION', count: 1, amount: 15000 },
    { stage: 'WON', count: 1, amount: 30000 },
    { stage: 'LOST', count: 1, amount: 8000 },
  ],
  conversionRate: 50,
  nps: { nps: 33, promoters: 2, passives: 1, detractors: 1, total: 4 },
  activitiesDue: 2,
  pendingActivities: 3,
  wonThisMonth: 1,
  wonAmountThisMonth: 30000,
  lostThisMonth: 1,
  activeClients: mockClients.filter((client) => client.status === 'ACTIVE').length,
  contacts: 4,
  openOpportunities: 4,
  openPipelineAmount: 90000,
  topClients: mockClients.map((client) => ({
    id: client.id,
    name: client.name,
    score: client.score,
    segment: client.segment,
  })),
}

export function createCrmHandlers() {
  return [
    http.get('*/api/v1/crm/dashboard', () =>
      HttpResponse.json({ success: true, message: 'OK', data: mockDashboard, meta: null }),
    ),
    http.get('*/api/v1/crm/clients', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const status = url.searchParams.get('status')
      const items = status ? mockClients.filter((client) => client.status === status) : mockClients
      const start = (page - 1) * perPage
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items.slice(start, start + perPage),
        meta: { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) },
      })
    }),
    http.get('*/api/v1/crm/clients/:id', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) {
        return HttpResponse.json({ success: false, message: 'Cliente no encontrado', data: null, meta: null }, { status: 404 })
      }
      return HttpResponse.json({ success: true, message: 'OK', data: client, meta: null })
    }),
  ]
}
