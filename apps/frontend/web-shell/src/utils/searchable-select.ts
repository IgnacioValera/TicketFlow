export type SearchableSelectOption = {
  value: string
  label: string
  description?: string
}

export function filterSelectOptions(options: SearchableSelectOption[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return options
  return options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase()
    return haystack.includes(needle)
  })
}

export function moveSelectIndex(current: number, direction: 1 | -1, count: number) {
  if (count <= 0) return -1
  if (current < 0) return direction === 1 ? 0 : count - 1
  return (current + direction + count) % count
}

export function optionLabelFromChildren(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(optionLabelFromChildren).join('')
  return ''
}

export function placeSelectMenu(
  trigger: { top: number; bottom: number; left: number; width: number },
  viewportHeight: number,
  maxMenuHeight = 256,
  preferred: 'top' | 'bottom' = 'bottom',
) {
  const gap = 4
  const spaceBelow = viewportHeight - trigger.bottom - 8
  const spaceAbove = trigger.top - 8
  const openUpward =
    preferred === 'top'
      ? spaceAbove >= 96 || spaceAbove > spaceBelow
      : spaceBelow < 140 && spaceAbove > spaceBelow
  const maxHeight = Math.max(96, Math.min(maxMenuHeight, openUpward ? spaceAbove : spaceBelow))
  return {
    left: trigger.left,
    width: trigger.width,
    maxHeight,
    top: openUpward ? undefined : trigger.bottom + gap,
    bottom: openUpward ? viewportHeight - trigger.top + gap : undefined,
  }
}
