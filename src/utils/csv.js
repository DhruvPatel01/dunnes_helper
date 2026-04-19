export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim() ?? '']))
  }).filter(row => row.name && row.price)
}

function parseRow(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(current); current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

export function generateCsv(items) {
  const header = 'name,price'
  const rows = items.map(item => `${escapeCell(item.name)},${item.price.toFixed(2)}`)
  return [header, ...rows].join('\n')
}

function escapeCell(val) {
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
