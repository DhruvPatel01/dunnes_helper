<template>
  <nav class="flex-shrink-0 bg-white border-t border-gray-200 safe-bottom">
    <div class="flex">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
        :class="currentView === tab.id ? 'text-primary' : 'text-gray-400'"
        @click="navigate(tab.id)"
      >
        <component :is="tab.icon" class="w-6 h-6" />
        {{ tab.label }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { h, inject } from 'vue'
import type { Ref } from 'vue'
import type { ViewType } from '../../types'

const currentView = inject<Ref<ViewType>>('currentView')

const ListsIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('rect', { x: '3', y: '5', width: '18', height: '4', rx: '1' }),
  h('rect', { x: '3', y: '11', width: '18', height: '4', rx: '1' }),
  h('rect', { x: '3', y: '17', width: '18', height: '2', rx: '1' })
])

const ListIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('line', { x1: '8', y1: '6', x2: '21', y2: '6' }),
  h('line', { x1: '8', y1: '12', x2: '21', y2: '12' }),
  h('line', { x1: '8', y1: '18', x2: '21', y2: '18' }),
  h('line', { x1: '3', y1: '6', x2: '3.01', y2: '6' }),
  h('line', { x1: '3', y1: '12', x2: '3.01', y2: '12' }),
  h('line', { x1: '3', y1: '18', x2: '3.01', y2: '18' })
])

const ClockIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '12', r: '10' }),
  h('polyline', { points: '12 6 12 12 16 14' })
])

const tabs: Array<{ id: ViewType; label: string; icon: () => unknown }> = [
  { id: 'lists', label: 'Lists', icon: ListsIcon },
  { id: 'catalog', label: 'Catalog', icon: ListIcon },
  { id: 'history', label: 'History', icon: ClockIcon }
]

function navigate(view: ViewType) {
  currentView!.value = view
  window.location.hash = view
}
</script>
