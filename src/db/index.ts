import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb'

export const dbPromise = openDB('dunnes-helper-db', 1, {
  upgrade(db: IDBPDatabase) {
    const catalog = db.createObjectStore('catalog', { keyPath: 'id', autoIncrement: true })
    catalog.createIndex('purchaseCount', 'purchaseCount')
    catalog.createIndex('category', 'category')

    const history = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
    history.createIndex('date', 'date')

    db.createObjectStore('activeSession', { keyPath: 'id' })
    db.createObjectStore('lists', { keyPath: 'id' })
  }
})

// Observe request and commit failures together, and roll back synchronous errors too.
export async function writeTransaction<T>(stores: string[], action: (tx: IDBPTransaction<unknown, string[], 'readwrite'>) => Promise<T>): Promise<T> {
  const tx = (await dbPromise).transaction(stores, 'readwrite')
  try {
    const [result] = await Promise.all([action(tx), tx.done])
    return result
  } catch (error) {
    try { tx.abort() } catch { /* The transaction may already have aborted. */ }
    await tx.done.catch(() => {})
    throw error
  }
}
