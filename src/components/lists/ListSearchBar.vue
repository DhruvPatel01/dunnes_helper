<template>
  <div class="px-3 pt-3 pb-2 bg-white sticky top-0 z-10 border-b border-gray-100">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Search or add items..."
        class="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        @keydown="onKeydown"
        @input="activeIdx = -1; createOpen = false"
        @focus="focused = true"
        @blur="focused = false"
      />
      <button
        v-if="query"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"
        @click="query = ''; activeIdx = -1; createOpen = false"
      >✕</button>
    </div>

    <!-- Unified dropdown: full catalog at rest, narrows as user types -->
    <div v-if="focused && displayItems.length > 0 && !createOpen" class="dropdown">
      <div
        v-for="(product, idx) in displayItems"
        :key="product.id"
        class="dropdown-row transition-colors"
        :class="idx === activeIdx ? 'bg-primary-50' : ''"
        @mouseenter="activeIdx = idx"
        @mouseleave="activeIdx = -1"
        @mousedown.prevent="addItem(product, true)"
      >
        <span class="item-name">{{ product.name }}</span>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="item-price mr-1">€{{ product.price.toFixed(2) }}</span>
          <button
            v-if="itemQty(product.id) > 0"
            class="qty-btn"
            @mousedown.stop.prevent="decItem(product)"
          >-</button>
          <span
            v-if="itemQty(product.id) > 0"
            class="w-5 text-center text-sm font-medium text-gray-700"
          >{{ itemQty(product.id) }}</span>
          <button
            class="qty-btn"
            @mousedown.stop.prevent="addItem(product)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- No results → create inline -->
    <div v-if="query && displayItems.length === 0 && !createOpen" class="mt-2">
      <p class="text-xs text-gray-400 text-center mb-2">No matching items in catalog</p>
      <button
        class="w-full py-2 text-xs font-medium text-primary border border-primary/30 rounded-xl bg-primary/5 active:bg-primary/10"
        @click="openCreate"
      >+ Create "{{ query }}" in catalog</button>
    </div>

    <!-- Inline create form -->
    <div v-if="createOpen" class="mt-2 space-y-2">
      <div class="flex items-center gap-2">
        <input v-model="newName" type="text" placeholder="Name" class="input flex-1" />
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
          <input
            ref="priceInput"
            v-model="newPrice"
            type="number" min="0" step="0.01" placeholder="0.00"
            class="input w-24 pl-6 pr-2"
            @keydown.enter="submitCreate"
          />
        </div>
      </div>
      <input
        v-model="newCategory"
        list="category-options"
        type="text"
        placeholder="Category"
        class="input w-full"
        @keydown.enter="submitCreate"
      />
      <datalist id="category-options">
        <option v-for="cat in categories" :key="cat" :value="cat" />
      </datalist>
      <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
      <div class="flex gap-2">
        <button class="action-btn border border-gray-200 text-gray-500" @click="createOpen = false">Cancel</button>
        <button class="action-btn bg-primary text-white font-medium active:bg-primary-600" @click="submitCreate">Add to list</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.ts'
import { useListsStore } from '../../stores/listsStore.ts'
import type { CatalogProduct } from '../../types'

const props = defineProps<{ listId: string }>()

const catalog = useCatalogStore()
const listsStore = useListsStore()

const query = ref('')
const activeIdx = ref(-1)
const createOpen = ref(false)
const focused = ref(false)
const newName = ref('')
const newCategory = ref('')
const newPrice = ref('')
const createError = ref('')
const priceInput = ref<HTMLInputElement | null>(null)

const categories = computed(() =>
  [...new Set(catalog.items.map(i => i.category).filter(Boolean))].sort()
)

function scoreItem(product: CatalogProduct): number {
  return catalog.recommendationScores.get(product.id!) ?? -Infinity
}

const displayItems = computed(() => {
  const q = query.value.toLowerCase().trim()
  const items = q
    ? catalog.items.filter(p => p.name.toLowerCase().includes(q))
    : [...catalog.items]
  return items
    .sort((a, b) =>
      scoreItem(b) - scoreItem(a) ||
      a.name.localeCompare(b.name)
    )
})

function itemQty(productId: number | undefined): number {
  if (productId === undefined) return 0
  const list = listsStore.lists.find(l => l.id === props.listId)
  return list?.items.find(i => i.productId === productId)?.quantity ?? 0
}

function decItem(product: CatalogProduct): void {
  const qty = itemQty(product.id!)
  if (qty > 0) listsStore.updateItemQuantity(props.listId, product.id!, qty - 1)
}

watch(displayItems, () => { activeIdx.value = -1 })

function addItem(product: CatalogProduct, clearQuery = false): void {
  listsStore.addItemToList(props.listId, product)
  if (clearQuery) query.value = ''
  activeIdx.value = -1
}

function openCreate() {
  newName.value = query.value
  newCategory.value = ''
  newPrice.value = ''
  createError.value = ''
  createOpen.value = true
  nextTick(() => priceInput.value?.focus())
}

async function submitCreate() {
  createError.value = ''
  if (!newName.value.trim()) { createError.value = 'Name is required'; return }
  if (!newCategory.value.trim()) { createError.value = 'Category is required'; return }
  const p = parseFloat(newPrice.value)
  if (!p || p <= 0) { createError.value = 'Enter a valid price'; return }
  const product = await catalog.addProduct(newName.value.trim(), newCategory.value.trim(), p)
  listsStore.addItemToList(props.listId, product)
  query.value = ''
  createOpen.value = false
}

function onKeydown(e: KeyboardEvent): void {
  const items = displayItems.value
  if (!items.length || createOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, -1)
  } else if (e.key === 'Enter') {
    if (items.length === 1) addItem(items[0], true)
    else if (activeIdx.value >= 0) addItem(items[activeIdx.value], true)
  }
}
</script>

<style scoped>
.dropdown      { @apply mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-[50vh] overflow-y-auto; }
.dropdown-row  { @apply w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-50 last:border-0; }
.item-name     { @apply text-sm font-medium text-gray-800 truncate; }
.item-price    { @apply text-sm font-bold text-primary ml-2 flex-shrink-0; }
.action-btn    { @apply flex-1 py-2 text-sm rounded-xl; }
.qty-btn       { @apply w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 text-sm active:bg-gray-100; }
</style>
