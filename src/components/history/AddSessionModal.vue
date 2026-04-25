<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-fullscreen">
      <!-- Header -->
      <div class="page-header flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-900">Add Past Session</h2>
        <button class="p-2 text-gray-400 active:text-gray-600" @click="close">✕</button>
      </div>

      <div class="scroll-area px-4 py-4 space-y-4">
        <!-- Date -->
        <div>
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
          <input
            v-model="date"
            type="date"
            class="input mt-1 w-full py-2.5"
          />
        </div>

        <!-- Target -->
        <div>
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Target (€)</label>
          <input
            v-model.number="target"
            type="number"
            min="0"
            step="0.01"
            placeholder="25.00"
            class="input mt-1 w-full py-2.5"
          />
        </div>

        <!-- Add items search -->
        <div>
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</label>
          <div class="mt-1 relative">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search catalog to add items..."
              class="input w-full py-2.5"
            />
            <div v-if="searchQuery && searchResults.length > 0" class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-10">
              <button
                v-for="product in searchResults"
                :key="product.id"
                class="w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-50 last:border-0 active:bg-gray-50 text-left"
                @click="addItem(product)"
              >
                <span class="text-sm font-medium text-gray-800 truncate">{{ product.name }}</span>
                <span class="text-sm font-bold text-primary ml-2 flex-shrink-0">€{{ product.price.toFixed(2) }}</span>
              </button>
            </div>
            <p v-else-if="searchQuery && searchResults.length === 0" class="mt-1 text-xs text-gray-400 text-center">No matches</p>
          </div>
        </div>

        <!-- Added items list -->
        <div v-if="sessionItems.length > 0" class="border border-gray-100 rounded-xl overflow-hidden">
          <div
            v-for="(item, idx) in sessionItems"
            :key="idx"
            class="flex items-center px-3 py-2.5 border-b border-gray-50 last:border-0"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</p>
              <p class="text-xs text-gray-400">€{{ item.price.toFixed(2) }} each</p>
            </div>
            <div class="flex items-center gap-2 ml-2">
              <button class="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200" @click="changeQty(idx, -1)">−</button>
              <span class="w-5 text-center text-sm font-semibold">{{ item.quantity }}</span>
              <button class="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200" @click="changeQty(idx, 1)">+</button>
              <span class="w-14 text-right text-sm font-semibold text-gray-600">€{{ (item.price * item.quantity).toFixed(2) }}</span>
              <button class="ml-1 text-gray-300 active:text-red-500" @click="removeItem(idx)">✕</button>
            </div>
          </div>
          <div class="flex justify-between items-center px-3 py-2 bg-gray-50">
            <span class="text-xs text-gray-400">Total</span>
            <span class="text-sm font-bold text-gray-700">€{{ total.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Save button -->
      <div class="modal-footer">
        <p v-if="error" class="text-xs text-red-500 mb-2 text-center">{{ error }}</p>
        <button
          class="w-full py-3.5 rounded-xl font-bold text-base transition-colors"
          :class="canSave ? 'bg-primary text-white active:bg-primary-600' : 'bg-gray-200 text-gray-400'"
          :disabled="!canSave"
          @click="save"
        >
          Save Session
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import { dbPromise } from '../../db/index.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'saved'])

const catalog = useCatalogStore()

const date = ref(new Date().toISOString().slice(0, 10))
const target = ref(25)
const searchQuery = ref('')
const sessionItems = ref([])
const error = ref('')

const searchResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  return catalog.items
    .filter(p => p.name.toLowerCase().includes(q))
    .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
    .slice(0, 8)
})

const total = computed(() =>
  sessionItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
)

const canSave = computed(() => sessionItems.value.length > 0 && date.value)

function addItem(product) {
  const existing = sessionItems.value.find(i => i.productId === product.id)
  if (existing) {
    existing.quantity++
  } else {
    sessionItems.value.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 })
  }
  searchQuery.value = ''
}

function changeQty(idx, delta) {
  const item = sessionItems.value[idx]
  const newQty = item.quantity + delta
  if (newQty <= 0) {
    sessionItems.value.splice(idx, 1)
  } else {
    item.quantity = newQty
  }
}

function removeItem(idx) {
  sessionItems.value.splice(idx, 1)
}

async function save() {
  error.value = ''
  if (!canSave.value) return

  const entry = {
    date: new Date(date.value).toISOString(),
    target: target.value || 0,
    items: sessionItems.value.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
    unavailableItems: [],
    totalSpent: total.value
  }

  await (await dbPromise).add('history', entry)

  for (const item of sessionItems.value) {
    for (let i = 0; i < item.quantity; i++) {
      await catalog.incrementPurchaseCount(item.productId)
    }
  }

  emit('saved')
  close()
}

function close() {
  emit('update:modelValue', false)
  sessionItems.value = []
  searchQuery.value = ''
  error.value = ''
  date.value = new Date().toISOString().slice(0, 10)
  target.value = 25
}

watch(() => props.modelValue, (val) => {
  if (val) {
    date.value = new Date().toISOString().slice(0, 10)
  }
})
</script>
