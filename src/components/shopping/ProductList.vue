<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
      <div class="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="catalog.searchQuery"
          type="text"
          placeholder="Search products..."
          class="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-400"
          @keydown="onKeydown"
          @input="activeIdx = -1"
        />
      </div>
      <button
        class="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white text-xl font-light active:bg-primary-600 flex-shrink-0"
        @click="showAddModal = true"
      >
        +
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="catalog.sortedItems.length === 0" class="flex flex-col items-center justify-center h-full text-center px-8">
        <p class="text-gray-400 text-sm">
          {{ catalog.searchQuery ? 'No products match your search.' : 'No products yet. Tap + to add one.' }}
        </p>
      </div>
      <ProductCard
        v-for="(product, idx) in catalog.sortedItems"
        :key="product.id"
        :product="product"
        :is-active="idx === activeIdx"
        @mouseenter="activeIdx = idx"
        @mouseleave="activeIdx = -1"
        @add="addItem(product)"
      />
    </div>

    <AddProductModal v-model="showAddModal" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import { useCartStore } from '../../stores/cartStore.js'
import ProductCard from './ProductCard.vue'
import AddProductModal from './AddProductModal.vue'

const catalog = useCatalogStore()
const cart = useCartStore()
const showAddModal = ref(false)
const activeIdx = ref(-1)

function addItem(product) {
  cart.addItem(product)
}

function onKeydown(e) {
  const items = catalog.sortedItems
  if (!items.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, -1)
  } else if (e.key === 'Enter') {
    if (items.length === 1) {
      cart.addItem(items[0])
    } else if (activeIdx.value >= 0) {
      cart.addItem(items[activeIdx.value])
    }
  }
}
</script>
