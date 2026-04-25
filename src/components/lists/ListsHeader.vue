<template>
  <div class="flex-shrink-0 px-4 pt-4 pb-2">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">Lists</h1>
      <button
        class="flex items-center gap-1.5 text-sm font-medium text-primary active:opacity-70"
        @click="sheetOpen = true"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New List
      </button>
    </div>
  </div>

  <!-- New list bottom sheet -->
  <Teleport to="body">
    <div v-if="sheetOpen" class="sheet-overlay">
      <div class="sheet-scrim" @click="close" />
      <div class="sheet-panel p-6 pb-8">
        <h2 class="text-lg font-bold text-gray-900 mb-4">New List</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              ref="nameInput"
              v-model="name"
              type="text"
              placeholder="e.g. Weekly Shop"
              class="input w-full px-4 py-3 text-base"
              @keydown.enter="targetInput?.focus()"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Target (€)</label>
            <input
              ref="targetInput"
              v-model="target"
              type="number"
              min="0"
              step="1"
              placeholder="25 or 50"
              class="input w-full px-4 py-3 text-base"
              @input="syncDiscount"
              @keydown.enter="submit"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Voucher (€)</label>
            <input
              v-model="discount"
              type="number"
              min="0"
              step="0.5"
              class="input w-full px-4 py-3 text-base"
            />
            <p class="text-xs text-gray-400 mt-1">Auto-set: €5 for €25, €10 for €50</p>
          </div>
        </div>
        <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
        <div class="flex gap-3 mt-5">
          <button class="btn-secondary flex-1 py-3" @click="close">Cancel</button>
          <button class="btn-primary flex-1 py-3 font-semibold" @click="submit">Create</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useListsStore } from '../../stores/listsStore.js'

const store = useListsStore()

const sheetOpen = ref(false)
const name = ref('')
const target = ref('')
const discount = ref('')
const error = ref('')
const nameInput = ref(null)
const targetInput = ref(null)

watch(sheetOpen, (val) => {
  if (val) {
    name.value = ''
    target.value = ''
    discount.value = ''
    error.value = ''
    nextTick(() => nameInput.value?.focus())
  }
})

function syncDiscount() {
  const t = parseFloat(target.value)
  if (t === 25) discount.value = 5
  else if (t === 50) discount.value = 10
  else discount.value = 0
}

async function submit() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Name is required'; return }
  const t = parseFloat(target.value) || null
  const d = parseFloat(discount.value) || 0
  await store.createList(name.value.trim(), t, d)
  close()
}

function close() {
  sheetOpen.value = false
}
</script>
