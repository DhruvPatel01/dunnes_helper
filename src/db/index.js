import { openDB } from 'idb'

export const dbPromise = openDB('dunnes-helper-db', 1, {
  upgrade(db) {
    const catalog = db.createObjectStore('catalog', { keyPath: 'id', autoIncrement: true })
    catalog.createIndex('purchaseCount', 'purchaseCount')
    catalog.createIndex('category', 'category')

    const history = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
    history.createIndex('date', 'date')

    db.createObjectStore('activeSession', { keyPath: 'id' })
    db.createObjectStore('lists', { keyPath: 'id' })
  }
})