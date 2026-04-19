<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-black/50" @click="close" />
      <div class="relative w-full max-w-sm bg-white rounded-t-2xl p-6 pb-8">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Add Product</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              ref="nameInput"
              v-model="name"
              type="text"
              placeholder="e.g. Avonmore Milk 2L"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary text-base"
              @keydown.enter="priceInput?.focus()"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
            <input
              ref="priceInput"
              v-model="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary text-base"
              @keydown.enter="submit"
            />
          </div>
        </div>
        <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
        <div class="flex gap-3 mt-5">
          <button
            class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            @click="close"
          >
            Cancel
          </button>
          <button
            class="flex-1 py-3 rounded-xl bg-primary text-white font-semibold active:bg-primary-600"
            @click="submit"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import { useCartStore } from '../../stores/cartStore.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const catalog = useCatalogStore()
const cart = useCartStore()

const name = ref('')
const price = ref('')
const error = ref('')
const nameInput = ref(null)
const priceInput = ref(null)

watch(() => props.modelValue, (val) => {
  if (val) {
    name.value = ''
    price.value = ''
    error.value = ''
    nextTick(() => nameInput.value?.focus())
  }
})

async function submit() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Name is required'; return }
  const p = parseFloat(price.value)
  if (!p || p <= 0) { error.value = 'Enter a valid price'; return }
  const product = await catalog.addProduct(name.value, p)
  cart.addItem(product)
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
