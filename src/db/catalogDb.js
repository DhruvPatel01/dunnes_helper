import { dbPromise } from './index.js'

export async function getAllCatalogItems() {
  return (await dbPromise).getAll('catalog')
}

export async function addCatalogItem(item) {
  return (await dbPromise).add('catalog', item)
}

export async function putCatalogItem(item) {
  return (await dbPromise).put('catalog', item)
}

export async function deleteCatalogItem(id) {
  return (await dbPromise).delete('catalog', id)
}

export async function clearCatalog() {
  return (await dbPromise).clear('catalog')
}
