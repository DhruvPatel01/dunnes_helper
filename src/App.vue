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

<script setup>
import { ref, watch, provide, onMounted, onUnmounted } from 'vue'
import { useCatalogStore } from './stores/catalogStore.js'
import { useListsStore } from './stores/listsStore.js'
import BottomNav from './components/shared/BottomNav.vue'
import ListView from './views/ListView.vue'
import CatalogView from './views/CatalogView.vue'
import HistoryView from './views/HistoryView.vue'

const _stored = JSON.parse(localStorage.getItem('dunnes-session') || '{}')
const currentView = ref(_stored.currentView ?? 'lists')
watch(currentView, val => localStorage.setItem('dunnes-session', JSON.stringify({ currentView: val })))
provide('currentView', currentView)

const catalog = useCatalogStore()
const lists = useListsStore()

function syncFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (['lists', 'catalog', 'history'].includes(hash)) {
    currentView.value = hash
  }
}

onMounted(async () => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
  await catalog.loadFromDb()
  await lists.init()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})
</script>
