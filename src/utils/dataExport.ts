import { dbPromise } from '../db/index.ts'
import { downloadFile } from './csv.ts'
import type { AppBackup, StoreName } from '../types'

export async function exportAppData(): Promise<void> {
  const db = await dbPromise
  const [catalog, history, lists] = await Promise.all([db.getAll('catalog'), db.getAll('history'), db.getAll('lists')])
  const data: AppBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    catalog,
    history,
    lists,
  }
  downloadFile(JSON.stringify(data, null, 2), 'dunnes-helper-backup.json', 'application/json')
}

export function parseAppDataJson(text: string): AppBackup {
  const data = JSON.parse(text)
  if (!data.version || !Array.isArray(data.catalog)) {
    throw new Error('Invalid backup file format')
  }
  return data as AppBackup
}

export async function importAppData(data: AppBackup): Promise<void> {
  const db = await dbPromise
  const tx = db.transaction(['catalog', 'history', 'lists'], 'readwrite')
  const stores: StoreName[] = ['catalog', 'history', 'lists']

  for (const store of stores) {
    const items = data[store as keyof Pick<AppBackup, 'catalog' | 'history' | 'lists'>]
    if (!Array.isArray(items)) continue
    await tx.objectStore(store).clear()
    for (const item of items) {
      tx.objectStore(store).put(item)
    }
  }

  await tx.done
}
