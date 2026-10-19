import type { CatalogProduct, HistoryEntry } from '../types'
import { historyPurchaseDate } from './dates.ts'

const HALF_LIFE_VISITS = 4

interface ShoppingVisit {
  day: number
  productIds: Set<number>
}

function collectShoppingVisits(historyEntries: HistoryEntry[]): ShoppingVisit[] {
  const visits = new Map<number, Set<number>>()
  for (const entry of historyEntries) {
    const date = historyPurchaseDate(entry)
    if (!Number.isFinite(date.getTime())) continue
    // Multiple archives and quantities on the same shopping day count as one vote.
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    if (!visits.has(day)) visits.set(day, new Set())
    for (const item of entry.items) {
      visits.get(day)!.add(item.productId)
    }
  }
  return [...visits].map(([day, productIds]) => ({ day, productIds })).sort((a, b) => b.day - a.day)
}

function scoreShoppingVisits(visits: ShoppingVisit[]): Map<number, number> {
  const scores = new Map<number, number>()
  let totalWeight = 0
  for (const [index, visit] of visits.entries()) {
    // Each four newer shopping visits halve a purchase's contribution.
    const weight = 2 ** (-index / HALF_LIFE_VISITS)
    totalWeight += weight
    for (const id of visit.productIds) {
      scores.set(id, (scores.get(id) ?? 0) + weight)
    }
  }
  for (const [id, score] of scores) scores.set(id, score / totalWeight)
  return scores
}

export function computeRecommendationScores(historyEntries: HistoryEntry[]): Map<number, number> {
  return scoreShoppingVisits(collectShoppingVisits(historyEntries))
}

// debugRecommendations(catalogItems, historyEntries) — call from browser console:
//   import('/src/utils/recommendations.ts').then(m => m.debugRecommendations(catalog.items, history))
export function debugRecommendations(catalogItems: CatalogProduct[], historyEntries: HistoryEntry[]): void {
  const nameById = new Map(catalogItems.map(i => [i.id, i.name]))
  const visits = collectShoppingVisits(historyEntries)
  const rows = [...scoreShoppingVisits(visits)].map(([id, score]) => {
    const purchaseVisits = visits.filter(visit => visit.productIds.has(id))
    return {
      name: nameById.get(id) ?? `#${id}`,
      score: +score.toFixed(4),
      purchaseVisits: purchaseVisits.length,
      purchaseDates: purchaseVisits.map(visit => new Date(visit.day).toISOString().slice(0, 10)).join(', ')
    }
  })
  rows.sort((a, b) => b.score - a.score)
  console.table(rows)
}
