import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbPromise } from '../db/index.js'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref([])
  const searchQuery = ref('')
  const lastUnavailableIds = ref(new Set(
    JSON.parse(localStorage.getItem('dunnes-last-unavailable') || '[]')
  ))

  const sortedItems = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    const filtered = q
      ? items.value.filter(i => i.name.toLowerCase().includes(q))
      : items.value
    const unavailSet = lastUnavailableIds.value
    return [...filtered].sort((a, b) => {
      const aUnavail = unavailSet.has(a.id) ? 1 : 0
      const bUnavail = unavailSet.has(b.id) ? 1 : 0
      if (bUnavail !== aUnavail) return bUnavail - aUnavail
      return (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.name.localeCompare(b.name)
    })
  })

  async function loadFromDb() {
    items.value = await (await dbPromise).getAll('catalog')
    lastUnavailableIds.value = new Set(
      JSON.parse(localStorage.getItem('dunnes-last-unavailable') || '[]')
    )
  }

  async function addProduct(name, category, price) {
    const item = {
      name: name.trim(),
      category: category.trim(),
      price: parseFloat(price),
      purchaseCount: 0,
      lastUpdated: new Date().toISOString(),
      lastPurchasedAt: null
    }
    const id = await (await dbPromise).add('catalog', item)
    items.value.push({ ...item, id })
    return { ...item, id }
  }

  async function updateProduct(id, updates) {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const updated = { ...items.value[idx], ...updates, lastUpdated: new Date().toISOString() }
    await (await dbPromise).put('catalog', updated)
    items.value[idx] = updated
  }

  async function deleteProduct(id) {
    await (await dbPromise).delete('catalog', id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function incrementPurchaseCount(id) {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const updated = {
      ...items.value[idx],
      purchaseCount: (items.value[idx].purchaseCount || 0) + 1,
      lastPurchasedAt: new Date().toISOString()
    }
    await (await dbPromise).put('catalog', updated)
    items.value[idx] = updated
  }

  async function replaceAll(newItems) {
    await (await dbPromise).clear('catalog')
    items.value = []
    for (const item of newItems) {
      const { id: _id, ...rest } = item
      const newId = await (await dbPromise).add('catalog', rest)
      items.value.push({ ...rest, id: newId })
    }
  }

  return {
    items,
    searchQuery,
    sortedItems,
    lastUnavailableIds,
    loadFromDb,
    addProduct,
    updateProduct,
    deleteProduct,
    incrementPurchaseCount,
    replaceAll
  }
})
