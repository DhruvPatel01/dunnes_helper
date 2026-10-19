import type { AppBackup, CatalogProduct, HistoryEntry, ListItem, ShoppingList } from '../types'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup record')
  return value as Record<string, unknown>
}

function text(value: unknown, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error('Invalid backup text')
  return value
}

function amount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid backup amount')
  return value
}

function integer(value: unknown, min = 1): number {
  const number = amount(value)
  if (!Number.isSafeInteger(number) || number < min) throw new Error('Invalid backup number')
  return number
}

function date(value: unknown): string {
  const result = text(value)
  if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid backup date')
  return result
}

function shoppingDate(value: unknown): string {
  const result = date(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(result).toISOString().slice(0, 10) !== result) {
    throw new Error('Invalid shopping date')
  }
  return result
}

function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Missing backup data')
  return value.map(parse)
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid backup flag')
  return value
}

function uniqueIds(items: { id?: number | string }[]): void {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate backup IDs')
}

// Validate before opening a write transaction. Legacy lists and history may lack targetDate.
export function validateAppBackup(value: unknown): AppBackup {
  const data = record(value)
  if (data.version !== 1) throw new Error('Unsupported backup version')
  const catalog = array<CatalogProduct>(data.catalog, value => {
    const item = record(value)
    return {
      id: integer(item.id), name: text(item.name), category: text(item.category, true),
      price: amount(item.price), purchaseCount: integer(item.purchaseCount, 0),
      lastUpdated: date(item.lastUpdated), lastPurchasedAt: item.lastPurchasedAt == null ? null : date(item.lastPurchasedAt)
    }
  })
  const history = array<HistoryEntry>(data.history, value => {
    const entry = record(value)
    return {
      id: integer(entry.id), date: date(entry.date), name: text(entry.name, true),
      ...(entry.targetDate == null ? {} : { targetDate: entry.targetDate === '' ? '' : shoppingDate(entry.targetDate) }),
      target: amount(entry.target), discount: amount(entry.discount), totalSpent: amount(entry.totalSpent),
      items: array(entry.items, value => {
        const item = record(value)
        return { productId: integer(item.productId), name: text(item.name), price: amount(item.price), quantity: integer(item.quantity) }
      }),
      unavailableItems: array(entry.unavailableItems ?? [], value => ({ name: text(record(value).name) }))
    }
  })
  const lists = array<ShoppingList>(data.lists, value => {
    const list = record(value)
    const id = text(list.id)
    const isInbox = boolean(list.isInbox)
    if (isInbox !== (id === 'inbox')) throw new Error('Invalid inbox')
    const items = array<ListItem>(list.items, value => {
      const item = record(value)
      return {
        productId: integer(item.productId), name: text(item.name), catalogPrice: amount(item.catalogPrice),
        sessionPrice: amount(item.sessionPrice), quantity: integer(item.quantity),
        checked: boolean(item.checked), unavailable: boolean(item.unavailable)
      }
    })
    if (new Set(items.map(item => item.productId)).size !== items.length) throw new Error('Duplicate list items')
    return {
      id, name: text(list.name, true), isInbox, target: list.target == null ? null : amount(list.target),
      discount: amount(list.discount), items, createdAt: date(list.createdAt),
      targetDate: list.targetDate ? date(list.targetDate) : ''
    }
  })
  uniqueIds(catalog)
  uniqueIds(history)
  uniqueIds(lists)
  return { version: 1, exportedAt: date(data.exportedAt), catalog, history, lists }
}
