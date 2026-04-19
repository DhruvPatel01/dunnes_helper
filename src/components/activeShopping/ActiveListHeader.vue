<template>
  <div class="px-4 pt-4 pb-3 flex items-center justify-between bg-white border-b border-gray-100">
    <div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Target</span>
        <button
          v-if="!editingTarget"
          class="text-lg font-bold text-primary"
          @click="startEdit"
        >€{{ store.target.toFixed(2) }}</button>
        <div v-else class="flex items-center gap-1">
          <span class="text-lg font-bold text-gray-400">€</span>
          <input
            ref="targetInput"
            v-model.number="editValue"
            type="number"
            min="0"
            step="0.01"
            class="w-20 text-lg font-bold text-primary border-b-2 border-primary outline-none bg-transparent"
            @blur="saveTarget"
            @keydown.enter="saveTarget"
          />
        </div>
      </div>
      <div class="flex items-center gap-1.5 mt-1">
        <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          type="date"
          :value="store.shoppingDate"
          class="text-xs text-gray-500 bg-transparent outline-none cursor-pointer"
          @change="store.updateShoppingDate($event.target.value)"
        />
      </div>
      <p v-if="store.checkedCount > 0" class="text-xs text-gray-400 mt-0.5">
        {{ store.checkedCount }} / {{ store.items.length }} picked up
      </p>
    </div>
    <button
      v-if="store.items.length > 0"
      class="text-sm text-red-500 font-medium py-1 px-3 rounded-lg active:bg-red-50"
      @click="showClear = true"
    >Clear</button>
  </div>

  <ConfirmDialog
    v-model="showClear"
    title="Clear Shopping List"
    message="Remove all items from your active list?"
    confirm-label="Clear"
    :danger="true"
    @confirm="store.clearList()"
  />
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'
import ConfirmDialog from '../shared/ConfirmDialog.vue'

const store = useActiveSessionStore()
const showClear = ref(false)
const editingTarget = ref(false)
const editValue = ref(0)
const targetInput = ref(null)

function startEdit() {
  editValue.value = store.target
  editingTarget.value = true
  nextTick(() => targetInput.value?.focus())
}

function saveTarget() {
  const val = parseFloat(editValue.value)
  if (!isNaN(val) && val >= 0) store.updateTarget(val)
  editingTarget.value = false
}
</script>
