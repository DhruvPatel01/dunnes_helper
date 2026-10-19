import type { CatalogProduct } from '../types'

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', inQuotes = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '"') {
      if (inQuotes && source[i + 1] === '"') { cell += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(cell); cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      row.push(cell); rows.push(row); row = []; cell = ''
      if (ch === '\r' && source[i + 1] === '\n') i++
    } else cell += ch
  }
  if (inQuotes) throw new Error('Unclosed quote in CSV')
  row.push(cell)
  rows.push(row)
  const headers = rows.shift()!.map(header => header.trim().toLowerCase())
  if (!headers.includes('name') || !headers.includes('price')) throw new Error('CSV needs name and price columns')
  const names = new Set<string>()
  return rows.filter(row => row.some(cell => cell.trim())).map(values => {
    if (values.length !== headers.length) throw new Error('CSV column count does not match the header')
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]))
    const price = Number(row.price)
    if (!row.name || !row.price || !Number.isFinite(price) || price < 0) throw new Error('Each CSV row needs a name and a valid price')
    const name = row.name.toLowerCase()
    if (names.has(name)) throw new Error(`Duplicate product in CSV: ${row.name}`)
    names.add(name)
    return { ...row, category: row.category ?? '' }
  })
}

export function generateCsv(items: Pick<CatalogProduct, 'name' | 'category' | 'price'>[]): string {
  const header = 'name,category,price'
  const rows = items.map(item => `${escapeCell(item.name)},${escapeCell(item.category)},${item.price.toFixed(2)}`)
  return [header, ...rows].join('\n')
}

function escapeCell(val: unknown): string {
  const s = String(val)
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
