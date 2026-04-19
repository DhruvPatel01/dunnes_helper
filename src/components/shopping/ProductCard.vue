<template>
  <div
    class="flex items-center px-4 py-3 border-b border-gray-50 transition-colors"
    :class="isActive ? 'bg-primary-50' : wasUnavailable ? 'bg-amber-50' : 'bg-white'"
    @mouseenter="$emit('mouseenter')" @mouseleave="$emit('mouseleave')"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <p class="font-medium text-gray-900 truncate">{{ product.name }}</p>
        <span v-if="wasUnavailable" class="flex-shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Needed</span>
      </div>
      <div class="flex items-center gap-1 mt-0.5">
        <span
          v-if="!editing"
          class="text-sm text-gray-500 cursor-pointer underline-offset-2 active:underline"
          @click="startEdit"
        >€{{ product.price.toFixed(2) }}</span>
        <input
          v-else
          ref="priceInput"
          v-model="editPrice"
          type="number"
          min="0"
          step="0.01"
          class="w-20 text-sm border border-primary rounded px-1.5 py-0.5 focus:outline-none"
          @keydown.enter="savePrice"
          @keydown.escape="cancelEdit"
          @blur="savePrice"
          @click.stop
        />
        <span v-if="cartQty > 0" class="text-xs font-bold text-primary bg-primary-50 px-1.5 py-0.5 rounded-full">×{{ cartQty }} in cart</span>
      </div>
    </div>
    <button
      class="ml-3 w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-white text-2xl font-light active:bg-primary-600 transition-colors"
      @click="$emit('add')"
    >
      +
    </button>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useCartStore } from '../../stores/cartStore.js'
import { useCatalogStore } from '../../stores/catalogStore.js'

const props = defineProps({
  product: { type: Object, required: true },
  isActive: { type: Boolean, default: false }
})
defineEmits(['mouseenter', 'mouseleave', 'add'])

const cart = useCartStore()
const catalog = useCatalogStore()

const wasUnavailable = computed(() => catalog.lastUnavailableIds.has(props.product.id))
const cartQty = computed(() => cart.items.find(i => i.productId === props.product.id)?.quantity ?? 0)

const editing = ref(false)
const editPrice = ref('')
const priceInput = ref(null)

function startEdit() {
  editPrice.value = props.product.price.toFixed(2)
  editing.value = true
  nextTick(() => priceInput.value?.select())
}

async function savePrice() {
  const val = parseFloat(editPrice.value)
  if (val > 0 && val !== props.product.price) {
    await catalog.updateProduct(props.product.id, { price: val })
  }
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}
</script>
