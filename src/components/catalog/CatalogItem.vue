<template>
  <div class="flex items-center px-4 py-3 bg-white border-b border-gray-50">
    <div class="flex-1 min-w-0">
      <input
        v-if="editing"
        ref="nameInput"
        v-model="editName"
        type="text"
        class="w-full font-medium text-gray-900 border-b border-primary outline-none bg-transparent"
        @keydown.enter="focusPrice"
        @keydown.escape="cancelEdit"
      />
      <p v-else class="font-medium text-gray-900 truncate">{{ product.name }}</p>
      <p class="text-xs text-gray-400 mt-0.5">
        {{ product.purchaseCount }} purchase{{ product.purchaseCount !== 1 ? 's' : '' }}
      </p>
    </div>
    <div class="flex items-center gap-2 ml-3">
      <div v-if="!editing" class="flex items-center gap-2">
        <span
          class="text-sm font-semibold text-gray-700 cursor-pointer"
          @click="startEdit"
        >€{{ product.price.toFixed(2) }}</span>
        <button
          class="text-primary text-sm font-medium px-2 py-1 rounded-lg active:bg-primary-50"
          @click="startEdit"
        >Edit</button>
      </div>
      <div v-else class="flex items-center gap-2">
        <input
          ref="priceInput"
          v-model="editPrice"
          type="number"
          min="0"
          step="0.01"
          class="w-20 px-2 py-1 rounded-lg border border-primary text-sm focus:outline-none"
          @keydown.enter="save"
          @keydown.escape="cancelEdit"
        />
        <button class="text-primary text-sm font-medium px-2 py-1 rounded-lg active:bg-primary-50" @click="save">Done</button>
      </div>
      <button
        class="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 active:bg-red-50"
        @click="$emit('delete', product.id)"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'

const props = defineProps({ product: { type: Object, required: true } })
defineEmits(['delete'])

const catalog = useCatalogStore()
const editing = ref(false)
const editName = ref('')
const editPrice = ref('')
const nameInput = ref(null)
const priceInput = ref(null)

function startEdit() {
  editName.value = props.product.name
  editPrice.value = props.product.price.toFixed(2)
  editing.value = true
  nextTick(() => nameInput.value?.select())
}

function focusPrice() {
  priceInput.value?.select()
}

async function save() {
  const name = editName.value.trim()
  const price = parseFloat(editPrice.value)
  const updates = {}
  if (name && name !== props.product.name) updates.name = name
  if (price > 0 && price !== props.product.price) updates.price = price
  if (Object.keys(updates).length) await catalog.updateProduct(props.product.id, updates)
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}
</script>
