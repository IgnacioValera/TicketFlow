# TicketFlow

Monorepo del Sistema de Tickets / Mesa de Ayuda.

## Estructura

| Carpeta | Descripción |
|---------|-------------|
| `apps/frontend/web-shell` | Aplicación web React + Vite (mesa de ayuda) |
| `apps/frontend/commons` | Componentes compartidos del frontend |
| `apps/backend` | API y servicios backend |
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
