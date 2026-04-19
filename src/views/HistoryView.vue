<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900">History</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ sessions.length }} past session{{ sessions.length !== 1 ? 's' : '' }}</p>
      </div>
      <button
        class="text-sm text-primary font-medium py-1.5 px-3 rounded-lg bg-primary/10 active:bg-primary/20"
        @click="showAddModal = true"
      >+ Add session</button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="sessions.length === 0" class="flex flex-col items-center justify-center h-full px-8 text-center">
        <svg class="w-16 h-16 text-gray-200 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <p class="text-gray-400 text-sm">No sessions yet. Complete a shop to see your history.</p>
      </div>

      <div v-for="session in sessions" :key="session.id" class="bg-white border-b border-gray-100">
        <div class="flex items-center px-4 py-4">
          <button class="flex-1 text-left" @click="toggle(session.id)">
            <!-- Editable date -->
            <div v-if="editingDateId === session.id" class="flex items-center gap-2" @click.stop>
              <input
                type="date"
                :value="toDateInput(session.date)"
                class="text-sm font-semibold text-gray-900 border-b border-primary outline-none bg-transparent"
                @change="saveDate(session, $event.target.value)"
                @blur="editingDateId = null"
              />
            </div>
            <p v-else class="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              {{ formatDate(session.date) }}
              <button
                class="text-gray-300 active:text-primary"
                @click.stop="editingDateId = session.id"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              €{{ session.totalSpent.toFixed(2) }} spent · €{{ session.target }} target ·
              <span :class="session.totalSpent >= session.target ? 'text-primary font-medium' : 'text-amber-500'">
                {{ session.totalSpent >= session.target ? 'Target hit' : 'Below target' }}
              </span>
            </p>
            <p v-if="session.unavailableItems?.length" class="text-xs text-red-400 mt-0.5">
              {{ session.unavailableItems.length }} item{{ session.unavailableItems.length !== 1 ? 's' : '' }} unavailable
            </p>
          </button>
          <div class="flex items-center gap-2 ml-3">
            <button
              class="p-1.5 rounded-lg text-gray-300 active:text-red-500 active:bg-red-50"
              @click.stop="confirmDelete(session)"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
            <svg
              class="w-5 h-5 text-gray-400 transition-transform duration-200 cursor-pointer"
              :class="expanded === session.id ? 'rotate-180' : ''"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              @click="toggle(session.id)"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </div>

        <div v-if="expanded === session.id" class="border-t border-gray-50">
          <div
            v-for="(item, idx) in session.items"
            :key="idx"
            class="flex items-center px-4 py-3 border-b border-gray-50 last:border-0"
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

          <div v-if="session.unavailableItems?.length" class="px-4 py-2 border-t border-gray-50">
            <p class="text-xs text-red-400 font-medium mb-1">Unavailable items</p>
            <p class="text-xs text-gray-400">{{ session.unavailableItems.map(i => i.name).join(', ') }}</p>
          </div>

          <div class="flex justify-between items-center px-4 py-3 bg-gray-50">
            <span class="text-xs text-gray-400">Total</span>
            <span class="text-sm font-bold text-gray-800">€{{ session.totalSpent.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Session"
    :message="`Delete the session from ${pendingDelete ? formatDate(pendingDelete.date) : ''}?`"
    confirm-label="Delete"
    :danger="true"
    @confirm="doDelete"
  />

  <AddSessionModal v-model="showAddModal" @saved="loadSessions" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAllHistory, deleteHistoryEntry, putHistoryEntry } from '../db/historyDb.js'
import ConfirmDialog from '../components/shared/ConfirmDialog.vue'
import AddSessionModal from '../components/history/AddSessionModal.vue'

const sessions = ref([])
const expanded = ref(null)
const showDeleteConfirm = ref(false)
const pendingDelete = ref(null)
const showAddModal = ref(false)
const editingDateId = ref(null)

onMounted(loadSessions)

async function loadSessions() {
  const all = await getAllHistory()
  sessions.value = [...all].reverse()
  if (sessions.value.length > 0 && expanded.value === null) {
    expanded.value = sessions.value[0].id
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

async function saveDate(session, dateStr) {
  if (!dateStr) return
  const newDate = new Date(dateStr).toISOString()
  const updated = { ...session, date: newDate }
  await putHistoryEntry(updated)
  const idx = sessions.value.findIndex(s => s.id === session.id)
  if (idx !== -1) sessions.value[idx] = updated
  editingDateId.value = null
}

function confirmDelete(session) {
  pendingDelete.value = session
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!pendingDelete.value) return
  await deleteHistoryEntry(pendingDelete.value.id)
  sessions.value = sessions.value.filter(s => s.id !== pendingDelete.value.id)
  if (expanded.value === pendingDelete.value.id) expanded.value = null
  pendingDelete.value = null
}
</script>
