import { defineStore } from 'pinia'
import { ref, reactive, toRaw } from 'vue'
import { dbPromise, writeTransaction } from '../db/index.ts'
import { useCatalogStore } from './catalogStore.ts'
import { defaultDiscount, roundMoney, toCents } from '../utils/money.ts'
import { historyPurchaseDate, localDateInput } from '../utils/dates.ts'
import type { ShoppingList, ListItem, CatalogProduct, HistoryEntry } from '../types'

const INBOX_ID = 'inbox'

function validateTarget(target?: number | null, discount?: number): void {
  if (target != null && (!Number.isFinite(target) || target <= 0)) throw new Error('Enter a positive target')
  if (discount != null && (!Number.isFinite(discount) || discount < 0)) throw new Error('Enter a valid voucher amount')
}

function sortLists(lists: ShoppingList[]): void {
  lists.sort((a, b) => Number(b.isInbox) - Number(a.isInbox) ||
    (a.targetDate || a.createdAt.slice(0, 10)).localeCompare(b.targetDate || b.createdAt.slice(0, 10)) ||
    a.createdAt.localeCompare(b.createdAt))
}

function makeInbox(): ShoppingList {
  return { id: INBOX_ID, name: 'Inbox', isInbox: true, target: null, discount: 0, items: [], createdAt: new Date().toISOString(), targetDate: '' }
}

async function putListDb(list: ShoppingList): Promise<void> {
  await (await dbPromise).put('lists', structuredClone(toRaw(list)))
}

