import type { ReactElement } from 'react'

export function RenderErrorPage(): ReactElement {
  throw new Error('TicketFlow test render error')
}
