<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-black/50" @click="$emit('update:modelValue', false)" />
      <div class="relative w-full max-w-sm bg-white rounded-t-2xl p-6 pb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ title }}</h3>
        <p class="text-gray-600 mb-6">{{ message }}</p>
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </button>
          <button
            class="flex-1 py-3 rounded-xl font-medium"
            :class="danger ? 'bg-red-600 text-white' : 'bg-primary text-white'"
            @click="confirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: 'Are you sure?' },
  confirmLabel: { type: String, default: 'Confirm' },
  danger: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>
