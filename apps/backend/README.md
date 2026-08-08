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
- Helmet, CORS configurable y límite de 10 MB para adjuntos.

Para producción, cambia ambos secretos JWT, la contraseña de PostgreSQL y `FRONTEND_URL`.
