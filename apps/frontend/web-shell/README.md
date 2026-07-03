# helpdesk-frontend

Frontend del **Sistema de Tickets / Mesa de Ayuda** — React + Vite + TypeScript + Tailwind CSS.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
cp .env.example .env
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | URL base de la API REST | `http://localhost:8000/api/v1` |
| `VITE_USE_MOCKS` | Activar mocks locales (sin backend) | `true` |

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Usuarios de prueba (modo mock)

| Correo | Contraseña | Rol |
|--------|------------|-----|
| admin@helpdesk.com | password | Administrador |
| agent@helpdesk.com | password | Agente |
| supervisor@helpdesk.com | password | Supervisor |
| requester@helpdesk.com | password | Solicitante |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Linter + typecheck |
| `npm run format` | Formatear código con Prettier |
| `npm run test:e2e` | Pruebas E2E con Playwright |

## Estructura del proyecto

```
src/
├── pages/          # Pantallas (PascalCase + Page)
├── components/     # Componentes reutilizables
├── layouts/        # AuthLayout, DashboardLayout
├── hooks/          # useAuth, usePermissions
├── services/       # apiClient, auth, users
├── types/          # Tipos TypeScript
├── constants/      # Roles, permisos, navegación
└── utils/          # Utilidades
```

## Ramas y commits

- Ramas: `feature/<modulo>-<descripcion>` desde `develop`
- Commits: Conventional Commits (`feat(auth): mensaje`)
- PRs apuntan a `develop` con al menos 1 revisión

## Documentación del proyecto

- Manual de Desarrollo v1.0
- Project Charter v1.0
- Scaffolding técnico

## Módulos implementados (Persona 1)

- Setup del proyecto y tokens de diseño
- Cliente API con JWT
- Autenticación y control de acceso (RBAC)
- Layouts y navegación por rol
- Componentes comunes: DataTable, Modal, StatusBadge
- Módulo de administración de usuarios

## Módulos pendientes (otros integrantes)

- **Persona 2:** Tickets (creación, listado, detalle, ciclo de vida)
- **Persona 3:** Catálogos, Dashboard y Reportes
