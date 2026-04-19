<template>
  <div class="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
    <div class="flex-1 min-w-0">
      <p class="font-medium text-gray-900 text-sm truncate">{{ item.name }}</p>
      <p class="text-xs text-gray-400 mt-0.5">€{{ item.price.toFixed(2) }} each</p>
    </div>
    <div class="flex items-center gap-2 ml-3">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 text-lg font-medium active:bg-gray-200"
        @click="decrement"
      >−</button>
      <span class="w-6 text-center font-semibold text-gray-800 text-sm">{{ item.quantity }}</span>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 text-lg font-medium active:bg-gray-200"
        @click="cart.updateQuantity(item.productId, item.quantity + 1)"
      >+</button>
      <span class="w-14 text-right text-sm font-semibold text-gray-700">
        €{{ (item.price * item.quantity).toFixed(2) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../../stores/cartStore.js'

const props = defineProps({ item: { type: Object, required: true } })
const cart = useCartStore()

function decrement() {
  cart.updateQuantity(props.item.productId, props.item.quantity - 1)
}
</script>
