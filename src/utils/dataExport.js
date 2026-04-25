import { dbPromise } from '../db/index.js'
import { downloadFile } from './csv.js'

export async function exportAppData() {
  const db = await dbPromise
  const [catalog, history, lists] = await Promise.all([db.getAll('catalog'), db.getAll('history'), db.getAll('lists')])
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    catalog,
    history,
    lists,
  }
  downloadFile(JSON.stringify(data, null, 2), 'dunnes-helper-backup.json', 'application/json')
}

export function parseAppDataJson(text) {
  const data = JSON.parse(text)
  if (!data.version || !Array.isArray(data.catalog)) {
    throw new Error('Invalid backup file format')
  }
  return data
}

export async function importAppData(data) {
  const db = await dbPromise
  const tx = db.transaction(['catalog', 'history', 'lists'], 'readwrite')
  await Promise.all([
    tx.objectStore('catalog').clear(),
    tx.objectStore('history').clear(),
    tx.objectStore('lists').clear(),
  ])
  const stores = ['catalog', 'history', 'lists']
  for (const store of stores) {
    if (!Array.isArray(data[store])) continue
    for (const item of data[store]) {
      const { id: _id, ...rest } = item
      tx.objectStore(store).add(rest)
    }
  }
  await tx.done
}
