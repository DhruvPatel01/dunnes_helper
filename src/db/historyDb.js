import { dbPromise } from './index.js'

export async function getAllHistory() {
  return (await dbPromise).getAll('history')
}

export async function addHistoryEntry(entry) {
  return (await dbPromise).add('history', entry)
}

export async function deleteHistoryEntry(id) {
  return (await dbPromise).delete('history', id)
}

export async function putHistoryEntry(entry) {
  return (await dbPromise).put('history', entry)
}
