import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './sessionStore.js'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  const cartTotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const gap = computed(() => {
    const session = useSessionStore()
    return Math.max(0, session.target - cartTotal.value)
  })

  const isOverTarget = computed(() => {
    const session = useSessionStore()
    return cartTotal.value > session.target
  })

  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  function addItem(product) {
    const existing = items.value.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      })
    }
  }

  function removeItem(productId) {
    items.value = items.value.filter(i => i.productId !== productId)
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    const item = items.value.find(i => i.productId === productId)
    if (item) item.quantity = quantity
  }

  function clear() {
    items.value = []
  }

  return { items, cartTotal, gap, isOverTarget, itemCount, addItem, removeItem, updateQuantity, clear }
})
