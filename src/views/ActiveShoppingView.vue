<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0">
      <ActiveListHeader />
      <ActiveProgressBar />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <AddItemSearch />

      <!-- Empty state -->
      <div v-if="store.items.length === 0" class="flex flex-col items-center justify-center h-48 text-center px-8">
        <svg class="w-12 h-12 text-gray-200 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="9 11 12 14 22 4" />
          <line x1="3" y1="9" x2="21" y2="9" />
        </svg>
        <p class="text-gray-400 text-sm">Your list is empty</p>
        <p class="text-gray-300 text-xs mt-1">Search above to add items</p>
      </div>

      <!-- Item list -->
      <div v-else class="pb-2">
        <template v-for="item in store.items" :key="item.productId">
          <ActiveItemRow :item="item" />
          <RecommendationPanel
            v-if="item.unavailable"
            @add="store.addItem($event)"
          />
        </template>
      </div>
    </div>

    <ActiveActionBar />
  </div>
</template>

<script setup>
import { useActiveSessionStore } from '../stores/activeSessionStore.js'
import ActiveListHeader from '../components/activeShopping/ActiveListHeader.vue'
import ActiveProgressBar from '../components/activeShopping/ActiveProgressBar.vue'
import AddItemSearch from '../components/activeShopping/AddItemSearch.vue'
import ActiveItemRow from '../components/activeShopping/ActiveItemRow.vue'
import RecommendationPanel from '../components/activeShopping/RecommendationPanel.vue'
import ActiveActionBar from '../components/activeShopping/ActiveActionBar.vue'

const store = useActiveSessionStore()
</script>
