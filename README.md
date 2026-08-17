# TicketFlow

Sistema web funcional de tickets / mesa de ayuda. Incluye frontend React, API NestJS, PostgreSQL, TypeORM, autenticación JWT con rotación de refresh tokens, control de permisos por rol y documentación Swagger/OpenAPI.

## Inicio rápido con Docker

Requisitos: Docker Desktop o Docker Engine con Compose.

```bash
docker compose up --build
```

Cuando los tres contenedores estén listos:

- Aplicación: http://localhost:5173
- API: http://localhost:8000/api/v1
- Swagger: http://localhost:8000/docs
- PostgreSQL: `localhost:55432`

La API aplica la migración y ejecuta el seed de forma idempotente al iniciar.

### Usuarios de demostración

Todos usan la contraseña `password`.

| Rol | Correo |
|---|---|
| Administrador | `admin@helpdesk.com` |
| Ejecutivo comercial | `sales@helpdesk.com` |
| Supervisor | `supervisor@helpdesk.com` |
| Agente | `agent@helpdesk.com` |
| Cliente portal | `requester@helpdesk.com` |

## Ejecución local sin Docker para Node

PostgreSQL debe estar disponible antes de iniciar la API.

```bash
cd apps/backend
cp .env.example .env
npm install
npm run db:setup
npm run start:dev
```

En otra terminal:

```bash
cd apps/frontend/web-shell
cp .env.example .env
npm install
npm run dev
```

## Verificación

```bash
cd apps/backend
npm run lint
npm test
npm run build

cd ../frontend/web-shell
npm run build
```

Consulta [docs/backend-api.md](docs/backend-api.md) y [docs/CRM_IMPLEMENTATION.md](docs/CRM_IMPLEMENTATION.md) para arquitectura, CRM, entidades, permisos y rutas.

## Estructura

| Carpeta | Descripción |
|---------|-------------|
| `apps/frontend/web-shell` | Aplicación web React + Vite (mesa de ayuda) |
| `apps/frontend/commons` | Componentes compartidos del frontend |
| `apps/backend` | API NestJS, migración, seed y pruebas |
| `apps/mobile` | Aplicación móvil |
| `apps/e2e` | Pruebas end-to-end del monorepo |
| `packages` | Paquetes compartidos |
| `docs` | Documentación del proyecto |
| `infra` | Infraestructura y despliegue |
| `scripts` | Scripts de automatización |

## Frontend (web-shell)

```bash
cd apps/frontend/web-shell
npm install
cp .env.example .env
npm run dev
```

Ver [apps/frontend/web-shell/README.md](apps/frontend/web-shell/README.md) para detalles de instalación, variables de entorno y pruebas.
