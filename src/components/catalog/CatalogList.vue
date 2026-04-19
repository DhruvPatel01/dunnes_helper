<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
      <div class="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search catalog..."
          class="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-400"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="filtered.length === 0" class="flex items-center justify-center h-full">
        <p class="text-gray-400 text-sm text-center px-8">
          {{ searchQuery ? 'No products match your search.' : 'Your catalog is empty.' }}
        </p>
      </div>
      <CatalogItem
        v-for="product in filtered"
        :key="product.id"
        :product="product"
        @delete="confirmDelete(product)"
      />
    </div>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete product"
      :message="`Remove '${deleteTarget?.name}' from your catalog?`"
      confirm-label="Delete"
      :danger="true"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import CatalogItem from './CatalogItem.vue'
import ConfirmDialog from '../shared/ConfirmDialog.vue'

const catalog = useCatalogStore()
const searchQuery = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const items = q
    ? catalog.items.filter(i => i.name.toLowerCase().includes(q))
    : catalog.items
  return [...items].sort(
    (a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.name.localeCompare(b.name)
  )
})

function confirmDelete(product) {
  deleteTarget.value = product
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (deleteTarget.value) {
    await catalog.deleteProduct(deleteTarget.value.id)
    deleteTarget.value = null
  }
}
</script>
