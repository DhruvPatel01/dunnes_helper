<template>
  <div class="px-4 pt-3 pb-2 bg-white border-b border-gray-100 space-y-2">
    <!-- Target row -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-500 mr-1">Target:</span>
      <button
        v-for="preset in presets"
        :key="preset"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="session.target === preset && !customMode
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700'"
        @click="selectPreset(preset)"
      >
        €{{ preset }}
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="customMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'"
        @click="toggleCustom"
      >
        Custom
      </button>
      <input
        v-if="customMode"
        ref="customInput"
        v-model="customValue"
        type="number"
        min="1"
        step="0.01"
        placeholder="€0.00"
        class="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
        @keydown.enter="applyCustom"
        @blur="applyCustom"
      />
    </div>

    <!-- Voucher row -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-500 mr-1">Voucher:</span>
      <button
        v-for="v in voucherPresets"
        :key="v"
        class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        :class="session.voucher === v && !voucherCustomMode
          ? 'bg-amber-500 text-white'
          : 'bg-gray-100 text-gray-700'"
        @click="selectVoucher(v)"
      >
        €{{ v }}
      </button>
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        :class="voucherCustomMode ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'"
        @click="toggleVoucherCustom"
      >
        Custom
      </button>
      <input
        v-if="voucherCustomMode"
        ref="voucherInput"
        v-model="voucherCustomValue"
        type="number"
        min="0"
        step="0.01"
        placeholder="€0.00"
        class="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-amber-500"
        @keydown.enter="applyVoucherCustom"
        @blur="applyVoucherCustom"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useCartStore } from '../../stores/cartStore.js'

const session = useSessionStore()
const cart = useCartStore()

const presets = [25, 50]
const customMode = ref(!presets.includes(session.target))
const customValue = ref(customMode.value ? session.target : '')
const customInput = ref(null)

function selectPreset(val) {
  customMode.value = false
  session.setTarget(val)
  cart.clear()
}

function toggleCustom() {
  customMode.value = true
  customValue.value = ''
  nextTick(() => customInput.value?.focus())
}

function applyCustom() {
  const val = parseFloat(customValue.value)
  if (val > 0) {
    session.setTarget(val)
    cart.clear()
  }
}

const voucherPresets = [5, 10, 15]
const voucherCustomMode = ref(!voucherPresets.includes(session.voucher))
const voucherCustomValue = ref(voucherCustomMode.value ? session.voucher : '')
const voucherInput = ref(null)

function selectVoucher(val) {
  voucherCustomMode.value = false
  session.setVoucher(val)
}

function toggleVoucherCustom() {
  voucherCustomMode.value = true
  voucherCustomValue.value = ''
  nextTick(() => voucherInput.value?.focus())
}

function applyVoucherCustom() {
  const val = parseFloat(voucherCustomValue.value)
  if (val >= 0) session.setVoucher(val)
}
</script>
