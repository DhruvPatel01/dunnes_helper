import { defineStore } from 'pinia'
import { ref, reactive, computed, toRaw } from 'vue'
import { dbPromise } from '../db/index.js'

const INBOX_ID = 'inbox'

function defaultDiscount(target) {
  if (target === 25) return 5
  if (target === 50) return 10
  return 0
}

function makeInbox() {
  return { id: INBOX_ID, name: 'Inbox', isInbox: true, target: null, discount: 0, items: [], createdAt: new Date().toISOString() }
}

async function putListDb(list) {
  return (await dbPromise).put('lists', structuredClone(toRaw(list)))
}

export const useListsStore = defineStore('lists', () => {
  const lists = ref([])
  const expandedListIds = reactive(new Set())

  async function init() {
    const stored = await (await dbPromise).getAll('lists')
    if (stored.length === 0) {
      const inbox = makeInbox()
      await putListDb(inbox)
      lists.value = [inbox]
    } else {
      lists.value = stored.sort((a, b) => {
        if (a.isInbox) return -1
        if (b.isInbox) return 1
        return new Date(a.createdAt) - new Date(b.createdAt)
      })
    }
  }

  async function createList(name, target, discountOverride) {
    const disc = discountOverride !== undefined ? discountOverride : defaultDiscount(target)
    const list = {
      id: crypto.randomUUID(),
      name,
      isInbox: false,
      target: target ?? null,
      discount: disc,
      items: [],
      createdAt: new Date().toISOString()
    }
    await putListDb(list)
    lists.value.push(list)
  }

  async function deleteList(id) {
    if (id === INBOX_ID) return
    await (await dbPromise).delete('lists', id)
    expandedListIds.delete(id)
    lists.value = lists.value.filter(l => l.id !== id)
  }

  async function updateListTarget(id, target, discountOverride) {
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.target = target ?? null
    list.discount = discountOverride !== undefined ? discountOverride : defaultDiscount(target)
    await putListDb(list)
  }

  async function updateListName(id, name) {
    const list = lists.value.find(l => l.id === id)
    if (!list) return
    list.name = name
    await putListDb(list)
  }

  function toggleExpand(id) {
    if (expandedListIds.has(id)) {
      expandedListIds.delete(id)
    } else {
      expandedListIds.add(id)
    }
  }

  function isExpanded(id) {
    return expandedListIds.has(id)
  }

  async function addItemToList(listId, product) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const existing = list.items.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity++
    } else {
      list.items.push({
        productId: product.id,
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

  async function removeItemFromList(listId, productId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    list.items = list.items.filter(i => i.productId !== productId)
    await putListDb(list)
  }

  async function updateItemQuantity(listId, productId, qty) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    if (qty <= 0) {
      list.items = list.items.filter(i => i.productId !== productId)
    } else {
      item.quantity = qty
    }
    await putListDb(list)
  }

  async function applyItemDiscount(listId, productId, discountAmount) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.sessionPrice = Math.max(0, item.catalogPrice - discountAmount)
    await putListDb(list)
  }

  async function resetItemDiscount(listId, productId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.sessionPrice = item.catalogPrice
    await putListDb(list)
  }

  async function toggleChecked(listId, productId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.checked = !item.checked
    await putListDb(list)
  }

  async function toggleUnavailable(listId, productId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return
    const item = list.items.find(i => i.productId === productId)
    if (!item) return
    item.unavailable = !item.unavailable
    if (item.unavailable) item.checked = false
    await putListDb(list)
  }

  async function moveItem(productId, fromListId, toListId) {
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

  function listTotal(listId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + i.sessionPrice * i.quantity, 0)
  }

  function listGap(listId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list || list.target == null) return null
    return list.target - listTotal(listId)
  }

  function listTotalDiscount(listId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return 0
    return list.items
      .filter(i => !i.unavailable)
      .reduce((sum, i) => sum + (i.catalogPrice - i.sessionPrice) * i.quantity, 0)
  }

  async function completeList(listId) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) { console.error('completeList: list not found', listId); return }
    const entry = {
      date: new Date().toISOString(),
      target: list.target ?? 0,
      items: list.items
        .filter(i => !i.unavailable)
        .map(i => ({ name: i.name, price: i.sessionPrice, quantity: i.quantity })),
      unavailableItems: list.items
        .filter(i => i.unavailable)
        .map(i => ({ name: i.name })),
      totalSpent: listTotal(listId)
    }
    try {
      await (await dbPromise).add('history', entry)
    } catch (e) {
      console.error('completeList: addHistoryEntry failed', e)
      return
    }
    await deleteList(listId)
  }

  return {
    lists,
    expandedListIds,
    init,
    createList,
    deleteList,
    completeList,
    updateListTarget,
    updateListName,
    toggleExpand,
    isExpanded,
    addItemToList,
    removeItemFromList,
    updateItemQuantity,
    applyItemDiscount,
    resetItemDiscount,
    toggleChecked,
    toggleUnavailable,
    moveItem,
    listTotal,
    listGap,
    listTotalDiscount
  }
})
