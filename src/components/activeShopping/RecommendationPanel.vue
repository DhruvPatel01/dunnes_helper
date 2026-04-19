<template>
  <div v-if="recommendations.length > 0" class="mx-3 mb-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
    <p class="text-xs font-semibold text-amber-700 mb-2">
      Suggestions to reach €{{ fmt(store.target) }} (€{{ fmt(store.gap) }} gap)
    </p>
    <div class="space-y-1.5">
      <button
        v-for="item in recommendations"
        :key="item.id"
        class="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-amber-100 active:bg-amber-50"
        @click="$emit('add', item)"
      >
        <span class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</span>
        <div class="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <span v-if="item.qty > 0" class="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">×{{ item.qty }}</span>
          <span class="text-sm font-bold text-primary">€{{ item.price.toFixed(2) }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'
import { useCatalogStore } from '../../stores/catalogStore.js'

defineEmits(['add'])

const store = useActiveSessionStore()
const catalog = useCatalogStore()

const recommendations = computed(() => {
  const gap = store.gap
  if (gap <= 0) return []

  // Take top 10 candidates by frequency then proximity — this pool is what recommendations come from
  const pool = catalog.items
    .map(p => {
      const qty = store.items.find(i => i.productId === p.id)?.quantity ?? 0
      return { ...p, proximity: Math.abs(p.price - gap), qty }
    })
    .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0) || a.proximity - b.proximity)
    .slice(0, 10)

  const notAdded = pool.filter(p => p.qty === 0).slice(0, 5)
  const added = pool.filter(p => p.qty > 0)

  return [...notAdded, ...added]
})

function fmt(val) {
  return val.toFixed(2)
}
</script>
