<template>
  <div class="relative min-w-0">
    <input
      ref="input"
      :value="modelValue"
      :class="inputClass"
      type="text"
      role="combobox"
      aria-label="Category"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="open && activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined"
      autocomplete="off"
      placeholder="Category"
      @input="onInput"
      @focus="showAll = true; open = true"
      @blur="close"
      @keydown="onKeydown"
    />
    <div
      v-if="open"
      :style="position"
      class="fixed z-30 rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      <ul :id="listId" ref="listbox" role="listbox" aria-label="Categories" class="max-h-48 overflow-y-auto py-1">
        <li
          v-for="(category, idx) in suggestions"
          :id="`${listId}-${idx}`"
          :key="category"
          role="option"
          :aria-selected="idx === activeIdx"
          class="cursor-pointer px-3 py-2.5 text-sm text-gray-800 break-words"
          :class="idx === activeIdx ? 'bg-primary-50' : ''"
          @mouseenter="activeIdx = idx"
          @mouseleave="activeIdx = -1"
          @mousedown.prevent
          @click="select(category)"
        >{{ category }}</li>
      </ul>
      <p v-if="!suggestions.length" role="status" class="px-3 py-2 text-xs text-gray-400">No matching categories</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.ts'

const props = withDefaults(defineProps<{ modelValue: string; inputClass?: string }>(), {
  inputClass: 'input w-full'
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
  keydown: [event: KeyboardEvent]
}>()
const catalog = useCatalogStore()
const input = ref<HTMLInputElement | null>(null)
const listbox = ref<HTMLElement | null>(null)
const listId = `category-options-${getCurrentInstance()!.uid}`
const open = ref(false)
const showAll = ref(true)
const activeIdx = ref(-1)
const position = ref({ top: '0px', left: '0px', width: '0px' })
const suggestions = computed(() => {
  const query = props.modelValue.trim().toLowerCase()
  return showAll.value ? catalog.categories : catalog.categories.filter(category => category.toLowerCase().includes(query))
})

watch(suggestions, () => { activeIdx.value = -1 }, { flush: 'sync' })
watch([open, suggestions], () => nextTick(updatePosition))

// Fixed positioning keeps suggestions outside the cards' and catalog's clipping areas.
function updatePosition(): void {
  if (!open.value || !input.value) return
  const rect = input.value.getBoundingClientRect()
  const viewport = window.visualViewport
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportLeft = viewport?.offsetLeft ?? 0
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
  const width = Math.min(Math.max(rect.width, 192), viewportWidth - 16)
  const height = listbox.value?.parentElement?.offsetHeight ?? 194
  const below = viewportBottom - rect.bottom - 4
  const above = rect.top - viewportTop - 4
  const top = below < height && above > below ? rect.top - height - 4 : rect.bottom + 4
  position.value = {
    top: `${Math.max(viewportTop + 8, Math.min(top, viewportBottom - height - 8))}px`,
    left: `${Math.max(viewportLeft + 8, Math.min(rect.left, viewportLeft + viewportWidth - width - 8))}px`,
    width: `${width}px`
  }
}

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
  window.visualViewport?.addEventListener('resize', updatePosition)
  window.visualViewport?.addEventListener('scroll', updatePosition)
})
onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  window.visualViewport?.removeEventListener('resize', updatePosition)
  window.visualViewport?.removeEventListener('scroll', updatePosition)
})

function close(): void {
  open.value = false
  activeIdx.value = -1
}

function onInput(event: Event): void {
  activeIdx.value = -1
  showAll.value = false
  open.value = true
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function select(category: string): void {
  emit('update:modelValue', category)
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    event.stopPropagation()
    open.value = true
    activeIdx.value = event.key === 'ArrowDown'
      ? Math.min(activeIdx.value + 1, suggestions.value.length - 1)
      : Math.max(activeIdx.value - 1, -1)
    nextTick(() => listbox.value?.children[activeIdx.value]?.scrollIntoView({ block: 'nearest' }))
    return
  }
  if (event.key === 'Enter' && open.value && activeIdx.value >= 0) {
    event.preventDefault()
    event.stopPropagation()
    select(suggestions.value[activeIdx.value])
    return
  }
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key === 'Tab' || event.key === 'Enter') close()
  emit('keydown', event)
}

defineExpose({
  focus: () => input.value?.focus(),
  select: () => input.value?.select()
})
</script>
