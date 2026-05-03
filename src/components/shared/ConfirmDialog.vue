<template>
  <Teleport to="body">
    <div v-if="modelValue" class="sheet-overlay">
      <div class="sheet-scrim" @click="$emit('update:modelValue', false)" />
      <div class="sheet-panel p-6 pb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ title }}</h3>
        <p class="text-gray-600 mb-6">{{ message }}</p>
        <div class="flex gap-3">
          <button
            class="btn-secondary flex-1 py-3"
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

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}>(), {
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'Confirm',
  danger: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>
