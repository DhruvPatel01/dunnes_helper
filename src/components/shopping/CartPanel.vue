<template>
  <div class="flex-shrink-0 border-t border-gray-200 bg-white shadow-lg">
    <button
      class="w-full flex items-center justify-between px-4 py-3"
      @click="expanded = !expanded"
    >
      <span class="font-semibold text-gray-800">
        <span v-if="cart.itemCount === 0" class="text-gray-400">Cart is empty</span>
        <span v-else>Cart · {{ cart.itemCount }} item{{ cart.itemCount !== 1 ? 's' : '' }}</span>
      </span>
      <div class="flex items-center gap-3">
        <span v-if="cart.itemCount > 0" class="font-bold text-primary">
          €{{ cart.cartTotal.toFixed(2) }}
        </span>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform duration-200"
          :class="expanded ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </div>
    </button>

    <div v-if="expanded" class="max-h-64 overflow-y-auto border-t border-gray-100">
      <CartItem v-for="item in cart.items" :key="item.productId" :item="item" />
    </div>

    <div v-if="expanded && cart.itemCount > 0" class="px-4 pb-4 pt-2">
      <button
        class="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-base active:bg-primary-600 transition-colors"
        @click="sendToList"
      >
        Start Shopping →
      </button>
    </div>
  </div>

</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '../../stores/cartStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'
import CartItem from './CartItem.vue'

const cart = useCartStore()
const session = useSessionStore()
const activeSession = useActiveSessionStore()

const expanded = ref(false)

function sendToList() {
  // Snapshot cart items before clearing
  const snapshot = cart.items.map(i => ({ ...i }))
  cart.clear()
  expanded.value = false
  // Navigate immediately so the user sees the transition
  session.setView('active-list')
  window.location.hash = 'active-list'
  // Persist in background
  activeSession.loadFromCart(snapshot, session.target)
}
</script>
