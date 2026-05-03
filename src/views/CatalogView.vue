<template>
  <div class="view-root">
    <div class="page-header">
      <h1 class="text-lg font-bold text-gray-900">Catalog</h1>
      <p class="text-xs text-gray-400 mt-0.5">{{ catalog.items.length }} product{{ catalog.items.length !== 1 ? 's' : '' }}</p>
    </div>
    <div class="flex-1 min-h-0">
      <CatalogList />
    </div>
    <ImportExportPanel />
  </div>
</template>

<script setup lang="ts">
import { useCatalogStore } from '../stores/catalogStore.ts'
import CatalogList from '../components/catalog/CatalogList.vue'
import ImportExportPanel from '../components/catalog/ImportExportPanel.vue'

const catalog = useCatalogStore()
</script>
