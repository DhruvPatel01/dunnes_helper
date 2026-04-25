<template>
  <div class="px-4 py-4 bg-white border-t border-gray-100 space-y-3">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Data</p>

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

<script setup>
import { ref } from 'vue'
import { useCatalogStore } from '../../stores/catalogStore.js'
import { parseCsv, generateCsv, downloadFile } from '../../utils/csv.js'
import { exportAppData, parseAppDataJson } from '../../utils/dataExport.js'
import ConfirmDialog from '../shared/ConfirmDialog.vue'
import CsvImportModal from './CsvImportModal.vue'

const catalog = useCatalogStore()

const message = ref('')
const messageIsError = ref(false)
const showCsvModal = ref(false)
const csvImportData = ref(null)
const showJsonConfirm = ref(false)
const pendingJson = ref(null)

function showMsg(text, isError = false) {
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

function handleCsvImport(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const rows = parseCsv(ev.target.result)
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

function handleJsonImport(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      pendingJson.value = parseAppDataJson(ev.target.result)
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
    await catalog.replaceAll(pendingJson.value.catalog)
    showMsg(`Restored ${pendingJson.value.catalog.length} products.`)
  } catch {
    showMsg('Restore failed.', true)
  }
  pendingJson.value = null
}
</script>
