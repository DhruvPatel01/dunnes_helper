<template>
  <div class="flex flex-col h-dvh bg-primary-50">
    <div class="flex-1 min-h-0">
      <ListView v-if="currentView === 'lists'" />
      <CatalogView v-else-if="currentView === 'catalog'" />
      <HistoryView v-else />
    </div>
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, onMounted, onUnmounted } from 'vue'
import { useCatalogStore } from './stores/catalogStore.ts'
import { useListsStore } from './stores/listsStore.ts'
import { debugRecommendations } from './utils/recommendations.ts'
import { dbPromise } from './db/index.ts'
import BottomNav from './components/shared/BottomNav.vue'
import ListView from './views/ListView.vue'
import CatalogView from './views/CatalogView.vue'
import HistoryView from './views/HistoryView.vue'
import type { ViewType } from './types'

const _stored = JSON.parse(localStorage.getItem('dunnes-session') || '{}')
const currentView = ref<ViewType>(_stored.currentView ?? 'lists')
watch(currentView, val => localStorage.setItem('dunnes-session', JSON.stringify({ currentView: val })))
provide('currentView', currentView)

const catalog = useCatalogStore()
const lists = useListsStore()

function syncFromHash(): void {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'lists' || hash === 'catalog' || hash === 'history') {
    currentView.value = hash
  }
}

onMounted(async () => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
  await catalog.loadFromDb()
  await catalog.loadRecommendationScores()
  await lists.init()
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).debugRecs = async () => {
      const history = await (await dbPromise).getAll('history')
      debugRecommendations(catalog.items, history)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})
</script>
