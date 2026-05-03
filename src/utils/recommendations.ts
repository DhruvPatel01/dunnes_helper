import type { CatalogProduct, HistoryEntry } from '../types'

// debugRecommendations(catalogItems, historyEntries) — call from browser console:
//   import('/src/utils/recommendations.ts').then(m => m.debugRecommendations(catalog.items, history))
export function debugRecommendations(catalogItems: CatalogProduct[], historyEntries: HistoryEntry[], today = new Date()): void {
  const nameById = new Map(catalogItems.map(i => [i.id, i.name]))

  const purchaseDates = new Map<number, Date[]>()
  for (const entry of historyEntries) {
    const date = new Date(entry.date)
    for (const item of entry.items) {
      if (!purchaseDates.has(item.productId)) purchaseDates.set(item.productId, [])
      purchaseDates.get(item.productId)!.push(date)
    }
  }

  const rows: Array<{ name: string; score: number | string; medianDays: number | string; purchaseDates: string }> = []
  for (const [id, dates] of purchaseDates) {
    dates.sort((a, b) => a.getTime() - b.getTime())
    const daysSinceLast = (today.getTime() - dates.at(-1)!.getTime()) / 86400000
    let median: number | null = null
    if (dates.length >= 2) {
      const intervals = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / 86400000).sort((a, b) => a - b)
      const mid = Math.floor(intervals.length / 2)
      median = intervals.length % 2 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2
    }
    const score = median !== null ? daysSinceLast - median : -10000
    rows.push({
      name: nameById.get(id) ?? `#${id}`,
      score: median !== null ? +score.toFixed(1) : '— (1 purchase)',
      medianDays: median !== null ? +median.toFixed(1) : 'n/a',
      purchaseDates: dates.map(d => d.toISOString().slice(0, 10)).join(', ')
    })
  }

  rows.sort((a, b) => (b.score as number) - (a.score as number))
  console.table(rows)
}

export function computeOverdueScores(historyEntries: HistoryEntry[], today = new Date()): Map<number, number> {
  const purchaseDates = new Map<number, Date[]>()
  for (const entry of historyEntries) {
    const date = new Date(entry.date)
    for (const item of entry.items) {
      if (!purchaseDates.has(item.productId)) purchaseDates.set(item.productId, [])
      purchaseDates.get(item.productId)!.push(date)
    }
  }
  const scores = new Map<number, number>()
  for (const [id, dates] of purchaseDates) {
    dates.sort((a, b) => a.getTime() - b.getTime())
    const daysSinceLast = (today.getTime() - dates.at(-1)!.getTime()) / 86400000
    if (dates.length < 2) { scores.set(id, -10000); continue }
    const intervals = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / 86400000).sort((a, b) => a - b)
    const mid = Math.floor(intervals.length / 2)
    const median = intervals.length % 2 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2
    scores.set(id, daysSinceLast - median)
  }
  return scores
}
