<template>
  <div
    class="px-4 pt-4 pb-3 text-center transition-colors"
    :class="bgClass"
  >
    <div v-if="cart.gap === 0 && cart.itemCount > 0 && !cart.isOverTarget">
      <span class="text-5xl font-black text-primary">Ready!</span>
      <p class="text-sm text-gray-500 mt-1">You've hit your target</p>
    </div>
    <div v-else-if="cart.isOverTarget">
      <span class="text-5xl font-black" :class="overClass">
        +€{{ fmt(cart.cartTotal - session.target) }}
      </span>
      <p class="text-sm mt-1" :class="overClass">over target</p>
    </div>
    <div v-else>
      <span class="text-5xl font-black text-primary">
        €{{ fmt(cart.gap) }}
      </span>
      <p class="text-sm text-gray-500 mt-1">to go</p>
    </div>

    <!-- Saving info -->
    <p v-if="cart.itemCount > 0" class="text-xs mt-1" :class="cart.gap === 0 || cart.isOverTarget ? 'text-primary font-semibold' : 'text-gray-400'">
      {{ savingText }}
    </p>

    <div class="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="barClass"
        :style="{ width: `${Math.min(100, progressPct)}%` }"
      />
    </div>

    <div class="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
      <span>€{{ fmt(cart.cartTotal) }} in cart</span>
      <span>€{{ fmt(session.target) }} target</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useCartStore } from '../../stores/cartStore.js'

const session = useSessionStore()
const cart = useCartStore()

// Over by more than €2 = red, ≤ €2 = orange
const isSmallOver = computed(() =>
  cart.isOverTarget && (cart.cartTotal - session.target) <= 2
)

const bgClass = computed(() => {
  if (!cart.isOverTarget) return cart.gap === 0 && cart.itemCount > 0 ? 'bg-green-50' : 'bg-white'
  return isSmallOver.value ? 'bg-orange-50' : 'bg-red-50'
})

const overClass = computed(() =>
  isSmallOver.value ? 'text-orange-500' : 'text-red-600'
)

const barClass = computed(() => {
  if (cart.isOverTarget) return isSmallOver.value ? 'bg-orange-400' : 'bg-red-500'
  return 'bg-primary'
})

const progressPct = computed(() =>
  session.target > 0 ? (cart.cartTotal / session.target) * 100 : 0
)

const savingText = computed(() => {
  const v = session.voucher
  const total = cart.cartTotal
  if (total <= 0) return ''
  const pct = ((v / total) * 100).toFixed(1)
  return `${pct}% saving (€${fmt(v)} voucher off €${fmt(total)})`
})

function fmt(val) {
  return val.toFixed(2)
}
</script>
