<template>
  <div class="px-3 pt-3 pb-2 bg-white border-b border-gray-100 sticky top-0 z-10">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Add items to list..."
        class="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        @keydown="onKeydown"
        @input="activeIdx = -1"
      />
      <button
        v-if="query"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"
        @click="query = ''; activeIdx = -1"
      >✕</button>
    </div>

    <!-- Search results dropdown -->
    <div v-if="query && results.length > 0" class="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-52 overflow-y-auto">
      <button
        v-for="(product, idx) in results"
        :key="product.id"
        class="w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors"
        :class="idx === activeIdx ? 'bg-primary-50' : 'active:bg-gray-50'"
        @mouseenter="activeIdx = idx"
        @mouseleave="activeIdx = -1"
        @click="addItem(product)"
      >
        <span class="text-sm font-medium text-gray-800 truncate">{{ product.name }}</span>
        <span class="text-sm font-bold text-primary ml-2 flex-shrink-0">€{{ product.price.toFixed(2) }}</span>
      </button>
    </div>

    <p v-if="query && results.length === 0" class="mt-2 text-xs text-gray-400 text-center pb-1">
      No matching items in catalog
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'

const catalog = useCatalogStore()
const store = useActiveSessionStore()
const query = ref('')
const activeIdx = ref(-1)

const results = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return []
  return catalog.items
    .filter(p => p.name.toLowerCase().includes(q))
    .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.name.localeCompare(b.name))
    .slice(0, 8)
})

watch(results, () => { activeIdx.value = -1 })

function addItem(product) {
  store.addItem(product)
  query.value = ''
  activeIdx.value = -1
}

function onKeydown(e) {
  const items = results.value
  if (!items.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, -1)
  } else if (e.key === 'Enter') {
    if (items.length === 1) {
      addItem(items[0])
    } else if (activeIdx.value >= 0) {
      addItem(items[activeIdx.value])
    }
  }
}
</script>
