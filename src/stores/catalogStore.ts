import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbPromise } from '../db/index.ts'
import { computeOverdueScores } from '../utils/recommendations.ts'
import type { CatalogProduct } from '../types'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref<CatalogProduct[]>([])
  const searchQuery = ref('')
  const recommendationScores = ref(new Map<number, number>())
  const lastUnavailableIds = ref(new Set<number>(
    JSON.parse(localStorage.getItem('dunnes-last-unavailable') || '[]')
  ))

  const sortedItems = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    const filtered = q
      ? items.value.filter(i => i.name.toLowerCase().includes(q))
      : items.value
    const unavailSet = lastUnavailableIds.value
    return [...filtered].sort((a, b) => {
      const aUnavail = unavailSet.has(a.id!) ? 1 : 0
      const bUnavail = unavailSet.has(b.id!) ? 1 : 0
      if (bUnavail !== aUnavail) return bUnavail - aUnavail
      return (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.name.localeCompare(b.name)
    })
  })

  async function loadFromDb(): Promise<void> {
    items.value = await (await dbPromise).getAll('catalog')
    lastUnavailableIds.value = new Set<number>(
      JSON.parse(localStorage.getItem('dunnes-last-unavailable') || '[]')
    )
  }

  async function addProduct(name: string, category: string, price: number): Promise<CatalogProduct> {
    const item = {
      name: name.trim(),
      category: category.trim(),
      price,
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
    await (await dbPromise).put('catalog', updated)
    items.value[idx] = updated
  }

  async function deleteProduct(id: number): Promise<void> {
    await (await dbPromise).delete('catalog', id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function incrementPurchaseCount(id: number): Promise<void> {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const updated: CatalogProduct = {
      ...items.value[idx],
      purchaseCount: (items.value[idx].purchaseCount || 0) + 1,
      lastPurchasedAt: new Date().toISOString()
    }
    await (await dbPromise).put('catalog', updated)
    items.value[idx] = updated
  }

  async function loadRecommendationScores(): Promise<void> {
    const history = await (await dbPromise).getAll('history')
    recommendationScores.value = computeOverdueScores(history)
  }

  async function replaceAll(newItems: Omit<CatalogProduct, 'id'>[]): Promise<void> {
    await (await dbPromise).clear('catalog')
    items.value = []
    for (const item of newItems) {
      const newId = await (await dbPromise).add('catalog', item)
      items.value.push({ ...item, id: newId as number })
    }
  }

  return {
    items,
    searchQuery,
    sortedItems,
    lastUnavailableIds,
    recommendationScores,
    loadFromDb,
    loadRecommendationScores,
    addProduct,
    updateProduct,
    deleteProduct,
    incrementPurchaseCount,
    replaceAll
  }
})
