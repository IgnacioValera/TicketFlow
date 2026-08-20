# TicketFlow Backend

API REST en NestJS 11, TypeScript, PostgreSQL y TypeORM. El prefijo de todas las rutas es `/api/v1`; Swagger se publica en `/docs`.

## Configuración local

```bash
cp .env.example .env
npm install
npm run db:setup
npm run start:dev
```

Scripts principales:

- `npm run migration:run`: crea o actualiza el esquema.
- `npm run db:seed`: carga roles, permisos, usuarios y datos de demostración.
- `npm test`: prueba reglas de flujo y SLA.
- `npm run lint`: ejecuta la comprobación estricta de TypeScript.
- `npm run build`: genera `dist/`.

El seed es idempotente. Puede ejecutarse varias veces sin duplicar catálogos ni usuarios.

El archivo `src/database/data-source.ts` debe conservar una sola exportación de la
instancia `DataSource`. El CLI de TypeORM rechaza el archivo si la misma instancia
se exporta simultáneamente como exportación nombrada y como `default`.

## Seguridad

- Access token JWT de 15 minutos.
- Refresh token JWT de 7 días, almacenado como SHA-256 y rotado en cada renovación.
- Contraseñas con bcrypt, 12 rondas.
- Guards globales de autenticación y permisos.
- Visibilidad por recurso para impedir que un solicitante o agente consulte tickets ajenos.
- Validación y limpieza de todos los DTO con `class-validator`.
- Helmet, CORS configurable y límite de 5 MB para adjuntos.
- Detección de tipo real de adjuntos con `file-type@16` (CommonJS, compatible con el backend Nest) y verificación de estructura DOCX con `jszip`.
- Integración opcional con n8n para asignación automática. El webhook se envía *después* de confirmar la creación del ticket; un fallo de n8n no impide el alta.

## n8n

Variables (ver `.env.example`):

- `N8N_TICKET_CREATED_WEBHOOK_URL`: webhook que recibe `TICKET_CREATED`.
- `N8N_WEBHOOK_SECRET`: header `x-ticketflow-webhook-secret` hacia n8n.
- `N8N_INTEGRATION_API_KEY`: header `x-ticketflow-integration-key` desde n8n hacia TicketFlow.

Si n8n y TicketFlow están en contenedores distintos, no uses `localhost`. Usa el nombre del servicio o `host.docker.internal`.

El workflow debe: recibir el evento → `GET /api/v1/integrations/n8n/tickets/:ticketId/assignment-context` → decidir un `assigneeId` → `POST /api/v1/integrations/n8n/tickets/:ticketId/assign`. Si la IA falla, llamar a `.../assignment-failed`. La asignación manual `PATCH /tickets/:id/assign` sigue disponible.

Para producción, cambia ambos secretos JWT, la contraseña de PostgreSQL y `FRONTEND_URL`.
