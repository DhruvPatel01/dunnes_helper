import { dbPromise, writeTransaction } from '../db/index.ts'
import { downloadFile } from './csv.ts'
import { validateAppBackup } from './backup.ts'
import type { AppBackup } from '../types'

export async function exportAppData(): Promise<void> {
  const db = await dbPromise
  const tx = db.transaction(['catalog', 'history', 'lists'], 'readonly')
  const [catalog, history, lists] = await Promise.all(['catalog', 'history', 'lists'].map(store => tx.objectStore(store).getAll()))
  await tx.done
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
  return validateAppBackup(JSON.parse(text))
}

export async function importAppData(data: AppBackup): Promise<void> {
  const validated = validateAppBackup(data)
  await writeTransaction(['catalog', 'history', 'lists'], async tx => {
    const writes = []
    for (const store of ['catalog', 'history', 'lists'] as const) {
      writes.push(tx.objectStore(store).clear())
      for (const item of validated[store]) writes.push(tx.objectStore(store).put(item))
    }
    await Promise.all(writes)
  })
}
