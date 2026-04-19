import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getActiveSession, putActiveSession, clearActiveSession } from '../db/activeSessionDb.js'
import { addHistoryEntry } from '../db/historyDb.js'
import { useSessionStore } from './sessionStore.js'
import { useCatalogStore } from './catalogStore.js'

export const useActiveSessionStore = defineStore('activeSession', () => {
  const items = ref([])
  const target = ref(0)
  const shoppingDate = ref(new Date().toISOString().slice(0, 10))

  const availableTotal = computed(() =>
    items.value
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + i.sessionPrice * i.quantity, 0)
  )

  const gap = computed(() => Math.max(0, target.value - availableTotal.value))

  const isOverTarget = computed(() => availableTotal.value > target.value)

  const progressPct = computed(() =>
    target.value > 0 ? (availableTotal.value / target.value) * 100 : 0
  )

  const checkedCount = computed(() => items.value.filter(i => i.checked).length)

  const unavailableItems = computed(() => items.value.filter(i => i.unavailable))

  const activeItemProductIds = computed(() => new Set(items.value.map(i => i.productId)))

  async function init() {
    const session = useSessionStore()
    const stored = await getActiveSession()
    if (stored) {
      items.value = stored.items
      target.value = stored.target
      shoppingDate.value = stored.shoppingDate ?? new Date().toISOString().slice(0, 10)
    } else {
      target.value = session.target
      await _persist()
    }
  }

  async function addItem(product) {
    const existing = items.value.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({
        productId: product.id,
        name: product.name,
        catalogPrice: product.price,
        sessionPrice: product.price,
        quantity: 1,
        checked: false,
        unavailable: false
      })
    }
    await _persist()
  }

  async function removeItem(productId) {
    items.value = items.value.filter(i => i.productId !== productId)
    await _persist()
  }

  async function updateQuantity(productId, qty) {
    if (qty <= 0) {
      await removeItem(productId)
      return
    }
    const item = items.value.find(i => i.productId === productId)
    if (item) item.quantity = qty
    await _persist()
  }

  async function toggleChecked(productId) {
    const item = items.value.find(i => i.productId === productId)
    if (item && !item.unavailable) item.checked = !item.checked
    await _persist()
  }

  async function toggleUnavailable(productId) {
    const item = items.value.find(i => i.productId === productId)
    if (item) {
      item.unavailable = !item.unavailable
      if (item.unavailable) item.checked = false
    }
    await _persist()
  }

  async function applyDiscount(productId, discountAmount) {
    const item = items.value.find(i => i.productId === productId)
    if (item) {
      item.sessionPrice = Math.max(0, item.catalogPrice - discountAmount)
    }
    await _persist()
  }

  async function resetDiscount(productId) {
    const item = items.value.find(i => i.productId === productId)
    if (item) item.sessionPrice = item.catalogPrice
    await _persist()
  }

  async function updateTarget(newTarget) {
    target.value = newTarget
    await _persist()
  }

  async function updateShoppingDate(date) {
    shoppingDate.value = date
    await _persist()
  }

  async function clearList() {
    items.value = []
    await _persist()
  }

  async function loadFromCart(cartItems, sessionTarget) {
    items.value = cartItems.map(i => ({
      productId: i.productId,
      name: i.name,
      catalogPrice: i.price,
      sessionPrice: i.price,
      quantity: i.quantity,
      checked: false,
      unavailable: false
    }))
    target.value = sessionTarget
    await _persist()
  }

  async function completeShop() {
    const availableItems = items.value.filter(i => !i.unavailable)
    if (availableItems.length === 0) return

    const unavailableItems = items.value.filter(i => i.unavailable)

    const entry = {
      date: new Date().toISOString(),
      target: target.value,
      items: availableItems.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.sessionPrice,
        quantity: i.quantity
      })),
      unavailableItems: unavailableItems.map(i => ({ productId: i.productId, name: i.name })),
      totalSpent: availableTotal.value
    }

    await addHistoryEntry(entry)

    // Persist unavailable items so the Shop tab can surface them first next time
    if (unavailableItems.length > 0) {
      localStorage.setItem(
        'dunnes-last-unavailable',
        JSON.stringify(unavailableItems.map(i => i.productId))
      )
    } else {
      localStorage.removeItem('dunnes-last-unavailable')
    }

    const catalog = useCatalogStore()
    for (const item of availableItems) {
      for (let i = 0; i < item.quantity; i++) {
        await catalog.incrementPurchaseCount(item.productId)
      }
    }

    await clearActiveSession()
    items.value = []

    const session = useSessionStore()
    session.setView('history')
    window.location.hash = 'history'
  }

  async function _persist() {
    await putActiveSession({ id: 1, target: target.value, items: items.value, shoppingDate: shoppingDate.value })
  }

  return {
    items,
    target,
    shoppingDate,
    availableTotal,
    gap,
    isOverTarget,
    progressPct,
    checkedCount,
    unavailableItems,
    activeItemProductIds,
    init,
    addItem,
    removeItem,
    updateQuantity,
    toggleChecked,
    toggleUnavailable,
    applyDiscount,
    resetDiscount,
    updateTarget,
    updateShoppingDate,
    clearList,
    loadFromCart,
    completeShop
  }
})
