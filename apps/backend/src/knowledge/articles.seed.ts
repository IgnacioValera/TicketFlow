export interface KnowledgeSeedArticle {
  title: string
  topic: string
  tags: string
  content: string
  categoryName: string | null
}

export const KNOWLEDGE_SEED_ARTICLES: KnowledgeSeedArticle[] = [
  {
    title: 'Cómo restablecer la contraseña',
    topic: 'Accesos',
    tags: 'contraseña, acceso, cuenta, administrador',
    categoryName: 'Accesos',
    content:
      'Si olvidaste tu contraseña, selecciona “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión. TicketFlow te indicará que debes solicitar el restablecimiento a un administrador.\n\nEl administrador generará una contraseña temporal y te la proporcionará directamente. Inicia sesión con esa contraseña y el sistema te pedirá crear una nueva antes de permitirte acceder al panel.\n\nTicketFlow no permite consultar ni recuperar la contraseña anterior.',
  },
  {
    title: 'Cambiar mi contraseña desde el perfil',
    topic: 'Accesos',
    tags: 'contraseña, perfil, seguridad, cuenta',
    categoryName: 'Accesos',
    content:
      'Si puedes iniciar sesión y deseas actualizar tu contraseña, abre el menú de usuario, entra en “Mi perfil” y selecciona “Cambiar contraseña” dentro de la sección “Seguridad y sesión”.\n\nIngresa tu contraseña actual, escribe la nueva contraseña y confírmala. La nueva contraseña debe cumplir todos los requisitos de seguridad mostrados en pantalla.',
  },
  {
    title: 'Cómo crear un ticket',
    topic: 'Mesa de ayuda',
    tags: 'ticket, solicitud, incidente, soporte',
    categoryName: null,
    content:
      'Selecciona “Crear ticket” en el menú lateral. Captura un título claro, describe el problema, elige la categoría y la prioridad correspondiente y envía la solicitud.\n\nIncluye información suficiente para que el equipo de soporte pueda reproducir o comprender el problema.',
  },
  {
    title: 'Cómo consultar el avance de un ticket',
    topic: 'Mesa de ayuda',
    tags: 'ticket, seguimiento, estado, avance',
    categoryName: null,
    content:
      'Abre la sección “Tickets” y selecciona el registro que deseas consultar. En el detalle podrás revisar su estado, responsable, prioridad, comentarios, archivos adjuntos e historial.\n\nLa opción “Flujo visual” permite consultar gráficamente las etapas recorridas por el ticket.',
  },
  {
    title: 'Estados de un ticket',
    topic: 'Mesa de ayuda',
    tags: 'estado, abierto, proceso, resuelto, cerrado',
    categoryName: null,
    content:
      'Abierto indica que el ticket fue registrado. En progreso significa que el equipo está trabajando en él. En espera del usuario indica que se necesita información adicional. Resuelto significa que se aplicó una solución. Cerrado indica que el proceso terminó. Cancelado significa que el ticket dejó de atenderse.\n\nAlgunos cambios de estado requieren un motivo obligatorio.',
  },
  {
    title: 'Cómo agregar comentarios',
    topic: 'Mesa de ayuda',
    tags: 'comentario, seguimiento, comunicación, ticket',
    categoryName: null,
    content:
      'Dentro del detalle de un ticket activo puedes agregar comentarios para aportar información, responder preguntas o registrar avances.\n\nLos tickets cerrados o cancelados son de solo lectura y no permiten agregar nuevos comentarios.',
  },
  {
    title: 'Cómo adjuntar evidencias',
    topic: 'Mesa de ayuda',
    tags: 'archivo, adjunto, evidencia, documento',
    categoryName: null,
    content:
      'Desde el detalle de un ticket activo puedes adjuntar evidencias en formato PDF, DOCX, JPG, JPEG o PNG.\n\nEl tamaño máximo permitido por archivo es de 5 MB. Los archivos con extensiones no permitidas o contenido inválido serán rechazados.',
  },
  {
    title: 'Qué significa el SLA',
    topic: 'SLA',
    tags: 'sla, tiempo, respuesta, resolución',
    categoryName: null,
    content:
      'El SLA define el tiempo esperado para responder y resolver un ticket. El plazo depende de la prioridad y de la política asignada.\n\nEn el detalle del ticket puedes consultar el tiempo consumido y si el SLA se encuentra vigente o vencido.',
  },
  {
    title: 'Cómo reabrir un ticket cerrado',
    topic: 'Mesa de ayuda',
    tags: 'reabrir, cerrado, estado, motivo',
    categoryName: null,
    content:
      'Un ticket cerrado puede volver a “En progreso” cuando sea necesario continuar su atención y el rol del usuario tenga permiso para hacerlo.\n\nLa reapertura requiere registrar un motivo. Los tickets cancelados no pueden reabrirse.',
  },
  {
    title: 'Asignar un ticket a un agente',
    topic: 'Administración',
    tags: 'asignación, agente, supervisor, administrador',
    categoryName: null,
    content:
      'Los supervisores y administradores pueden asignar un ticket activo a un agente disponible. La asignación queda registrada en el historial del ticket.\n\nLos tickets cerrados o cancelados no pueden asignarse nuevamente.',
  },
  {
    title: 'Encuesta al cerrar un ticket',
    topic: 'Encuestas',
    tags: 'encuesta, satisfacción, cerrado, servicio',
    categoryName: null,
    content:
      'Después del cierre de un ticket, el solicitante puede responder una encuesta para evaluar la atención recibida.\n\nLa encuesta ayuda a medir la calidad del servicio y detectar oportunidades de mejora.',
  },
]
