<template>
  <div class="view-root">
    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900">History</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ archivedLists.length }} archived list{{ archivedLists.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>

    <div class="scroll-area">
      <div v-if="archivedLists.length === 0" class="flex flex-col items-center justify-center h-full px-8 text-center">
        <svg class="w-16 h-16 text-gray-200 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <p class="text-gray-400 text-sm">No archived lists yet. Archive a list to see your history.</p>
      </div>

      <div v-for="archivedList in archivedLists" :key="archivedList.id" class="bg-white border-b border-gray-100">
        <div class="flex items-center px-4 py-4">
          <button class="flex-1 text-left" @click="toggle(archivedList.id)">
            <!-- Editable date -->
            <div v-if="editingDateId === archivedList.id" class="flex items-center gap-2" @click.stop>
              <input
                type="date"
                :value="toDateInput(archivedList.date)"
                class="text-sm font-semibold text-gray-900 border-b border-primary outline-none bg-transparent"
                @input="saveDate(archivedList, $event.target.value)"
                @blur="editingDateId = null"
              />
            </div>
            <p v-else class="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              {{ archivedList.name }} · {{ formatDate(archivedList.date) }}
              <button
                class="text-gray-300 active:text-primary"
                @click.stop="editingDateId = archivedList.id"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              €{{ archivedList.totalSpent.toFixed(2) }} spent · €{{ archivedList.target }} target ·
              <span :class="archivedList.totalSpent >= archivedList.target ? 'text-primary font-medium' : 'text-amber-500'">
                {{ archivedList.totalSpent >= archivedList.target ? 'Target hit' : 'Below target' }}
              </span>
            </p>
            <p v-if="archivedList.unavailableItems?.length" class="text-xs text-red-400 mt-0.5">
              {{ archivedList.unavailableItems.length }} item{{ archivedList.unavailableItems.length !== 1 ? 's' : '' }} unavailable
            </p>
          </button>
          <div class="flex items-center gap-2 ml-3">
            <button
              class="p-1.5 rounded-lg text-gray-300 active:text-primary active:bg-primary/10"
              @click.stop="unarchive(archivedList)"
              title="Unarchive"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
            </button>
            <button
              class="p-1.5 rounded-lg text-gray-300 active:text-red-500 active:bg-red-50"
              @click.stop="confirmDelete(archivedList)"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
            <svg
              class="w-5 h-5 text-gray-400 transition-transform duration-200 cursor-pointer"
              :class="expanded === archivedList.id ? 'rotate-180' : ''"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              @click="toggle(archivedList.id)"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </div>

        <div v-if="expanded === archivedList.id" class="border-t border-gray-50">
          <div
            v-for="(item, idx) in archivedList.items"
            :key="idx"
            class="list-row last:border-0"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ item.name }}
                <span v-if="item.quantity > 1" class="text-gray-400 font-normal">×{{ item.quantity }}</span>
              </p>
            </div>
            <span class="ml-3 text-sm font-semibold text-gray-600">
              €{{ (item.price * item.quantity).toFixed(2) }}
            </span>
          </div>

          <div v-if="archivedList.unavailableItems?.length" class="px-4 py-2 border-t border-gray-50">
            <p class="text-xs text-red-400 font-medium mb-1">Unavailable items</p>
            <p class="text-xs text-gray-400">{{ archivedList.unavailableItems.map(i => i.name).join(', ') }}</p>
          </div>

          <div class="flex justify-between items-center px-4 py-3 bg-gray-50">
            <span class="text-xs text-gray-400">Total</span>
            <span class="text-sm font-bold text-gray-800">€{{ archivedList.totalSpent.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Archived List"
    :message="`Delete the archived list from ${pendingDelete ? formatDate(pendingDelete.date) : ''}?`"
    confirm-label="Delete"
    :danger="true"
    @confirm="doDelete"
  />

</template>

<script setup>
import { ref, onMounted, toRaw } from 'vue'
import { dbPromise } from '../db/index.js'
import ConfirmDialog from '../components/shared/ConfirmDialog.vue'
import { useListsStore } from '../stores/listsStore.js'

const listsStore = useListsStore()

const archivedLists = ref([])
const expanded = ref(null)
const showDeleteConfirm = ref(false)
const pendingDelete = ref(null)
const editingDateId = ref(null)

onMounted(loadArchivedLists)

async function loadArchivedLists() {
  const all = await (await dbPromise).getAll('history')
  archivedLists.value = [...all].reverse()
  if (archivedLists.value.length > 0 && expanded.value === null) {
    expanded.value = archivedLists.value[0].id
  }
}

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function toDateInput(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}

async function saveDate(archivedList, dateStr) {
  if (!dateStr) return
  const newDate = new Date(dateStr).toISOString()
  const updated = { ...toRaw(archivedList), date: newDate }
  await (await dbPromise).put('history', updated)
  const idx = archivedLists.value.findIndex(s => s.id === archivedList.id)
  if (idx !== -1) archivedLists.value[idx] = updated
  editingDateId.value = null
}

async function unarchive(archivedList) {
  await listsStore.unarchive(archivedList)
  await (await dbPromise).delete('history', archivedList.id)
  await loadArchivedLists()
  window.location.hash = 'lists'
}

function confirmDelete(archivedList) {
  pendingDelete.value = archivedList
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!pendingDelete.value) return
  await (await dbPromise).delete('history', pendingDelete.value.id)
  archivedLists.value = archivedLists.value.filter(s => s.id !== pendingDelete.value.id)
  if (expanded.value === pendingDelete.value.id) expanded.value = null
  pendingDelete.value = null
}
</script>
