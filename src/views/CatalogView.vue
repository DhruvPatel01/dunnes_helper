<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-100">
      <h1 class="text-lg font-bold text-gray-900">Catalog</h1>
      <p class="text-xs text-gray-400 mt-0.5">{{ catalog.items.length }} product{{ catalog.items.length !== 1 ? 's' : '' }}</p>
    </div>
    <div class="flex-1 min-h-0">
      <CatalogList />
    </div>
    <ImportExportPanel />
  </div>
</template>

<script setup>
import { useCatalogStore } from '../stores/catalogStore.js'
import CatalogList from '../components/catalog/CatalogList.vue'
import ImportExportPanel from '../components/catalog/ImportExportPanel.vue'

const catalog = useCatalogStore()
</script>
