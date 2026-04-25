import { dbPromise } from '../db/index.js'
import { downloadFile } from './csv.js'

export async function exportAppData() {
  const db = await dbPromise
  const [catalog, history] = await Promise.all([db.getAll('catalog'), db.getAll('history')])
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    catalog,
    history
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
