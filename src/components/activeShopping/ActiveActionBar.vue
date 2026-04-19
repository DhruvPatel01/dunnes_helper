<template>
  <div class="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm text-gray-500">
        {{ store.items.filter(i => !i.unavailable).length }} item{{ store.items.filter(i => !i.unavailable).length !== 1 ? 's' : '' }}
        <span v-if="store.unavailableItems.length > 0" class="text-red-400">
          · {{ store.unavailableItems.length }} unavailable
        </span>
      </span>
      <span class="text-base font-bold text-primary">€{{ store.availableTotal.toFixed(2) }}</span>
    </div>
    <button
      class="w-full py-3.5 rounded-xl font-bold text-base transition-colors"
      :class="canComplete
        ? 'bg-primary text-white active:bg-primary-600'
        : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
      :disabled="!canComplete"
      @click="canComplete && (showConfirm = true)"
    >
      Complete Shopping
    </button>
  </div>

  <ConfirmDialog
    v-model="showConfirm"
    title="Complete Shopping"
    :message="`Save this trip to history? Total: €${store.availableTotal.toFixed(2)}`"
    confirm-label="Complete"
    @confirm="store.completeShop()"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'
import ConfirmDialog from '../shared/ConfirmDialog.vue'

const store = useActiveSessionStore()
const showConfirm = ref(false)

const canComplete = computed(() => store.items.some(i => !i.unavailable))
</script>
