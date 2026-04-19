<template>
  <div>
    <div
      class="flex items-center px-3 py-3 border-b border-gray-50 last:border-0 transition-opacity"
      :class="item.unavailable ? 'opacity-50' : item.checked ? 'opacity-60' : ''"
    >
      <!-- Checkbox -->
      <button
        class="w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center mr-3 transition-colors"
        :class="item.unavailable
          ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
          : item.checked
            ? 'border-primary bg-primary'
            : 'border-gray-300 active:border-primary'"
        @click="!item.unavailable && store.toggleChecked(item.productId)"
      >
        <svg v-if="item.checked && !item.unavailable" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      <!-- Name + price info -->
      <div class="flex-1 min-w-0" @click="expanded = !expanded">
        <p
          class="font-medium text-sm text-gray-900 truncate"
          :class="item.checked ? 'line-through text-gray-400' : item.unavailable ? 'line-through text-red-400' : ''"
        >{{ item.name }}</p>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="text-xs text-gray-400">€{{ item.sessionPrice.toFixed(2) }} × {{ item.quantity }}</span>
          <span v-if="hasDiscount" class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
            −€{{ discountAmount.toFixed(2) }} off
          </span>
          <span v-if="item.unavailable" class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
            Unavailable
          </span>
        </div>
      </div>

      <!-- Subtotal + expand toggle -->
      <div class="ml-2 text-right flex-shrink-0" @click="expanded = !expanded">
        <p class="text-sm font-bold text-gray-700">€{{ subtotal.toFixed(2) }}</p>
        <svg
          class="w-4 h-4 text-gray-300 ml-auto mt-0.5 transition-transform"
          :class="expanded ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <!-- Expanded controls -->
    <div v-if="expanded" class="px-4 pb-3 bg-gray-50 border-b border-gray-100">
      <!-- Quantity stepper -->
      <div class="flex items-center justify-between mt-2">
        <span class="text-xs text-gray-500 font-medium">Quantity</span>
        <div class="flex items-center gap-2">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 text-lg font-medium active:bg-gray-100"
            @click="store.updateQuantity(item.productId, item.quantity - 1)"
          >−</button>
          <span class="w-6 text-center font-semibold text-gray-800 text-sm">{{ item.quantity }}</span>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 text-lg font-medium active:bg-gray-100"
            @click="store.updateQuantity(item.productId, item.quantity + 1)"
          >+</button>
        </div>
      </div>

      <!-- Discount input -->
      <div class="flex items-center justify-between mt-2.5">
        <span class="text-xs text-gray-500 font-medium">Discount</span>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400">−€</span>
          <input
            v-model.number="discountInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="w-20 text-sm text-right border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-primary"
            @change="applyDiscountInput"
          />
          <button
            v-if="hasDiscount"
            class="text-xs text-gray-400 underline"
            @click="resetDiscount"
          >reset</button>
        </div>
      </div>

      <!-- Unavailable toggle + remove -->
      <div class="flex items-center justify-between mt-2.5">
        <button
          class="text-xs font-medium py-1 px-2.5 rounded-lg border transition-colors"
          :class="item.unavailable
            ? 'border-red-300 text-red-600 bg-red-50'
            : 'border-gray-200 text-gray-600 bg-white active:bg-gray-50'"
          @click="store.toggleUnavailable(item.productId)"
        >
          {{ item.unavailable ? 'Mark available' : 'Mark unavailable' }}
        </button>
        <button
          class="text-xs text-red-400 font-medium py-1 px-2 active:text-red-600"
          @click="store.removeItem(item.productId)"
        >Remove</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useActiveSessionStore } from '../../stores/activeSessionStore.js'

const props = defineProps({ item: { type: Object, required: true } })
const store = useActiveSessionStore()

const expanded = ref(false)
const discountInput = ref(
  props.item.catalogPrice > props.item.sessionPrice
    ? props.item.catalogPrice - props.item.sessionPrice
    : 0
)

const hasDiscount = computed(() => props.item.sessionPrice < props.item.catalogPrice)
const discountAmount = computed(() => props.item.catalogPrice - props.item.sessionPrice)
const subtotal = computed(() => props.item.sessionPrice * props.item.quantity)

function applyDiscountInput() {
  const val = parseFloat(discountInput.value) || 0
  store.applyDiscount(props.item.productId, val)
}

function resetDiscount() {
  discountInput.value = 0
  store.resetDiscount(props.item.productId)
}
</script>
