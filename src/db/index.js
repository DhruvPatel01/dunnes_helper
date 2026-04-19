import { openDB } from 'idb'

export const dbPromise = openDB('dunnes-helper-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const catalog = db.createObjectStore('catalog', { keyPath: 'id', autoIncrement: true })
      catalog.createIndex('purchaseCount', 'purchaseCount')

      const history = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
      history.createIndex('date', 'date')
    }
    if (oldVersion < 2) {
      db.createObjectStore('activeSession', { keyPath: 'id' })
    }
  }
})
