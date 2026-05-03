import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { toRaw } from 'vue'
import { dbPromise } from '../db/index.ts'
import { useCatalogStore } from './catalogStore.ts'
import type { ShoppingList, ListItem, CatalogProduct, HistoryEntry } from '../types'

const INBOX_ID = 'inbox'

function defaultDiscount(target: number): number {
  if (target === 25) return 5
  if (target === 50) return 10
  return 0
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
    const stored = await (await dbPromise).getAll('lists')
    if (stored.length === 0) {
      const inbox = makeInbox()
      await putListDb(inbox)
      lists.value = [inbox]
    } else {
      lists.value = (stored as ShoppingList[]).sort((a, b) => {
        if (a.isInbox) return -1
        if (b.isInbox) return 1
        const dateDiff = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        return dateDiff !== 0 ? dateDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    }
  }

  async function createList(name: string, targetDate: string, target?: number | null, discountOverride?: number): Promise<void> {
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
    lists.value.sort((a, b) => {
      if (a.isInbox) return -1
      if (b.isInbox) return 1
      const dateDiff = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      return dateDiff !== 0 ? dateDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  async function updateListTargetDate(id: string, targetDate: string): Promise<void> {
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.targetDate = targetDate
    await putListDb(list)
    lists.value.sort((a, b) => {
      if (a.isInbox) return -1
      if (b.isInbox) return 1
      const dateDiff = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      return dateDiff !== 0 ? dateDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  async function deleteList(id: string): Promise<void> {
    if (id === INBOX_ID) return
    await (await dbPromise).delete('lists', id)
    expandedListIds.delete(id)
    lists.value = lists.value.filter(l => l.id !== id)
  }

  async function updateListTarget(id: string, target: number | null, discountOverride?: number): Promise<void> {
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
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const existing = list.items.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity++
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
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.sessionPrice = Math.max(0, newPrice)
    if (permanent) item.catalogPrice = Math.max(0, newPrice)
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
    if (!item) return
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
    const fromList = lists.value.find(l => l.id === fromListId)
    const toList = lists.value.find(l => l.id === toListId)
    if (!fromList || !toList) return
    const item = fromList.items.find(i => i.productId === productId)
    if (!item) return
    fromList.items = fromList.items.filter(i => i.productId !== productId)
    const existing = toList.items.find(i => i.productId === productId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      toList.items.push({ ...item })
    }
    await putListDb(fromList)
    await putListDb(toList)
  }

  function listTotal(listId: string): number {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + i.sessionPrice * i.quantity, 0)
  }

  function listGap(listId: string): number | null {
    const list = lists.value.find(l => l.id === listId)
    if (!list || list.target == null) return null
    return list.target - listTotal(listId)
  }

  function listTotalDiscount(listId: string): number {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + (i.catalogPrice - i.sessionPrice) * i.quantity, 0)
  }

  async function unarchive(archivedList: HistoryEntry): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    await createList(archivedList.name, today, archivedList.target || null, archivedList.discount)
    const list = lists.value[lists.value.length - 1]
    list.items = archivedList.items.map(i => ({
      productId: i.productId ?? (crypto.randomUUID() as unknown as number),
      name: i.name,
      catalogPrice: i.price,
      sessionPrice: i.price,
      quantity: i.quantity,
      checked: false,
      unavailable: false
    } satisfies ListItem))
    await putListDb(list)
  }

  async function archiveList(listId: string): Promise<void> {
    const list = lists.value.find(l => l.id === listId)
    if (!list) { console.error('archiveList: list not found', listId); return }
    const entry: HistoryEntry = {
      date: new Date().toISOString(),
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
    try {
      await (await dbPromise).add('history', entry)
    } catch (e) {
      console.error('archiveList: addHistoryEntry failed', e)
      return
    }
    const catalog = useCatalogStore()
    for (const item of entry.items) {
      await catalog.incrementPurchaseCount(item.productId)
    }
    await catalog.loadRecommendationScores()
    await deleteList(listId)
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