export const useListsStore = defineStore('lists', () => {
  const lists = ref<ShoppingList[]>([])
  const expandedListIds = reactive(new Set<string>())

  async function init(): Promise<void> {
    const stored: ShoppingList[] = await (await dbPromise).getAll('lists')
    if (!stored.some(list => list.id === INBOX_ID)) {
      const inbox = makeInbox()
      await putListDb(inbox)
      stored.push(inbox)
    }
    lists.value = stored.map(list => ({ ...list, targetDate: list.targetDate ?? '' }))
    sortLists(lists.value)
    expandedListIds.clear()
  }

  async function createList(name: string, targetDate: string, target?: number | null, discountOverride?: number): Promise<ShoppingList> {
    validateTarget(target, discountOverride)
    const disc = discountOverride !== undefined ? discountOverride : defaultDiscount(target ?? 0)
    const list: ShoppingList = {
      id: crypto.randomUUID(),
      name,
      isInbox: false,
      target: target ?? null,
      discount: disc,
      items: [],
      createdAt: new Date().toISOString(),
      targetDate
    }
    await putListDb(list)
    lists.value.push(list)
    sortLists(lists.value)
    return list
  }

  async function updateListTargetDate(id: string, targetDate: string): Promise<void> {
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.targetDate = targetDate
    await putListDb(list)
    sortLists(lists.value)
  }

  async function deleteList(id: string): Promise<void> {
    if (id === INBOX_ID) return
    await (await dbPromise).delete('lists', id)
    expandedListIds.delete(id)
    lists.value = lists.value.filter(l => l.id !== id)
  }

  async function updateListTarget(id: string, target: number | null, discountOverride?: number): Promise<void> {
    validateTarget(target, discountOverride)
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.target = target
    list.discount = discountOverride !== undefined ? discountOverride : defaultDiscount(target ?? 0)
    await putListDb(list)
  }

  async function updateListName(id: string, name: string): Promise<void> {
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.name = name
    await putListDb(list)
  }

  function toggleExpand(id: string): void {
    if (expandedListIds.has(id)) {
      expandedListIds.delete(id)
    } else {
      expandedListIds.add(id)
    }
  }

  function isExpanded(id: string): boolean {
    return expandedListIds.has(id)
  }

  async function addItemToList(listId: string, product: CatalogProduct): Promise<void> {
    if (product.id == null) return
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const existing = list.items.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity++
      existing.unavailable = false
    } else {
      list.items.push({
        productId: product.id!,
        name: product.name,
        catalogPrice: product.price,
        sessionPrice: product.price,
        quantity: 1,
        checked: false,
        unavailable: false
      })
    }
    await putListDb(list)
  }

  async function removeItemFromList(listId: string, productId: number): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    list.items = list.items.filter(i => i.productId !== productId)
    await putListDb(list)
  }

  async function updateItemQuantity(listId: string, productId: number, qty: number): Promise<void> {
    if (!Number.isSafeInteger(qty)) return
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    if (qty <= 0) {
      list.items = list.items.filter(i => i.productId !== productId)
    } else {
      const item = list.items.find(i => i.productId === productId)
      if (item) item.quantity = qty
    }
    await putListDb(list)
  }

  async function updateItemPrice(listId: string, productId: number, newPrice: number, permanent = false): Promise<void> {
    if (!Number.isFinite(newPrice) || newPrice < 0) return
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.sessionPrice = roundMoney(newPrice)
    if (permanent) {
      await useCatalogStore().updateProduct(productId, { price: item.sessionPrice })
      item.catalogPrice = item.sessionPrice
    }
    await putListDb(list)
  }

  async function resetItemPrice(listId: string, productId: number): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.sessionPrice = item.catalogPrice
    await putListDb(list)
  }

  async function toggleChecked(listId: string, productId: number): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item || item.unavailable) return
    item.checked = !item.checked
    await putListDb(list)
  }

  async function toggleUnavailable(listId: string, productId: number): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.unavailable = !item.unavailable
    if (item.unavailable) item.checked = false
    await putListDb(list)
  }

  async function moveItem(productId: number, fromListId: string, toListId: string): Promise<void> {
    if (fromListId === toListId) return
    const from = lists.value.find(l => l.id === fromListId)
    const to = lists.value.find(l => l.id === toListId)
    if (!from || !to) return
    const fromList = structuredClone(toRaw(from))
    const toList = structuredClone(toRaw(to))
    const item = fromList.items.find(i => i.productId === productId)
    if (!item) return
    fromList.items = fromList.items.filter(i => i.productId !== productId)
    const existing = toList.items.find(i => i.productId === productId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      toList.items.push({ ...item })
    }
    await writeTransaction(['lists'], async tx => {
      await Promise.all([tx.objectStore('lists').put(fromList), tx.objectStore('lists').put(toList)])
    })
    Object.assign(from, fromList)
    Object.assign(to, toList)
  }

  function listTotal(listId: string): number {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + toCents(i.sessionPrice) * i.quantity, 0) / 100
  }

  function listGap(listId: string): number | null {
    const list = lists.value.find(l => l.id === listId)
    if (!list || list.target == null) return null
    return (toCents(list.target) - toCents(listTotal(listId))) / 100
  }

  function listTotalDiscount(listId: string): number {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + (toCents(i.catalogPrice) - toCents(i.sessionPrice)) * i.quantity, 0) / 100
  }

  async function unarchive(archivedList: HistoryEntry): Promise<void> {
    const list: ShoppingList = {
      id: crypto.randomUUID(), name: archivedList.name, isInbox: false,
      createdAt: new Date().toISOString(), targetDate: localDateInput(historyPurchaseDate(archivedList)),
      target: archivedList.target || null, discount: archivedList.discount,
      items: archivedList.items.map(i => ({
        productId: i.productId,
        name: i.name,
        catalogPrice: i.price,
        sessionPrice: i.price,
        quantity: i.quantity,
        checked: false,
        unavailable: false
      } satisfies ListItem))
    }
    const restored = await writeTransaction(['lists', 'history'], async tx => {
      // Reading inside the transaction also prevents duplicate restores across tabs.
      const stored = archivedList.id == null ? null : await tx.objectStore('history').get(archivedList.id)
      if (!stored) return false
      await Promise.all([
        tx.objectStore('lists').put(list),
        tx.objectStore('history').delete(archivedList.id!)
      ])
      return true
    })
    if (!restored) return
    lists.value.push(list)
    sortLists(lists.value)
    await useCatalogStore().refreshPurchaseHistory()
  }

  async function archiveList(listId: string): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list || list.isInbox) return
    const entry: HistoryEntry = {
      date: new Date().toISOString(),
      targetDate: list.targetDate,
      name: list.name,
      target: list.target ?? 0,
      discount: list.discount,
      items: list.items
        .filter(i => !i.unavailable)
        .map(i => ({ productId: i.productId, name: i.name, price: i.sessionPrice, quantity: i.quantity })),
      unavailableItems: list.items
        .filter(i => i.unavailable)
        .map(i => ({ name: i.name })),
      totalSpent: listTotal(listId)
    }
    const archived = await writeTransaction(['history', 'lists'], async tx => {
      const stored = await tx.objectStore('lists').get(listId)
      if (!stored) return false
      await Promise.all([
        tx.objectStore('history').add(entry),
        tx.objectStore('lists').delete(listId)
      ])
      return true
    })
    if (!archived) return
    expandedListIds.delete(listId)
    lists.value = lists.value.filter(l => l.id !== listId)
    const catalog = useCatalogStore()
    await catalog.refreshPurchaseHistory()
  }

  return {
    lists,
    expandedListIds,
    init,
    createList,
    deleteList,
    archiveList,
    unarchive,
    updateListTarget,
    updateListTargetDate,
    updateListName,
    toggleExpand,
    isExpanded,
    addItemToList,
    removeItemFromList,
    updateItemQuantity,
    updateItemPrice,
    resetItemPrice,
    toggleChecked,
    toggleUnavailable,
    moveItem,
    listTotal,
    listGap,
    listTotalDiscount
  }
})
