<template>
  <div class="flex flex-col h-dvh bg-primary-50">
    <div class="flex-1 min-h-0">
      <ShoppingView v-if="session.currentView === 'shopping'" />
      <ActiveShoppingView v-else-if="session.currentView === 'active-list'" />
      <CatalogView v-else-if="session.currentView === 'catalog'" />
      <HistoryView v-else />
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useSessionStore } from './stores/sessionStore.js'
import { useCatalogStore } from './stores/catalogStore.js'
import { useActiveSessionStore } from './stores/activeSessionStore.js'
import BottomNav from './components/shared/BottomNav.vue'
import ShoppingView from './views/ShoppingView.vue'
import ActiveShoppingView from './views/ActiveShoppingView.vue'
import CatalogView from './views/CatalogView.vue'
import HistoryView from './views/HistoryView.vue'

const session = useSessionStore()
const catalog = useCatalogStore()
const activeSession = useActiveSessionStore()

function syncFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (['shopping', 'active-list', 'catalog', 'history'].includes(hash)) {
    session.setView(hash)
  }
}

onMounted(async () => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
  await catalog.loadFromDb()
  await activeSession.init()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})
</script>
