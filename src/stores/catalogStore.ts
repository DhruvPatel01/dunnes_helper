import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbPromise, writeTransaction } from '../db/index.ts'
import { computeRecommendationScores } from '../utils/recommendations.ts'
import { readLocalJson } from '../utils/storage.ts'
import { roundMoney } from '../utils/money.ts'
import { historyPurchaseDate } from '../utils/dates.ts'
import { createProductSearch, type ProductComparator } from '../utils/productSearch.ts'
import type { CatalogProduct, HistoryEntry } from '../types'

function validateProduct(name: string, price: number): void {
  if (!name.trim() || !Number.isFinite(price) || price < 0) throw new Error('Enter a name and a valid price')
}

function unavailableIds(): Set<number> {
  const stored = readLocalJson('dunnes-last-unavailable')
  return new Set(Array.isArray(stored) ? stored.filter(id => Number.isSafeInteger(id) && id > 0) : [])
}

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref<CatalogProduct[]>([])
  const searchQuery = ref('')
  const recommendationScores = ref(new Map<number, number>())
  const lastUnavailableIds = ref(unavailableIds())
  const productSearch = computed(() => createProductSearch(items.value))

  function searchProducts(query: string, compare?: ProductComparator): CatalogProduct[] {
    return productSearch.value(query, compare)
  }

  const categories = computed(() => {
    const unique = new Map<string, string>()
    for (const item of items.value) {
      const category = item.category.trim()
      const key = category.toLowerCase()
      if (category && !unique.has(key)) unique.set(key, category)
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b))
  })

  function canonicalCategory(value: string): string {
    const trimmed = value.trim()
    return categories.value.find(category => category.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
  }

  const sortedItems = computed(() => {
    const unavailSet = lastUnavailableIds.value
    return searchProducts(searchQuery.value, (a, b) => {
      const aUnavail = unavailSet.has(a.id!) ? 1 : 0
      const bUnavail = unavailSet.has(b.id!) ? 1 : 0
      if (bUnavail !== aUnavail) return bUnavail - aUnavail
      return (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.name.localeCompare(b.name)
    })
  })

  async function loadFromDb(): Promise<void> {
    items.value = await (await dbPromise).getAll('catalog')
    lastUnavailableIds.value = unavailableIds()
  }

  async function addProduct(name: string, category: string, price: number): Promise<CatalogProduct> {
    validateProduct(name, price)
    const item = {
      name: name.trim(),
      category: canonicalCategory(category),
      price: roundMoney(price),
      purchaseCount: 0,
      lastUpdated: new Date().toISOString(),
      lastPurchasedAt: null
    }
    const id = await (await dbPromise).add('catalog', item)
    const withId: CatalogProduct = { ...item, id: id as number }
    items.value.push(withId)
    return withId
  }

  async function updateProduct(id: number, updates: Partial<CatalogProduct>): Promise<void> {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const updated: CatalogProduct = { ...items.value[idx], ...updates, lastUpdated: new Date().toISOString() }
    if (updates.category !== undefined) updated.category = canonicalCategory(updates.category)
    validateProduct(updated.name, updated.price)
    updated.price = roundMoney(updated.price)
    await (await dbPromise).put('catalog', updated)
    items.value[idx] = updated
  }

  async function deleteProduct(id: number): Promise<void> {
    await (await dbPromise).delete('catalog', id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function refreshPurchaseHistory(): Promise<void> {
    const { updated, history } = await writeTransaction(['catalog', 'history'], async tx => {
      const [history, products]: [HistoryEntry[], CatalogProduct[]] = await Promise.all([tx.objectStore('history').getAll(), tx.objectStore('catalog').getAll()])
      const stats = new Map<number, { count: number; date: string }>()
      for (const entry of history) {
        const date = entry.targetDate ? historyPurchaseDate(entry).toISOString() : entry.date
        for (const id of new Set(entry.items.map(item => item.productId))) {
          const previous = stats.get(id)
          stats.set(id, { count: (previous?.count ?? 0) + 1,
            date: previous && new Date(previous.date) > new Date(date) ? previous.date : date })
        }
      }
      const updated = products.map(product => ({ ...product,
        purchaseCount: stats.get(product.id!)?.count ?? 0,
        lastPurchasedAt: stats.get(product.id!)?.date ?? null
      }))
      await Promise.all(updated.filter((product, idx) => product.purchaseCount !== products[idx].purchaseCount ||
        product.lastPurchasedAt !== products[idx].lastPurchasedAt).map(product => tx.objectStore('catalog').put(product)))
      return { updated, history }
    })
    items.value = updated
    recommendationScores.value = computeRecommendationScores(history)
  }

  async function replaceAll(newItems: Omit<CatalogProduct, 'id'>[]): Promise<void> {
    newItems.forEach(item => validateProduct(item.name, item.price))
    const replaced = await writeTransaction(['catalog'], async tx => {
      const store = tx.objectStore('catalog')
      const existing: CatalogProduct[] = await store.getAll()
      await store.clear()
      const replaced: CatalogProduct[] = []
      const usedIds = new Set<number>()
      for (const incoming of newItems) {
        const match = existing.find(item => !usedIds.has(item.id!) && item.name.trim().toLowerCase() === incoming.name.trim().toLowerCase())
        const { id: _id, ...fields } = incoming as CatalogProduct
        const item = { ...fields, name: incoming.name.trim(), price: roundMoney(incoming.price) }
        if (match) {
          usedIds.add(match.id!)
          const preserved = { ...item, id: match.id!, purchaseCount: match.purchaseCount, lastPurchasedAt: match.lastPurchasedAt }
          await store.put(preserved)
          replaced.push(preserved)
        } else {
          const newId = await store.add(item)
          replaced.push({ ...item, id: newId as number })
        }
      }
      return replaced
    })
    items.value = replaced
  }

  return {
    items,
    searchQuery,
    sortedItems,
    searchProducts,
    categories,
    lastUnavailableIds,
    recommendationScores,
    loadFromDb,
    refreshPurchaseHistory,
    addProduct,
    updateProduct,
    deleteProduct,
    replaceAll
  }
})
