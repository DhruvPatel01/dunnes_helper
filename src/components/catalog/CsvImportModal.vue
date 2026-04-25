<template>
  <Teleport to="body">
    <div v-if="modelValue && data" class="modal-fullscreen">

      <!-- Header -->
      <div class="page-header flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Import CSV</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ data.incoming.length }} item{{ data.incoming.length !== 1 ? 's' : '' }} in file</p>
        </div>
        <button class="p-2 text-gray-400 active:text-gray-600" @click="close">✕</button>
      </div>

      <!-- Step 1: Mode selection -->
      <div v-if="step === 1" class="flex-1 flex flex-col justify-center px-6 gap-4">
        <p class="text-sm text-gray-600 text-center mb-2">How do you want to import these items?</p>

        <button
          class="btn-primary w-full py-4 font-bold text-base"
          @click="chooseAdd"
        >
          Add to catalog
          <p class="text-xs font-normal opacity-80 mt-0.5">Keep existing items, add new ones</p>
        </button>

        <button
          class="w-full py-4 rounded-xl border-2 border-red-400 text-red-600 font-bold text-base active:bg-red-50"
          @click="chooseReplace"
        >
          Replace catalog
          <p class="text-xs font-normal opacity-70 mt-0.5">Delete all existing items and start fresh</p>
        </button>
      </div>

      <!-- Step 1b: Replace confirm -->
      <div v-else-if="step === 'replace-confirm'" class="flex-1 flex flex-col justify-center px-6 gap-4">
        <div class="text-center">
          <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
          <p class="font-semibold text-gray-900">Replace {{ catalog.items.length }} existing item{{ catalog.items.length !== 1 ? 's' : '' }}?</p>
          <p class="text-sm text-gray-500 mt-1">This will delete all current products and import {{ data.incoming.length }} new ones. Purchase history is kept.</p>
        </div>
        <button class="btn-danger w-full py-3.5 font-bold" @click="doReplace">
          Yes, replace catalog
        </button>
        <button class="w-full py-3 text-gray-500 font-medium" @click="step = 1">Back</button>
      </div>

      <!-- Step 2: Add mode — no conflicts -->
      <div v-else-if="step === 2 && conflicts.length === 0" class="flex-1 flex flex-col justify-center px-6 gap-4">
        <div class="text-center">
          <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p class="font-semibold text-gray-900">No conflicts found</p>
          <p class="text-sm text-gray-500 mt-1"> {{ newItemsString }} will be added to your catalog.</p>
        </div>
        <button class="btn-primary w-full py-3.5 font-bold" @click="doAdd">
          Add {{ newItemsString }}
        </button>
        <button class="w-full py-3 text-gray-500 font-medium" @click="step = 1">Back</button>
      </div>

      <!-- Step 2: Add mode — with conflicts -->
      <template v-else-if="step === 2 && conflicts.length > 0">
        <div class="scroll-area">
          <!-- New items summary -->
          <div v-if="newItems.length > 0" class="px-4 py-3 bg-green-50 border-b border-green-100">
            <p class="text-sm font-medium text-green-700">
              {{ newItemsString }} will be added automatically
            </p>
            <p class="text-xs text-green-600 mt-0.5">{{ newItems.map(i => i.name).join(', ') }}</p>
          </div>

          <!-- Conflict header -->
          <div class="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p class="text-sm font-semibold text-amber-700">{{ conflicts.length }} conflict{{ conflicts.length !== 1 ? 's' : '' }} — choose action for each</p>
          </div>

          <!-- Conflict rows -->
          <div v-for="c in conflicts" :key="c.existing.id" class="border-b border-gray-100">
            <!-- Existing vs incoming -->
            <div class="px-4 pt-3 pb-2">
              <div class="flex items-baseline gap-2 mb-0.5">
                <span class="text-xs font-medium text-gray-400 w-16 flex-shrink-0">Existing</span>
                <span class="text-sm font-semibold text-gray-800">{{ c.existing.name }}</span>
                <span class="text-sm text-gray-500 ml-auto flex-shrink-0">€{{ c.existing.price.toFixed(2) }}</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-xs font-medium text-amber-500 w-16 flex-shrink-0">Incoming</span>
                <span v-if="resolutions[c.existing.id]?.action !== 'rename'" class="text-sm text-gray-700">{{ c.incoming.name }}</span>
                <input
                  v-else
                  v-model="resolutions[c.existing.id].name"
                  class="flex-1 text-sm border border-primary rounded-lg px-2 py-0.5 outline-none"
                  placeholder="New name..."
                  @click.stop
                />
                <span class="text-sm text-gray-500 ml-auto flex-shrink-0">€{{ c.incoming.price.toFixed(2) }}</span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5 ml-16" v-if="c.existing.purchaseCount > 0">
                bought {{ c.existing.purchaseCount }}×
              </p>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-1.5 px-4 pb-3">
              <button
                v-for="opt in options"
                :key="opt.action"
                class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                :class="resolutions[c.existing.id]?.action === opt.action
                  ? opt.activeClass
                  : 'border-gray-200 text-gray-500 bg-white active:bg-gray-50'"
                @click="setResolution(c.existing.id, opt.action, c.incoming.name)"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>

        <!-- Confirm bar -->
        <div class="modal-footer border-gray-200">
          <button
            class="btn-primary w-full py-3.5 font-bold text-base"
            @click="doAdd"
          >Confirm Import</button>
        </div>
      </template>

    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'

