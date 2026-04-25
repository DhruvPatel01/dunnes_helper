<template>
  <Teleport to="body">
    <div v-if="modelValue" class="sheet-overlay">
      <div class="sheet-scrim" @click="$emit('update:modelValue', false)" />
      <div class="sheet-panel p-5 pb-8">
        <h3 class="text-base font-semibold text-gray-900 mb-3">Move to list</h3>
        <div class="space-y-2">
          <button
            v-for="list in otherLists"
            :key="list.id"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-left active:bg-gray-50"
            @click="move(list.id)"
          >
            <span class="text-sm font-medium text-gray-800">{{ list.name }}</span>
            <span class="text-xs text-gray-400">{{ list.items.length }} items</span>
          </button>
        </div>
        <button
          class="btn-secondary mt-4 w-full py-3 text-gray-500 text-sm"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useListsStore } from '../../stores/listsStore.js'

const props = defineProps({
  modelValue: Boolean,
  productId: Number,
  fromListId: String
})
const emit = defineEmits(['update:modelValue'])

const store = useListsStore()

const otherLists = computed(() => store.lists.filter(l => l.id !== props.fromListId))

function move(toListId) {
  store.moveItem(props.productId, props.fromListId, toListId)
  emit('update:modelValue', false)
}
</script>
