# TicketFlow CRM — implementación

TicketFlow es ahora Help Desk + CRM + encuestas dinámicas. La entidad `Company` evolucionó a `Client` sin borrar datos locales.

## Migración

- Archivo: `apps/backend/src/database/migrations/1762000000000-CrmSchema.ts`
- Rename `companies` → `clients`, `tickets.company_id` → `client_id`
- Columnas nuevas: `segment`, `owner_id`, `score`, `email`/`phone`, `created_at`/`updated_at`
- Enums: `client_status` (incluye `PROSPECT`), `client_segment`, pipeline, actividades, encuestas
- Roles nuevos en `roles_code_enum`: `SALES`, `CLIENT`

Aplicar: `cd apps/backend && npm run db:setup`

## Entidades

`Client`, `CrmContact`, `CrmOpportunity`, `CrmOpportunityStageHistory`, `CrmActivity`, `CrmSurvey`, `CrmSurveyQuestion`, `CrmSurveyQuestionOption`, `CrmSurveyInvitation`, `CrmSurveyResponse`, `CrmSurveyAnswer`.

La encuesta de ticket `satisfaction_surveys` se conserva.

## Roles

| Código | Etiqueta |
|---|---|
| ADMIN | Administrador |
| SALES | Ejecutivo comercial |
| SUPERVISOR | Supervisor |
| AGENT | Agente de soporte |
| CLIENT | Cliente portal |
| REQUESTER | Solicitante (legado, sin uso) |

`requester@helpdesk.com` queda en rol `CLIENT`. Usuario nuevo: `sales@helpdesk.com` / `password`.

## Permisos CRM

`CRM_CLIENT_*`, `CRM_CONTACT_*`, `CRM_OPPORTUNITY_*`, `CRM_ACTIVITY_*`, `CRM_SURVEY_*`, `CRM_DASHBOARD`, `CRM_EXPORT`, `CRM_RESPONSE_VIEW`.

Cartera: SALES ve `ownerId = yo` o sin owner; ADMIN/SUPERVISOR todos; AGENT clientes de sus tickets.

## Endpoints (`/api/v1`)

- `/crm/clients` CRUD + `/360` + `/recalculate-score` + `/export`
- `/crm/contacts`, `/crm/opportunities` (`PATCH :id/stage`, `POST :id/survey-links/:surveyId`)
- `/crm/activities` (`PATCH :id/complete`)
- `/crm/surveys` builder, publish, results
- `/crm/dashboard`
- `/public/surveys/:token` y `POST .../respond` (`@Public()`)

Tokens: `randomBytes` + SHA-256, un uso, expiración 30 días. 404 inválido, 410 expirado, 409 ya respondida.

WON dispara invitaciones de encuestas `PUBLISHED` + `OPPORTUNITY_WON` sin duplicar `(opportunityId, surveyId)`.

## Score 0–100

30% satisfacción (ticket 1–5 y NPS CRM), 25% won/(won+lost), 20% actividades completadas 90d, 15% tickets cerrados, 10% antigüedad (2 años = 100). Dimensión sin datos = 50.

## Frontend

Rutas `/crm/*`, `/knowledge`, `/public/surveys/:token` (fuera de `ProtectedRoute`). Kanban comercial con HTML5 drag-and-drop. CSV en `utils/csv.ts`.

## Verificación

```bash
cd apps/backend && npm run lint && npm test && npm run build
cd apps/frontend/web-shell && npm run lint && npm test && npm run typecheck && npm run build
```
