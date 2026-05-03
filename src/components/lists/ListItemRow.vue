<template>
  <div
    class="px-4 py-3 border-b border-gray-50 last:border-0"
    :class="item.unavailable ? 'opacity-40' : ''"
  >
    <div class="flex items-start gap-2">
      <!-- Checkbox -->
      <button
        class="mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
        :class="item.checked ? 'bg-primary border-primary' : 'border-gray-300'"
        :disabled="item.unavailable"
        @click="store.toggleChecked(listId, item.productId)"
      >
        <svg v-if="item.checked" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      <!-- Name + price badge -->
      <div class="flex-1 min-w-0">
        <span
          class="text-sm font-medium text-gray-800 leading-tight"
          :class="item.checked ? 'line-through text-gray-400' : ''"
        >{{ item.name }}</span>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-xs text-gray-500">
            €{{ item.sessionPrice.toFixed(2) }}
            <span v-if="item.quantity > 1"> × {{ item.quantity }}</span>
            = €{{ (item.sessionPrice * item.quantity).toFixed(2) }}
          </span>
          <span
            v-if="item.sessionPrice < item.catalogPrice"
            class="text-xs text-green-600 font-medium"
          >−€{{ (item.catalogPrice - item.sessionPrice).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <!-- Quantity controls -->
        <button
          class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 text-sm active:bg-gray-100"
          @click="store.updateItemQuantity(listId, item.productId, item.quantity - 1)"
        >−</button>
        <span class="w-5 text-center text-sm font-medium text-gray-700">{{ item.quantity }}</span>
        <button
          class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 text-sm active:bg-gray-100"
          @click="store.updateItemQuantity(listId, item.productId, item.quantity + 1)"
        >+</button>
      </div>
    </div>

    <!-- Secondary actions row -->
    <div class="flex items-center gap-3 mt-2 ml-7">
      <!-- Update price toggle -->
      <button
        class="text-xs text-gray-400 underline"
        @click="priceOpen = !priceOpen"
      >{{ priceOpen ? 'cancel' : 'update price' }}</button>

      <!-- Unavailable toggle -->
      <button
        class="text-xs"
        :class="item.unavailable ? 'text-orange-500' : 'text-gray-400'"
        @click="store.toggleUnavailable(listId, item.productId)"
      >{{ item.unavailable ? 'unavailable' : 'mark unavailable' }}</button>

      <!-- Move -->
      <button class="text-xs text-gray-400 ml-auto" @click="moveOpen = true">move →</button>

      <!-- Remove -->
      <button class="text-xs text-red-400" @click="store.removeItemFromList(listId, item.productId)">✕</button>
    </div>

    <!-- Inline price input -->
    <div v-if="priceOpen" class="ml-7 mt-2 flex items-center gap-2 flex-wrap">
      <span class="text-xs text-gray-500">New price €</span>
      <input
        v-model.number="newPrice"
        type="number"
        min="0"
        step="0.01"
        :placeholder="item.sessionPrice.toFixed(2)"
        class="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary"
      />
      <button
        class="text-xs bg-primary text-white px-2 py-1 rounded-lg"
        @click="applyNewPrice"
      >Apply</button>
      <button
        v-if="item.sessionPrice < item.catalogPrice"
        class="text-xs text-gray-400 underline"
        @click="store.resetItemPrice(listId, item.productId); priceOpen = false"
      >Reset</button>
      <label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
        <input type="checkbox" v-model="permanent" class="accent-primary" />
        Make permanent
      </label>
    </div>

    <MoveItemPopup
      v-model="moveOpen"
      :product-id="item.productId"
      :from-list-id="listId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useListsStore } from '../../stores/listsStore.ts'
import { useCatalogStore } from '../../stores/catalogStore.ts'
import MoveItemPopup from './MoveItemPopup.vue'
import type { ListItem } from '../../types'

const props = defineProps<{ item: ListItem; listId: string }>()
const store = useListsStore()
const catalog = useCatalogStore()

const priceOpen = ref(false)
const moveOpen = ref(false)
const newPrice = ref('')
const permanent = ref(false)

function applyNewPrice(): void {
  const amt = parseFloat(newPrice.value)
  if (!isNaN(amt) && amt >= 0) {
    store.updateItemPrice(props.listId, props.item.productId, amt, permanent.value)
    if (permanent.value) catalog.updateProduct(props.item.productId, { price: amt })
  }
  priceOpen.value = false
  permanent.value = false
  newPrice.value = ''
}
</script>
