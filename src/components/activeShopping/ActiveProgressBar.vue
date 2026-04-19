<template>
  <div
    class="px-4 pt-3 pb-3 text-center transition-colors"
    :class="bgClass"
  >
    <div v-if="store.gap === 0 && store.items.length > 0 && !store.isOverTarget">
      <span class="text-4xl font-black text-primary">Ready!</span>
      <p class="text-sm text-gray-500 mt-0.5">You've hit your target</p>
    </div>
    <div v-else-if="store.isOverTarget">
      <span class="text-4xl font-black" :class="overClass">
        +€{{ fmt(store.availableTotal - store.target) }}
      </span>
      <p class="text-sm mt-0.5" :class="overClass">over target</p>
    </div>
    <div v-else>
      <span class="text-4xl font-black text-primary">€{{ fmt(store.gap) }}</span>
      <p class="text-sm text-gray-500 mt-0.5">to go</p>
    </div>

    <!-- Saving info -->
    <p v-if="store.items.length > 0" class="text-xs mt-0.5" :class="store.gap === 0 || store.isOverTarget ? 'text-primary font-semibold' : 'text-gray-400'">
      {{ savingText }}
    </p>

    <div class="mt-2 h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="barClass"
        :style="{ width: `${Math.min(100, store.progressPct)}%` }"
      />
    </div>

    <div class="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
      <span>€{{ fmt(store.availableTotal) }} in list</span>
      <span>€{{ fmt(store.target) }} target</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'

const store = useActiveSessionStore()
const session = useSessionStore()

const isSmallOver = computed(() =>
  store.isOverTarget && (store.availableTotal - store.target) <= 2
)

const bgClass = computed(() => {
  if (!store.isOverTarget) return store.gap === 0 && store.items.length > 0 ? 'bg-green-50' : 'bg-white'
  return isSmallOver.value ? 'bg-orange-50' : 'bg-red-50'
})

const overClass = computed(() =>
  isSmallOver.value ? 'text-orange-500' : 'text-red-600'
)

const barClass = computed(() => {
  if (store.isOverTarget) return isSmallOver.value ? 'bg-orange-400' : 'bg-red-500'
  return 'bg-primary'
})

const savingText = computed(() => {
  const v = session.voucher
  const total = store.availableTotal
  if (total <= 0) return ''
  const pct = ((v / total) * 100).toFixed(1)
  return `${pct}% saving (€${fmt(v)} voucher off €${fmt(total)})`
})

function fmt(val) {
  return val.toFixed(2)
}
</script>