const props = defineProps({
  modelValue: Boolean,
  data: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'done'])

const catalog = useCatalogStore()

const step = ref(1)
const resolutions = reactive({})

const options = [
  { action: 'skip',   label: 'Skip',       activeClass: 'border-gray-400 text-gray-600 bg-gray-100' },
  { action: 'merge',  label: 'Merge price', activeClass: 'border-primary text-primary bg-primary/10' },
  { action: 'add',    label: 'Add new',     activeClass: 'border-green-500 text-green-700 bg-green-50' },
  { action: 'rename', label: 'Rename →',    activeClass: 'border-amber-400 text-amber-700 bg-amber-50' },
]

const conflicts = computed(() => {
  if (!props.data) return []
  return props.data.incoming
    .map(inc => {
      const existing = catalog.items.find(
        e => e.name.toLowerCase() === inc.name.toLowerCase()
      )
      return existing ? { existing, incoming: inc } : null
    })
    .filter(Boolean)
})

const newItems = computed(() => {
  if (!props.data) return []
  const existingNames = new Set(catalog.items.map(e => e.name.toLowerCase()))
  return props.data.incoming.filter(inc => !existingNames.has(inc.name.toLowerCase()))
})

const newItemsString = computed(() => {
  return newItems.value.length + ' new item' + (newItems.value.length !== 1 ? 's' : '')})

watch(() => props.modelValue, (val) => {
  if (val) {
    step.value = 1
    Object.keys(resolutions).forEach(k => delete resolutions[k])
  }
})

watch(conflicts, (list) => {
  list.forEach(c => {
    if (!resolutions[c.existing.id]) {
      resolutions[c.existing.id] = { action: 'merge', name: c.incoming.name }
    }
  })
}, { immediate: true })

function setResolution(id, action, incomingName) {
  resolutions[id] = { action, name: action === 'rename' ? incomingName : resolutions[id]?.name ?? incomingName }
}

function chooseAdd() {
  step.value = 2
}

function chooseReplace() {
  step.value = 'replace-confirm'
}

async function doReplace() {
  await catalog.replaceAll(props.data.incoming)
  emit('done', `Replaced catalog with ${props.data.incoming.length} items.`)
  close()
}

async function doAdd() {
  let added = 0, merged = 0, skipped = 0

  // Add all non-conflicting new items
  for (const item of newItems.value) {
    await catalog.addProduct(item.name, item.category, item.price)
    added++
  }

  // Apply resolutions for conflicts
  for (const c of conflicts.value) {
    const res = resolutions[c.existing.id] ?? { action: 'merge' }
    if (res.action === 'skip') {
      skipped++
    } else if (res.action === 'merge') {
      await catalog.updateProduct(c.existing.id, { price: c.incoming.price })
      merged++
    } else if (res.action === 'add') {
      await catalog.addProduct(c.incoming.name, c.incoming.category, c.incoming.price)
      added++
    } else if (res.action === 'rename') {
      const name = res.name?.trim() || c.incoming.name
      await catalog.addProduct(name, c.incoming.category, c.incoming.price)
      added++
    }
  }

  const parts = []
  if (added) parts.push(`${added} added`)
  if (merged) parts.push(`${merged} merged`)
  if (skipped) parts.push(`${skipped} skipped`)
  emit('done', parts.join(', ') + '.')
  close()
}

function close() {
  emit('update:modelValue', false)
  step.value = 1
}
</script>
