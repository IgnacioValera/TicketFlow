export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))
  return [headers.join(','), ...body].join('\n')
}
