# TicketFlow — Plan de implementación CRM + Help Desk + Encuestas

## Arquitectura actual

- Backend NestJS (`apps/backend`): Auth, Users, Catalogs, Tickets, Analytics, Knowledge.
- Frontend React (`apps/frontend/web-shell`): tickets, catálogos, dashboard, reportes.
- PostgreSQL local, TypeORM, `synchronize: false`.
- Entidad `Company` (tabla `companies`): catálogo de solo lectura; tickets con `company_id` opcional.
- Roles: `ADMIN`, `SUPERVISOR`, `AGENT`, `REQUESTER`.
- Encuesta de ticket: `satisfaction_surveys` (rating 1–5 al cerrar). Se conserva.
- Validaciones: Trim, UUID, SLA, passwords, adjuntos, tickets finalizados.

## Arquitectura propuesta

CRM y Help Desk integrados alrededor de `Client` (evolución de `Company`).

- CRM: clients, contacts, opportunities, activities, surveys, responses.
- Help Desk: tickets, SLA, categorías, prioridades, knowledge, encuesta de satisfacción de ticket.
- Roles: ADMIN, SALES, SUPERVISOR, AGENT, CLIENT (REQUESTER migrado).
- Permisos CRM añadidos al sistema existente.

## Estrategia Company → Client

Migración nueva (sin DROP DATABASE): rename `companies` → `clients`, `company_id` → `client_id`, columnas CRM nuevas, datos locales preservados.

## Endpoints CRM (prefijo `/api/v1`)

- `/crm/clients`, `/crm/contacts`, `/crm/opportunities`, `/crm/activities`
- `/crm/surveys`, `/crm/dashboard`
- `/public/surveys/:token` (sin JWT)

## Score (0–100)

30% satisfacción, 25% oportunidades ganadas, 20% actividad, 15% tickets, 10% antigüedad. Dimensión sin datos = 50.

## NPS

Promotores 9–10, pasivos 7–8, detractores 0–6. NPS = %promotores − %detractores.
