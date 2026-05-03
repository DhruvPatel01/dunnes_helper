<template>
  <div class="px-4 bg-white border-t border-gray-100">
    <button
      class="flex items-center justify-between w-full py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"
      @click="collapsed = !collapsed"
    >
      <span>Import / Export</span>
      <svg
        class="w-3.5 h-3.5 transition-transform"
        :class="collapsed ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="!collapsed" class="pb-4 space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-secondary py-2.5 px-3 text-sm bg-white active:bg-gray-50 transition-colors" @click="exportCsv">Export Catalog (CSV)</button>
        <label class="btn-secondary py-2.5 px-3 text-sm bg-white active:bg-gray-50 transition-colors text-center cursor-pointer">
          Import Catalog (CSV)
          <input type="file" accept=".csv" class="hidden" @change="handleCsvImport" />
        </label>
        <button class="btn-secondary py-2.5 px-3 text-sm bg-white active:bg-gray-50 transition-colors" @click="exportJson">Export All Data (JSON)</button>
        <label class="btn-secondary py-2.5 px-3 text-sm bg-white active:bg-gray-50 transition-colors text-center cursor-pointer">
          Import All Data (JSON)
          <input type="file" accept=".json" class="hidden" @change="handleJsonImport" />
        </label>
      </div>

      <p v-if="message" class="text-xs mt-1" :class="messageIsError ? 'text-red-500' : 'text-primary'">
        {{ message }}
      </p>
    </div>

    <CsvImportModal v-model="showCsvModal" :data="csvImportData" @done="msg => showMsg(msg)" />

    <ConfirmDialog
      v-model="showJsonConfirm"
      title="Restore backup?"
      message="This will replace all existing products and history with the backup data."
      confirm-label="Restore"
      :danger="true"
      @confirm="doJsonImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.ts'
import { useListsStore } from '../../stores/listsStore.ts'
import { parseCsv, generateCsv, downloadFile } from '../../utils/csv.ts'
import { exportAppData, parseAppDataJson, importAppData } from '../../utils/dataExport.ts'
import ConfirmDialog from '../shared/ConfirmDialog.vue'
import CsvImportModal from './CsvImportModal.vue'
import type { AppBackup, CatalogProduct } from '../../types'

const catalog = useCatalogStore()
const lists = useListsStore()

const collapsed = ref(false)
const message = ref('')
const messageIsError = ref(false)
const showCsvModal = ref(false)
const csvImportData = ref<{ incoming: CatalogProduct[] } | null>(null)
const showJsonConfirm = ref(false)
const pendingJson = ref<AppBackup | null>(null)

function showMsg(text: string, isError = false): void {
  message.value = text
  messageIsError.value = isError
  setTimeout(() => { message.value = '' }, 3000)
}

function exportCsv() {
  const csv = generateCsv(catalog.items)
  downloadFile(csv, 'dunnes-catalog.csv', 'text/csv')
}

async function exportJson() {
  await exportAppData()
}

function handleCsvImport(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  const reader = new FileReader()
  reader.onload = (ev: ProgressEvent<FileReader>) => {
    try {
      const rows = parseCsv(ev.target!.result as string)
      if (!rows.length) { showMsg('No valid rows found in CSV.', true); return }
      csvImportData.value = {
        incoming: rows.map(r => ({
          name: r.name,
          category: r.category,
          price: parseFloat(r.price),
          purchaseCount: 0,
          lastUpdated: new Date().toISOString(),
          lastPurchasedAt: null
        }))
      }
      showCsvModal.value = true
    } catch {
      showMsg('Failed to parse CSV file.', true)
    }
  }
  reader.readAsText(file)
}

function handleJsonImport(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  const reader = new FileReader()
  reader.onload = async (ev: ProgressEvent<FileReader>) => {
    try {
      pendingJson.value = parseAppDataJson(ev.target!.result as string)
      showJsonConfirm.value = true
    } catch {
      showMsg('Invalid backup file.', true)
    }
  }
  reader.readAsText(file)
}

async function doJsonImport() {
  if (!pendingJson.value) return
  try {
    await importAppData(toRaw(pendingJson.value))
    await Promise.all([catalog.loadFromDb(), lists.init()])
    const { catalog: c, history: h, lists: l } = pendingJson.value
    showMsg(`Restored ${c.length} products, ${(h || []).length} history entries, ${(l || []).length} lists.`)
  } catch (err) {
    console.error('Restore failed:', err)
    showMsg('Restore failed.', true)
  }
  pendingJson.value = null
}
</script>
