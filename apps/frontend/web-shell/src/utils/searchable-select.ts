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
