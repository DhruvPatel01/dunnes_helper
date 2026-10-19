<template>
  <div class="bg-white rounded-2xl mx-3 mb-3 shadow-sm border border-gray-100 overflow-hidden">
    <!-- Header (always visible) -->
    <div
      class="flex items-center justify-between px-4 py-3 cursor-pointer select-none active:bg-gray-50"
      @click="store.toggleExpand(list.id)"
    >
      <div class="flex items-center gap-2 min-w-0">
        <svg
          class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
          :class="expanded ? 'rotate-90' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span class="font-semibold text-gray-800 truncate">{{ list.name }}</span>
        <span
          v-if="list.items.length > 0"
          class="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 flex-shrink-0"
        >{{ list.items.length }}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span v-if="list.targetDate" class="text-xs text-gray-400">{{ formatDate(list.targetDate) }}</span>
        <span class="text-sm font-semibold text-gray-700">€{{ total.toFixed(2) }}</span>
        <span v-if="list.target != null" class="text-xs text-gray-400">/ €{{ list.target }}</span>
      </div>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded">
      <ListSearchBar :list-id="list.id" />
      <div v-if="list.target != null" class="px-4 py-2 bg-white border-b border-gray-100">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-medium text-gray-700">
            <span v-if="gap > 0" class="text-gray-600">€{{ gap.toFixed(2) }} to go</span>
            <span v-else-if="gap === 0" class="text-primary">Target reached</span>
            <span v-else :class="gap >= -1 ? 'text-amber-500' : 'text-red-500'">€{{ Math.abs(gap).toFixed(2) }} over</span>
          </span>
          <span class="text-gray-400">€{{ total.toFixed(2) }} / €{{ list.target.toFixed(2) }}</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            class="h-full transition-all duration-300"
            :class="gap < -1 ? 'bg-red-400' : gap < 0 ? 'bg-amber-400' : 'bg-primary'"
            :style="{ width: checkedPct + '%' }"
          />
          <div
            class="h-full transition-all duration-300 bg-primary/30"
            :style="{ width: (progressPct - checkedPct) + '%' }"
          />
        </div>
        <div v-if="list.discount > 0" class="mt-1 text-xs text-green-600 font-medium">
          €{{ list.discount }} voucher {{ gap > 0 ? 'when you reach target' : 'target reached' }} · valid 1 week
        </div>
      </div>

      <!-- Items -->
      <div v-if="list.items.length === 0" class="flex flex-col items-center justify-center py-8 text-center px-6">
        <p class="text-gray-400 text-sm">No items yet</p>
        <p class="text-gray-300 text-xs mt-1">Search above to add items</p>
      </div>
      <div v-else>
        <ListItemRow
          v-for="item in sortedItems"
          :key="item.productId"
          :item="item"
          :list-id="list.id"
        />
      </div>

      <!-- Footer actions -->
      <div class="flex items-center justify-between px-4 py-2 border-t border-gray-50">
        <div class="flex items-center gap-3">
          <!-- Edit target -->
          <button
            v-if="!list.isInbox"
            class="text-xs text-gray-400 underline"
            @click.stop="editOpen = !editOpen"
          >{{ editOpen ? 'cancel' : 'edit target' }}</button>
          <!-- Archive -->
          <button
            v-if="!list.isInbox"
            class="text-xs text-primary underline"
            @click.stop="confirmArchive = true"
          >Archive</button>
        </div>
        <!-- Delete -->
        <button
          v-if="!list.isInbox"
          class="text-xs text-red-400"
          @click.stop="confirmDelete = true"
        >Delete list</button>
      </div>

      <!-- Inline target/discount edit -->
      <div v-if="editOpen && !list.isInbox" class="px-4 pb-3 space-y-2 border-t border-gray-50">
        <div class="flex items-center gap-2 pt-2">
          <span class="text-xs text-gray-500 w-20">Target €</span>
          <input
            v-model.number="editTarget"
            type="number" min="0" step="1"
            class="input flex-1 py-1.5"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-20">Voucher €</span>
          <input
            v-model.number="editDiscount"
            type="number" min="0" step="0.5"
            class="input flex-1 py-1.5"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-20">Name</span>
          <input
            v-model="editName"
            type="text"
            class="input flex-1 py-1.5"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-20">Date</span>
          <input
            v-model="editTargetDate"
            type="date"
            class="input flex-1 py-1.5"
          />
        </div>
        <button
          class="btn-primary w-full py-2 text-sm"
          @click="saveEdit"
        >Save</button>
        <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>
      </div>
    </div>

    <ConfirmDialog
      v-model="confirmDelete"
      title="Delete list?"
      :message="`Remove &quot;${list.name}&quot; and all its items?`"
      confirm-label="Delete"
      :danger="true"
      @confirm="store.deleteList(list.id)"
    />

    <ConfirmDialog
      v-model="confirmArchive"
      title="Archive list?"
      :message="`Save &quot;${list.name}&quot; to archive?`"
      confirm-label="Archive"
      @confirm="store.archiveList(list.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { defaultDiscount, toCents } from '../../utils/money.ts'
import { useListsStore } from '../../stores/listsStore.ts'
import ListSearchBar from './ListSearchBar.vue'
import ListItemRow from './ListItemRow.vue'
import ConfirmDialog from '../shared/ConfirmDialog.vue'
import type { ShoppingList } from '../../types'

const props = defineProps<{ list: ShoppingList }>()
const store = useListsStore()

const expanded = computed(() => store.isExpanded(props.list.id))
const total = computed(() => store.listTotal(props.list.id))
const gap = computed(() => store.listGap(props.list.id) ?? 0)
const sortedItems = computed(() =>
  [...props.list.items].sort((a, b) => Number(a.checked) - Number(b.checked))
)

const progressPct = computed(() => {
  if (props.list.target == null || props.list.target === 0) return 0
  return Math.min(100, (total.value / props.list.target) * 100)
})

const checkedTotal = computed(() =>
  props.list.items
    .filter(i => i.checked && !i.unavailable)
    .reduce((sum, i) => sum + toCents(i.sessionPrice) * i.quantity, 0) / 100
)
const checkedPct = computed(() => {
  if (!props.list.target) return 0
  return Math.min(100, (checkedTotal.value / props.list.target) * 100)
})

const confirmDelete = ref(false)
const confirmArchive = ref(false)
const editOpen = ref(false)
const editError = ref('')
const editTarget = ref<number | string>(props.list.target ?? '')
const editDiscount = ref(props.list.discount ?? 0)
const editName = ref(props.list.name)
const editTargetDate = ref(props.list.targetDate ?? '')

watch(editOpen, open => {
  if (!open) return
  editTarget.value = props.list.target ?? ''
  editDiscount.value = props.list.discount
  editName.value = props.list.name
  editTargetDate.value = props.list.targetDate
  editError.value = ''
})

watch(editTarget, (target, previous) => {
  if (editDiscount.value === defaultDiscount(Number(previous))) {
    editDiscount.value = defaultDiscount(Number(target))
  }
}, { flush: 'sync' })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })
}

async function saveEdit(): Promise<void> {
  const t = editTarget.value === '' ? null : Number(editTarget.value)
  const d = Number(editDiscount.value)
  if ((t != null && (!Number.isFinite(t) || t <= 0)) || !Number.isFinite(d) || d < 0) {
    editError.value = 'Enter a positive target and a valid voucher amount'
    return
  }
  await store.updateListTarget(props.list.id, t, d)
  await store.updateListName(props.list.id, editName.value.trim() || props.list.name)
  await store.updateListTargetDate(props.list.id, editTargetDate.value)
  editOpen.value = false
}
</script>
