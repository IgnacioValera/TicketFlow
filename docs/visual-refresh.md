# Renovación visual de TicketFlow

## Cambios principales

- Sidebar plegable en escritorio y desplegable en móvil.
- Navegación agrupada por Operación, Administración, Analítica y Cuenta.
- Menú de perfil en el encabezado con acceso rápido y cierre de sesión.
- Perfil profesional con identidad, sesión, seguridad y permisos por módulo.
- Módulo principal **Flujo visual** en `/ticket-flow`, con selector de tickets según el rol.
- Flujo visual conectado a los datos reales de cada ticket en `/tickets/:id/flow`.
- Acceso al flujo desde el detalle del ticket.
- Vista de mapa y vista cronológica.
- Once etapas: entrada, clasificación, SLA, asignación, diagnóstico, espera, escalamiento, resolución, validación, cierre y satisfacción.
- Inspector de etapa con evento técnico, regla de negocio, origen, responsable y duración.
- Nueva identidad visual en violeta, coral y neutros cálidos.
- Renovación de login, dashboard, tablas, filtros, formularios, reportes y catálogos.

## Ejecución local

El archivo `.env` incluido activa MSW para que la demostración funcione sin backend:

```bash
npm install
npm run dev
```

Credenciales de demostración:

- Usuario: `admin@helpdesk.com`
- Contraseña: `password`

## Integración con backend

Para usar la API real, cambia `VITE_USE_MOCKS=false` y configura `VITE_API_BASE_URL` con la URL del backend.
