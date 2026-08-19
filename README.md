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

## Despliegue en Render (Blueprint)

El archivo [`render.yaml`](render.yaml) define:

| Recurso | Tipo | Rol |
|---------|------|-----|
| `ticketflow-db` | Render Postgres 16 (`free`) | Base de datos (solo red privada) |
| `ticketflow-api` | Web service Docker (`free`) | API NestJS |
| `ticketflow-web` | Web service Docker (`free`) | Frontend nginx |

### Cómo crear el Blueprint

1. Sube el repositorio a GitHub/GitLab.
2. En el [Dashboard de Render](https://dashboard.render.com): **New → Blueprint**.
3. Conecta el repo y confirma que detecta `render.yaml`.
4. Aplica el Blueprint (región por defecto: Oregon).

Tras el primer deploy exitoso:

- La API corre migraciones (`preDeployCommand`) y el seed idempotente (`initialDeployHook`).
- El frontend construye `VITE_API_BASE_URL` a partir de `API_ORIGIN` (URL pública de la API).
- Usa los mismos [usuarios de demostración](#usuarios-de-demostración) (`password`).

### Limitaciones del plan free

- Postgres free: 1 GB y caduca a los 30 días (luego 14 días de gracia para actualizar).
- Los web services free se duermen tras ~15 minutos de inactividad.
- Sin disco persistente: los archivos en `uploads/` se pierden al redeploy/reinicio.

Si el frontend quedó apuntando a una API vacía en el primer build, dispara un **Manual Deploy** de `ticketflow-web` para regenerar el bundle con `API_ORIGIN` ya resuelto.

## Estructura

| Carpeta | Descripción |
|---------|-------------|
| `apps/frontend/web-shell` | Aplicación web React + Vite (mesa de ayuda) |
| `apps/backend` | API NestJS, migración, seed y pruebas |
| `docker-compose.yml` | Stack local (PostgreSQL + API + frontend) |
| `render.yaml` | Blueprint de despliegue en Render |

## Frontend (web-shell)

```bash
cd apps/frontend/web-shell
npm install
cp .env.example .env
npm run dev
```

Ver [apps/frontend/web-shell/README.md](apps/frontend/web-shell/README.md) para detalles de instalación, variables de entorno y pruebas.
