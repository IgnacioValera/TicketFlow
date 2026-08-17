export function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? '')).join(','))
  return [headers.join(','), ...body].join('\n')
}

export function downloadCsv(fileName: string, rows: Array<Record<string, string | number>>) {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
