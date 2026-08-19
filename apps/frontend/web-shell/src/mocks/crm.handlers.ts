import { http, HttpResponse } from 'msw'
import type { CrmClient } from '@/types/crm.types'
import { isValidClientPhone, normalizeClientPhone } from '@/utils/client-form'
import { toCsv } from '@/utils/csv'

let mockClients: CrmClient[] = [
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
    status: 'PROSPECT',
    score: 61,
    ownerId: null,
    ownerName: null,
    createdAt: '2025-06-10T00:00:00.000Z',
  },
]

function jsonOk(data: unknown, meta: unknown = null, message = 'OK') {
  return HttpResponse.json({ success: true, message, data, meta })
}

function jsonError(message: string, status: number) {
  return HttpResponse.json({ success: false, message, data: null, meta: null }, { status })
}

function filterClients(url: URL) {
  const status = url.searchParams.get('status')
  const segment = url.searchParams.get('segment')
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
  return mockClients.filter((client) => {
    if (status && client.status !== status) return false
    if (segment && client.segment !== segment) return false
    if (
      search &&
      !`${client.name} ${client.email} ${client.industry} ${client.region} ${client.phone}`
        .toLowerCase()
        .includes(search)
    ) {
      return false
    }
    return true
  })
}

function clientsExportCsv(clients: CrmClient[]) {
  return toCsv(
    clients.map((item) => ({
      nombre: item.name,
      giro: item.industry,
      region: item.region,
      segmento: item.segment,
      nivel: item.tier,
      correo: item.email,
      telefono: item.phone,
      estado: item.status,
      score: item.score,
      propietario: item.ownerName ?? '',
    })),
  )
}

export function createCrmHandlers() {
  return [
    http.get('*/api/v1/crm/clients/export', ({ request }) => {
      const csv = clientsExportCsv(filterClients(new URL(request.url)))
      return new HttpResponse(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clientes.csv"',
        },
      })
    }),
    http.get('*/api/v1/crm/clients/:id/360', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) return jsonError('Cliente no encontrado', 404)
      return jsonOk({
        client,
        kpis: { score: client.score, contacts: 1, openOpportunities: 1, wonAmount: 30000, openTickets: 0 },
        contacts: [
          {
            id: 'ct1',
            clientId: client.id,
            clientName: client.name,
            firstName: 'Ana',
            lastName: 'López',
            email: 'ana@' + client.email.split('@')[1],
            phone: client.phone,
            jobTitle: 'Gerente',
            isPrimary: true,
          },
        ],
        opportunities: [{ id: 'o1', title: 'Renovación', amount: 10000, stage: 'PROPOSAL', probability: 50 }],
        activities: [],
        tickets: [],
        timeline: [],
      })
    }),
    http.get('*/api/v1/crm/clients/:id', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) return jsonError('Cliente no encontrado', 404)
      return jsonOk(client)
    }),
    http.get('*/api/v1/crm/clients', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const items = filterClients(url)
      const start = (page - 1) * perPage
      return jsonOk(items.slice(start, start + perPage), {
        page,
        perPage,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / perPage) || 1),
      })
    }),
    http.post('*/api/v1/crm/clients', async ({ request }) => {
      const body = (await request.json()) as Partial<CrmClient>
      if (mockClients.some((item) => item.name.toLowerCase() === String(body.name ?? '').trim().toLowerCase())) {
        return jsonError('Ya existe un cliente con ese nombre', 409)
      }
      if (mockClients.some((item) => item.email.toLowerCase() === String(body.email ?? '').trim().toLowerCase())) {
        return jsonError('Ya existe un cliente con ese correo', 409)
      }
      if (body.phone && !isValidClientPhone(String(body.phone))) {
        return jsonError('El teléfono debe tener entre 8 y 10 dígitos', 400)
      }
      const client: CrmClient = {
        id: `c${Date.now()}`,
        name: String(body.name ?? '').trim(),
        industry: String(body.industry ?? '').trim(),
        region: String(body.region ?? '').trim(),
        tier: (body.tier as CrmClient['tier']) ?? 'BRONZE',
        segment: (body.segment as CrmClient['segment']) ?? 'SMB',
        email: String(body.email ?? '').trim().toLowerCase(),
        phone: normalizeClientPhone(String(body.phone ?? '')),
        status: (body.status as CrmClient['status']) ?? 'PROSPECT',
        score: 50,
        ownerId: '1',
        ownerName: 'Admin Sistema',
        createdAt: new Date().toISOString(),
      }
      mockClients = [client, ...mockClients]
      return jsonOk(client, null, 'Cliente creado')
    }),
    http.put('*/api/v1/crm/clients/:id', async ({ params, request }) => {
      const index = mockClients.findIndex((item) => item.id === params.id)
      if (index === -1) return jsonError('Cliente no encontrado', 404)
      const body = (await request.json()) as Partial<CrmClient>
      const current = mockClients[index]
      const nextName = body.name?.trim() ?? current.name
      const nextEmail = body.email?.trim().toLowerCase() ?? current.email
      if (mockClients.some((item) => item.id !== current.id && item.name.toLowerCase() === nextName.toLowerCase())) {
        return jsonError('Ya existe un cliente con ese nombre', 409)
      }
      if (mockClients.some((item) => item.id !== current.id && item.email.toLowerCase() === nextEmail)) {
        return jsonError('Ya existe un cliente con ese correo', 409)
      }
      mockClients[index] = {
        ...current,
        ...body,
        name: nextName,
        email: nextEmail,
        phone: body.phone ? normalizeClientPhone(body.phone) : current.phone,
      }
      return jsonOk(mockClients[index], null, 'Cliente actualizado')
    }),
  ]
}
