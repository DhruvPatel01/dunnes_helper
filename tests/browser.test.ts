import { createApp, h, nextTick, toRaw, type Component } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { dbPromise } from '../src/db/index.ts'
import { useListsStore } from '../src/stores/listsStore.ts'
import { useCatalogStore } from '../src/stores/catalogStore.ts'
import { parseCsv, generateCsv } from '../src/utils/csv.ts'
import { parseAppDataJson, importAppData, exportAppData } from '../src/utils/dataExport.ts'
import { computeRecommendationScores } from '../src/utils/recommendations.ts'
import { localDateInput } from '../src/utils/dates.ts'
import App from '../src/App.vue'
import ListCard from '../src/components/lists/ListCard.vue'
import ListSearchBar from '../src/components/lists/ListSearchBar.vue'
import CategoryInput from '../src/components/shared/CategoryInput.vue'
import CatalogItem from '../src/components/catalog/CatalogItem.vue'
import CatalogList from '../src/components/catalog/CatalogList.vue'
import HistoryView from '../src/views/HistoryView.vue'
import CsvImportModal from '../src/components/catalog/CsvImportModal.vue'
import type { AppBackup, CatalogProduct, HistoryEntry } from '../src/types'

declare global {
  interface Window { __testResults: Promise<Result[]>; __backup: AppBackup | null }
}
interface Result { name: string; passed: boolean; error?: string }
const tests: { name: string; run: () => Promise<void> | void }[] = []
const test = (name: string, run: () => Promise<void> | void) => tests.push({ name, run })
const equal = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message) }
async function rejects(action: () => unknown) {
  try { await action() } catch { return }
  throw new Error('Expected the operation to fail')
}
async function until(condition: () => unknown) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (condition()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for UI')
}
const cleanup: (() => void)[] = []
const unhandled: string[] = []
window.addEventListener('unhandledrejection', event => {
  unhandled.push(String(event.reason))
  event.preventDefault()
})
window.addEventListener('error', event => unhandled.push(event.message))
let pinia = createPinia()
let lists: ReturnType<typeof useListsStore>
let catalog: ReturnType<typeof useCatalogStore>
let db: Awaited<typeof dbPromise>
async function reset() {
  for (const unmount of cleanup.splice(0)) unmount()
  const tx = db.transaction(['catalog', 'history', 'lists'], 'readwrite')
  await Promise.all(['catalog', 'history', 'lists'].map(store => tx.objectStore(store).clear()))
  await tx.done
  localStorage.clear()
  window.location.hash = ''
  pinia = createPinia()
  setActivePinia(pinia)
  lists = useListsStore()
  catalog = useCatalogStore()
  await lists.init()
}
function mount(component: Component, props: Record<string, unknown> = {}) {
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(component, props) })
  app.use(pinia)
  app.mount(root)
  cleanup.push(() => { app.unmount(); root.remove() })
  return root
}
function click(text: string, root: ParentNode = document) {
  const button = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === text ||
    [...button.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim() === text)
  assert(button, `Missing button: ${text}`)
  button!.click()
}
function setInput(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const product = (name = 'Milk', price = 3.25) => catalog.addProduct(name, 'Groceries', price)
async function addHistory(overrides: Partial<HistoryEntry> = {}): Promise<HistoryEntry> {
  const entry: HistoryEntry = { date: '2026-10-12T12:00:00.000Z', name: 'Weekly shop', target: 25, discount: 5,
    totalSpent: 25, items: [], unavailableItems: [], ...overrides }
  const id = await db.add('history', entry)
  return { ...entry, id: id as number }
}
const snapshot = async () => Promise.all(['catalog', 'history', 'lists'].map(store => db.getAll(store)))
async function abortWrite(storeName: string, method: 'put' | 'add', action: () => Promise<unknown>) {
  const original = IDBObjectStore.prototype[method]
  IDBObjectStore.prototype[method] = function (...args: unknown[]) {
    const request = original.apply(this, args as [unknown, IDBValidKey])
    if (this.name === storeName) request.addEventListener('success', () => request.transaction!.abort())
    return request
  }
  try { await rejects(action) } finally { IDBObjectStore.prototype[method] = original }
}
const backup = (): AppBackup => ({ version: 1, exportedAt: '2026-10-19T12:00:00.000Z', catalog: [], history: [], lists: [] })

test('basket totals, savings, and the €25 gap use exact cents', async () => {
  const list = await lists.createList('Shop', '2026-10-19', 25)
  const one = await product('One', .1), two = await product('Two', .2)
  await lists.addItemToList(list.id, one)
  await lists.addItemToList(list.id, two)
  equal(lists.listTotal(list.id), .3)
  const rest = await product('Rest', 24.7)
  await lists.addItemToList(list.id, rest)
  equal(lists.listTotal(list.id), 25)
  equal(lists.listGap(list.id), 0)
  await lists.updateItemPrice(list.id, one.id!, 0)
  await lists.updateItemPrice(list.id, two.id!, 0)
  equal(lists.listTotalDiscount(list.id), .3)
  equal(lists.listGap(list.id), .3)
})

test('voucher defaults follow €5 per €25 and preserve explicit overrides', async () => {
  for (const [target, discount] of [[25, 5], [50, 10], [75, 15], [26, 5]]) {
    const list = await lists.createList('Shop', '', target)
    equal(list.discount, discount)
  }
  equal((await lists.createList('No voucher', '', 25, 0)).discount, 0)
})

test('invalid prices, quantities, and targets cannot corrupt a basket', async () => {
  const item = await product()
  const list = await lists.createList('Shop', '', 25)
  await lists.addItemToList(list.id, item)
  await lists.updateItemPrice(list.id, item.id!, NaN)
  await lists.updateItemPrice(list.id, item.id!, Infinity)
  await lists.updateItemQuantity(list.id, item.id!, NaN)
  await lists.updateItemQuantity(list.id, item.id!, 1.5)
  equal(lists.listTotal(list.id), 3.25)
  await rejects(() => lists.updateListTarget(list.id, -25))
  await rejects(() => catalog.addProduct('Invalid', '', Infinity))
  await rejects(() => lists.createList('Invalid', '', 25, -5))
})

test('unavailable items are excluded and re-adding makes them available', async () => {
  const item = await product()
  await lists.addItemToList('inbox', item)
  await lists.toggleChecked('inbox', item.id!)
  await lists.toggleUnavailable('inbox', item.id!)
  await lists.toggleChecked('inbox', item.id!)
  equal(lists.listTotal('inbox'), 0)
  equal(lists.lists[0].items[0].checked, false)
  await lists.addItemToList('inbox', item)
  equal(lists.listTotal('inbox'), 6.5)
})

test('permanent price edits update the catalog and the list consistently', async () => {
  const item = await product()
  await lists.addItemToList('inbox', item)
  await lists.updateItemPrice('inbox', item.id!, 3.999, true)
  equal(catalog.items[0].price, 4)
  equal((await db.get('catalog', item.id!)).price, 4)
  equal(lists.lists[0].items[0].catalogPrice, 4)
  equal(lists.listTotal('inbox'), 4)
})

test('moving items merges quantities and ignores a move to the same list', async () => {
  const item = await product(), list = await lists.createList('Shop', '', 25)
  await lists.addItemToList('inbox', item)
  await lists.addItemToList(list.id, item)
  await lists.moveItem(item.id!, 'inbox', list.id)
  equal(lists.listTotal('inbox'), 0)
  equal(lists.listTotal(list.id), 6.5)
  await lists.moveItem(item.id!, list.id, list.id)
  equal(lists.listTotal(list.id), 6.5)
  equal((await db.get('lists', list.id)).items[0].quantity, 2)
})

test('an interrupted item move leaves both lists unchanged', async () => {
  const item = await product(), list = await lists.createList('Shop', '', 25)
  await lists.addItemToList('inbox', item)
  const before = await snapshot()
  await abortWrite('lists', 'put', () => lists.moveItem(item.id!, 'inbox', list.id))
  equal(await snapshot(), before)
  equal(lists.listTotal('inbox'), 3.25)
  equal(lists.listTotal(list.id), 0)
})

test('archiving excludes unavailable items and prevents duplicate archives', async () => {
  const milk = await product(), bread = await product('Bread', 1.5)
  const list = await lists.createList('Shop', '', 25)
  await lists.addItemToList(list.id, milk)
  await lists.addItemToList(list.id, bread)
  await lists.toggleUnavailable(list.id, bread.id!)
  await Promise.all([lists.archiveList(list.id), lists.archiveList(list.id)])
  const history = await db.getAll('history')
  equal(history.length, 1)
  equal(history[0].totalSpent, 3.25)
  equal(history[0].items.length, 1)
  equal(history[0].unavailableItems, [{ name: 'Bread' }])
  equal(await db.get('lists', list.id), undefined)
  equal(catalog.items.find(item => item.id === milk.id)!.purchaseCount, 1)
  equal(catalog.items.find(item => item.id === bread.id)!.purchaseCount, 0)
})

test('an interrupted archive preserves the active list and history', async () => {
  const list = await lists.createList('Shop', '', 25)
  await lists.addItemToList(list.id, await product())
  const before = await snapshot()
  await abortWrite('history', 'add', () => lists.archiveList(list.id))
  equal(await snapshot(), before)
  assert(lists.lists.some(item => item.id === list.id))
})

test('archiving and restoring preserve the shopping date separately from the archive timestamp', async () => {
  const item = await product(), list = await lists.createList('September shop', '2026-09-20', 25)
  await lists.addItemToList(list.id, item)
  const beforeArchive = Date.now()
  await lists.archiveList(list.id)
  const [entry] = await db.getAll('history') as HistoryEntry[]
  equal(entry.targetDate, '2026-09-20')
  assert(Date.parse(entry.date) >= beforeArchive)
  equal(localDateInput(new Date(catalog.items[0].lastPurchasedAt!)), '2026-09-20')
  await lists.unarchive(entry)
  const restored = lists.lists.find(list => list.name === entry.name)!
  equal(restored.targetDate, '2026-09-20')
  await lists.archiveList(restored.id)
  equal((await db.getAll('history'))[0].targetDate, '2026-09-20')
})

test('restoring history preserves future lists and restores the correct items once', async () => {
  const item = await product()
  const future = await lists.createList('Next Christmas', '2099-12-25', 50)
  await lists.addItemToList(future.id, await product('Bread', 2))
  const entry = await addHistory({ items: [{ productId: item.id!, name: item.name, price: item.price, quantity: 2 }] })
  await catalog.refreshPurchaseHistory()
  await Promise.all([lists.unarchive(entry), lists.unarchive(entry)])
  equal(lists.lists.find(list => list.id === future.id)!.items[0].name, 'Bread')
  const restored = lists.lists.filter(list => list.name === entry.name)
  equal(restored.length, 1)
  equal(restored[0].items[0].name, 'Milk')
  equal(restored[0].items[0].quantity, 2)
  equal(restored[0].targetDate, localDateInput(new Date(entry.date)))
  equal(await db.getAll('history'), [])
  equal(catalog.items.find(product => product.id === item.id)!.purchaseCount, 0)
})

test('an interrupted restore retains history without creating a partial list', async () => {
  const entry = await addHistory()
  const before = await snapshot()
  await abortWrite('lists', 'put', () => lists.unarchive(entry))
  equal(await snapshot(), before)
  equal(lists.lists.length, 1)
})

test('initializing legacy lists recreates the inbox and sorts undated lists', async () => {
  await db.clear('lists')
  await db.put('lists', { id: 'old', isInbox: false, name: 'Old', target: 25, discount: 5, items: [], createdAt: '2026-01-01T00:00:00.000Z' })
  await db.put('lists', { id: 'future', isInbox: false, name: 'Future', target: 25, discount: 5, items: [], createdAt: '2025-01-01T00:00:00.000Z', targetDate: '2027-01-01' })
  await lists.init()
  equal(lists.lists.map(list => list.id), ['inbox', 'old', 'future'])
  equal(lists.lists[1].targetDate, '')
})

test('malformed backups are rejected before replacing any saved data', async () => {
  await product()
  const before = await snapshot()
  for (const value of [null, {}, { ...backup(), version: 2 }, { ...backup(), history: null },
    { ...backup(), catalog: [{ id: 1, name: 'Invalid', price: -1 }] }]) {
    await rejects(() => importAppData(value as AppBackup))
    await rejects(() => parseAppDataJson(JSON.stringify(value)))
    equal(await snapshot(), before)
  }
})

test('backup restore rolls all stores back if a write fails', async () => {
  await product()
  await addHistory()
  const before = await snapshot()
  const data = backup()
  data.catalog = structuredClone(toRaw(catalog.items))
  data.catalog[0].name = 'Changed'
  await abortWrite('catalog', 'put', () => importAppData(data))
  equal(await snapshot(), before)
})

test('backup validation accepts legacy targetDate and rejects duplicate IDs', async () => {
  const data = backup()
  data.lists = structuredClone(toRaw(lists.lists))
  delete (data.lists[0] as Partial<typeof data.lists[0]>).targetDate
  equal(parseAppDataJson(JSON.stringify(data)).lists[0].targetDate, '')
  data.lists.push(data.lists[0])
  await rejects(() => parseAppDataJson(JSON.stringify(data)))
})

test('JSON export contains the saved catalog, history, and lists', async () => {
  await product()
  const entry = await addHistory({ targetDate: '2026-10-05' })
  let blob: Blob | undefined
  const originalUrl = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click
  URL.createObjectURL = value => { blob = value as Blob; return 'blob:test' }
  HTMLAnchorElement.prototype.click = () => {}
  try { await exportAppData() } finally {
    URL.createObjectURL = originalUrl
    HTMLAnchorElement.prototype.click = originalClick
  }
  const exported = parseAppDataJson(await blob!.text())
  equal(exported.catalog.length, 1)
  equal(exported.history.length, 1)
  equal(exported.lists.length, 1)
  equal(exported.history[0].targetDate, '2026-10-05')
  equal(exported.history[0].date, entry.date)
  await importAppData(exported)
  equal((await db.get('history', entry.id!)).targetDate, '2026-10-05')
  equal((await db.get('history', entry.id!)).date, entry.date)
})

test('history backups support missing shopping dates and reject invalid supplied dates before writes', async () => {
  const data = backup()
  data.history = [await addHistory(), await addHistory({ targetDate: '' })]
  const parsed = parseAppDataJson(JSON.stringify(data))
  equal(parsed.history[0].targetDate, undefined)
  equal(parsed.history[1].targetDate, '')
  const before = await snapshot()
  for (const targetDate of ['invalid', '2026-02-30', '2026-10-05T12:00:00Z', 123]) {
    const invalid = { ...data, history: [{ ...data.history[0], targetDate }] }
    await rejects(() => importAppData(invalid as AppBackup))
    equal(await snapshot(), before)
  }
})

test('catalog replacement retains matching IDs, history, and list references', async () => {
  const item = await product()
  await lists.addItemToList('inbox', item)
  await addHistory({ items: [{ productId: item.id!, name: item.name, price: item.price, quantity: 1 }] })
  await catalog.refreshPurchaseHistory()
  await catalog.replaceAll([{ ...item, name: ' milk ', price: 4 }])
  equal(catalog.items[0].id, item.id)
  equal(catalog.items[0].purchaseCount, 1)
  equal(catalog.items[0].price, 4)
  equal((await db.get('lists', 'inbox')).items[0].productId, item.id)
  equal((await db.getAll('history')).length, 1)
})

test('an interrupted catalog replacement preserves the old catalog', async () => {
  const item = await product()
  const before = await snapshot()
  await abortWrite('catalog', 'put', () => catalog.replaceAll([{ ...item, price: 4 }]))
  equal(await snapshot(), before)
  equal(catalog.items[0].price, 3.25)
})

test('synchronous write failures roll back earlier writes in the transaction', async () => {
  const item = await product()
  const before = await snapshot()
  const original = IDBObjectStore.prototype.add
  IDBObjectStore.prototype.add = function () { throw new DOMException('Injected write failure', 'DataCloneError') }
  try {
    await rejects(() => catalog.replaceAll([{ ...item, name: 'New product' }]))
  } finally { IDBObjectStore.prototype.add = original }
  equal(await snapshot(), before)
  equal(catalog.items[0].id, item.id)
})

test('purchase counts and last purchase dates follow edited and deleted history', async () => {
  const item = await product()
  const line = { productId: item.id!, name: item.name, price: item.price, quantity: 2 }
  const first = await addHistory({ date: '2026-10-05T12:00:00.000Z', items: [line] })
  const second = await addHistory({ items: [line, line] })
  await catalog.refreshPurchaseHistory()
  equal(catalog.items[0].purchaseCount, 2)
  equal(catalog.items[0].lastPurchasedAt, second.date)
  first.date = '2026-10-18T12:00:00.000Z'
  await db.put('history', first)
  await catalog.refreshPurchaseHistory()
  equal(catalog.items[0].lastPurchasedAt, first.date)
  await db.delete('history', first.id!)
  await db.delete('history', second.id!)
  await catalog.refreshPurchaseHistory()
  equal(catalog.items[0].purchaseCount, 0)
  equal(catalog.items[0].lastPurchasedAt, null)
  equal(catalog.recommendationScores.size, 0)
})

test('recommendations count each product once per shopping day regardless of quantity or duplicate archives', async () => {
  const item = { productId: 1, name: 'Milk', price: 3.25, quantity: 1 }
  const entries = [await addHistory({ date: '2026-10-05T12:00:00Z', items: [item] }),
    await addHistory({ date: '2026-10-12T12:00:00Z', items: [item] }),
    await addHistory({ date: '2026-10-12T13:00:00Z', items: [item, item] })]
  equal(computeRecommendationScores(entries).get(1), 1)
  equal([...computeRecommendationScores(entries)], [...computeRecommendationScores(entries.slice(0, 2))])
})

test('purchase statistics use shopping dates and fall back to legacy archive dates', async () => {
  const item = await product()
  const line = { productId: item.id!, name: item.name, price: item.price, quantity: 1 }
  const delayed = await addHistory({ date: '2026-10-20T12:00:00.000Z', targetDate: '2026-10-05', items: [line] })
  const legacy = await addHistory({ date: '2026-10-12T12:00:00.000Z', items: [line] })
  await catalog.refreshPurchaseHistory()
  equal(catalog.items[0].purchaseCount, 2)
  equal(catalog.items[0].lastPurchasedAt, legacy.date)
  delayed.targetDate = '2026-10-18'
  await db.put('history', delayed)
  await catalog.refreshPurchaseHistory()
  equal(localDateInput(new Date(catalog.items[0].lastPurchasedAt!)), '2026-10-18')
})

test('recommendations use distinct shopping days even when lists are archived together or later', async () => {
  const older = { productId: 1, name: 'Old habit', price: 3.25, quantity: 1 }
  const newer = { productId: 2, name: 'New habit', price: 3.25, quantity: 1 }
  const entries = [await addHistory({ date: '2026-10-20T12:00:00Z', targetDate: '2026-10-05', items: [older] }),
    await addHistory({ date: '2026-10-19T12:00:00Z', targetDate: '2026-10-12', items: [newer] }),
    await addHistory({ date: '2026-10-20T12:00:00Z', targetDate: '2026-10-12', items: [newer] }),
    await addHistory({ date: '2026-10-05T13:00:00Z', targetDate: '', items: [older] }),
    await addHistory({ date: '2026-10-05T14:00:00Z', items: [older] })]
  const scores = computeRecommendationScores(entries)
  assert(scores.get(2)! > scores.get(1)!, 'Shopping dates must override archive order')
  equal([...scores], [...computeRecommendationScores(entries.slice(0, 2))])
})

test('purchase contributions halve every four newer shopping visits', async () => {
  const entries: HistoryEntry[] = []
  for (let index = 0; index < 9; index++) {
    const items = [{ productId: 4, name: 'Every shop', price: 1, quantity: 1 }]
    if (index % 4 === 0) items.push({ productId: 3 - index / 4, name: 'Occasional', price: 1, quantity: 1 })
    entries.push(await addHistory({ date: new Date(Date.UTC(2026, 0, 1 + index * 7)).toISOString(), items }))
  }
  const scores = computeRecommendationScores(entries)
  equal(scores.get(4), 1)
  equal(scores.get(2), scores.get(1)! / 2)
  equal(scores.get(3), scores.get(1)! / 4)
  equal([...scores], [...computeRecommendationScores([...entries].reverse())])
})

test('recommendations adapt to new habits even when an old item has more lifetime purchases', async () => {
  const oldHabit = await product('Old habit'), newHabit = await product('New habit'), staple = await product('Staple')
  await product('Unpurchased')
  for (let index = 0; index < 12; index++) {
    const products = [staple, ...(index < 6 ? [oldHabit] : index >= 9 ? [newHabit] : [])]
    await addHistory({ date: new Date(Date.UTC(2026, 0, 1 + index * 7)).toISOString(),
      items: products.map(item => ({ productId: item.id!, name: item.name, price: item.price, quantity: 1 })) })
  }
  await catalog.refreshPurchaseHistory()
  equal(catalog.items.find(item => item.id === oldHabit.id)!.purchaseCount, 6)
  equal(catalog.items.find(item => item.id === newHabit.id)!.purchaseCount, 3)
  assert(catalog.recommendationScores.get(newHabit.id!)! > catalog.recommendationScores.get(oldHabit.id!)!)
  const root = mount(ListSearchBar, { listId: 'inbox' })
  root.querySelector('input')!.focus()
  await nextTick()
  equal([...root.querySelectorAll('.item-name')].map(item => item.textContent), ['Staple', 'New habit', 'Old habit', 'Unpurchased'])
})

test('recommendations learn from a single purchase and change with visits rather than calendar gaps', async () => {
  equal([...computeRecommendationScores([])], [])
  const item = { productId: 1, name: 'Milk', price: 3.25, quantity: 1 }
  const first = await addHistory({ date: '2026-01-01T12:00:00Z', items: [item] })
  equal(computeRecommendationScores([first]).get(1), 1)
  const next = await addHistory({ date: '2026-01-08T12:00:00Z', items: [{ ...item, productId: 2 }] })
  const scores = [...computeRecommendationScores([first, next])]
  equal(scores, [...computeRecommendationScores([first, { ...next, date: '2026-10-01T12:00:00Z' }])])
  const invalid = { ...first, date: 'invalid', items: [{ ...item, productId: 3 }] }
  equal(scores, [...computeRecommendationScores([first, next, invalid])])
  const unavailable = await addHistory({ date: '2026-10-02T12:00:00Z', unavailableItems: [{ name: 'Milk' }] })
  const afterMissedVisit = computeRecommendationScores([first, next, unavailable])
  assert(afterMissedVisit.get(1)! < computeRecommendationScores([first, next]).get(1)!)
})

test('History displays and edits shopping dates without overwriting archive timestamps', async () => {
  const delayed = await addHistory({ name: 'Delayed shop', date: '2026-10-20T12:00:00.000Z', targetDate: '2026-10-05' })
  const legacy = await addHistory({ name: 'Legacy shop', date: '2026-10-12T12:00:00.000Z' })
  const root = mount(HistoryView)
  await until(() => root.querySelectorAll('p.font-semibold').length === 2)
  const headings = () => [...root.querySelectorAll('p.font-semibold')]
  assert(headings()[0].textContent!.includes(legacy.name))
  assert(headings()[1].textContent!.includes('5 Oct 2026'))
  headings()[1].querySelector('button')!.click()
  await nextTick()
  const input = root.querySelector<HTMLInputElement>('input[type="date"]')!
  equal(input.value, '2026-10-05')
  setInput(input, '2026-10-18')
  await until(() => !root.querySelector('input[type="date"]'))
  const saved = await db.get('history', delayed.id!)
  equal(saved.date, delayed.date)
  equal(saved.targetDate, '2026-10-18')
  assert(headings()[0].textContent!.includes(delayed.name))
  headings()[1].querySelector('button')!.click()
  await nextTick()
  const legacyInput = root.querySelector<HTMLInputElement>('input[type="date"]')!
  equal(legacyInput.value, '2026-10-12')
  setInput(legacyInput, '2026-10-10')
  await until(() => !root.querySelector('input[type="date"]'))
  const savedLegacy = await db.get('history', legacy.id!)
  equal(savedLegacy.date, legacy.date)
  equal(savedLegacy.targetDate, '2026-10-10')
})

test('CSV round trips commas, quotes, and multiline names', () => {
  const items = [{ name: 'Milk, "large"\ncarton', category: 'Dairy\rFresh', price: 3.25 }]
  equal(parseCsv(generateCsv(items)), [{ name: items[0].name, category: items[0].category, price: '3.25' }])
  equal(parseCsv('\uFEFFname,price\r\nMilk,3.25\r\n'), [{ name: 'Milk', price: '3.25', category: '' }])
})

test('CSV rejects malformed prices, duplicate names, and unmatched quotes', async () => {
  for (const text of ['name,price\nMilk,NaN', 'name,price\nMilk,Infinity', 'name,price\nMilk,-1',
    'name,price\nMilk,3EUR', 'name,price\nMilk,3\nmilk,4', 'name,price\n"Milk,3', 'name,price\nMilk,3,extra']) {
    await rejects(() => parseCsv(text))
  }
})

test('local shopping dates remain correct around Irish midnight', () => {
  equal(localDateInput(new Date('2026-06-01T23:30:00Z')), '2026-06-02')
})

test('corrupt local preferences do not prevent app startup', async () => {
  localStorage.setItem('dunnes-session', '{broken')
  localStorage.setItem('dunnes-last-unavailable', '{broken')
  pinia = createPinia()
  setActivePinia(pinia)
  lists = useListsStore()
  catalog = useCatalogStore()
  let initialized = false
  const init = lists.init
  lists.init = async () => { await init(); initialized = true }
  const root = mount(App)
  await until(() => root.querySelector('h1')?.textContent === 'Lists')
  await until(() => initialized)
})

test('invalid saved tabs fall back to Lists', async () => {
  localStorage.setItem('dunnes-session', JSON.stringify({ currentView: 'unknown' }))
  let initialized = false
  const init = lists.init
  lists.init = async () => { await init(); initialized = true }
  const root = mount(App)
  await until(() => root.querySelector('h1')?.textContent === 'Lists')
  await until(() => initialized)
})

test('target status displays an exact target and small overspends correctly', async () => {
  const item = await product('Basket', 25), list = await lists.createList('Shop', '', 25)
  await lists.addItemToList(list.id, item)
  lists.toggleExpand(list.id)
  const root = mount(ListCard, { list: lists.lists.find(item => item.id === list.id) })
  assert(root.textContent!.includes('Target reached'))
  assert(!root.textContent!.includes('0.00 over'))
  await lists.updateItemPrice(list.id, item.id!, 25.06)
  await nextTick()
  equal(root.querySelector('.text-amber-500')?.textContent?.trim(), '€0.06 over')
})

test('editing €25 to €50 updates the default voucher and can clear the date', async () => {
  const list = await lists.createList('Shop', '2026-10-19', 25)
  lists.toggleExpand(list.id)
  const root = mount(ListCard, { list: lists.lists.find(item => item.id === list.id) })
  click('edit target', root)
  await nextTick()
  const inputs = root.querySelectorAll<HTMLInputElement>('input')
  setInput(inputs[1], '50') // Search is the first input.
  await nextTick()
  equal(inputs[2].value, '10')
  setInput(root.querySelector<HTMLInputElement>('input[type=date]')!, '')
  click('Save', root)
  await until(() => !root.textContent!.includes('Save'))
  equal((await db.get('lists', list.id)).targetDate, '')
  equal((await db.get('lists', list.id)).discount, 10)
})

test('canceling target edits preserves a custom voucher on reopening', async () => {
  const list = await lists.createList('Shop', '', 50, 5)
  lists.toggleExpand(list.id)
  const root = mount(ListCard, { list: lists.lists.find(item => item.id === list.id) })
  click('edit target', root)
  await nextTick()
  setInput(root.querySelectorAll<HTMLInputElement>('input')[1], '25')
  await nextTick()
  click('cancel', root)
  await nextTick()
  click('edit target', root)
  await nextTick()
  equal(root.querySelectorAll<HTMLInputElement>('input')[2].value, '5')
})

test('CSV add honors the reviewed conflicts as new products are inserted', async () => {
  const existing = await product()
  let message = ''
  mount(CsvImportModal, { modelValue: true, data: { incoming: [
    { ...existing, price: 4 }, { ...existing, id: undefined, name: 'Bread', price: 2 }
  ] }, onDone: (value: string) => { message = value } })
  click('Add to catalog')
  await nextTick()
  click('Skip')
  await nextTick()
  click('Confirm Import')
  await until(() => message)
  equal(message, '1 added, 1 skipped.')
  equal(catalog.items.length, 2)
  equal(catalog.items.find(item => item.id === existing.id)!.price, 3.25)
})

test('product search matches typos, prefixes, reordered words, categories, and accents', async () => {
  await catalog.addProduct('Chicken Breast', 'Meat', 4)
  await catalog.addProduct('Chicken Thighs', 'Meat', 3)
  await catalog.addProduct('Oat Milk', 'Dairy alternatives', 2)
  await catalog.addProduct('Whole Milk', 'Dairy', 2)
  await catalog.addProduct('Café Blend', 'Coffee', 5)
  const names = (query: string) => catalog.searchProducts(query).map(item => item.name)
  equal([...names('chiken')].sort(), ['Chicken Breast', 'Chicken Thighs'])
  equal(names('chick bre'), ['Chicken Breast'])
  equal(names('milk oat'), ['Oat Milk'])
  equal(names('  MILK   oat  '), ['Oat Milk'])
  equal(names('cafe'), ['Café Blend'])
  equal(names('alternatives oat'), ['Oat Milk'])
  equal(names('chicken milk'), [])
  equal(names('mlk'), []) // Short queries use prefixes without typo expansion.
  equal(names('zzzzzzzz'), [])
  equal(names('!!!'), [])
})

test('search relevance beats recommendations while empty queries and equal matches keep existing ordering', async () => {
  const milk = await product('Milk'), milkshake = await product('Milkshake'), silk = await product('Silk')
  const first = await product('Oat Milk'), second = await product('Oat Milk')
  catalog.recommendationScores = new Map([[silk.id!, 1], [milkshake.id!, .9], [second.id!, .8]])
  await catalog.updateProduct(silk.id!, { purchaseCount: 100 })
  await catalog.updateProduct(milkshake.id!, { purchaseCount: 90 })
  await catalog.updateProduct(second.id!, { purchaseCount: 80 })
  const root = mount(ListSearchBar, { listId: 'inbox' })
  const input = root.querySelector('input')!
  const names = () => [...root.querySelectorAll('.item-name')].map(item => item.textContent)
  input.focus()
  await nextTick()
  equal(names(), ['Silk', 'Milkshake', 'Oat Milk', 'Milk', 'Oat Milk'])
  setInput(input, 'milk')
  await nextTick()
  equal(names()[0], milk.name)
  assert(names().includes('Silk'), 'A four-letter query should tolerate one typo')
  equal(catalog.searchProducts('milk')[0].id, milk.id)
  const duplicates = catalog.searchProducts('oat milk', (a, b) => b.purchaseCount - a.purchaseCount)
  equal(duplicates.map(item => item.id), [second.id, first.id])
  catalog.searchQuery = 'milk'
  equal(catalog.sortedItems[0].id, milk.id)
  setInput(input, '  ')
  await nextTick()
  equal(names(), ['Silk', 'Milkshake', 'Oat Milk', 'Milk', 'Oat Milk'])
})

test('both product search boxes show fuzzy matches and the list can add a match using Enter', async () => {
  const chicken = await product('Chicken Breast')
  await product('Oat Milk')
  await product('Bread')
  const listRoot = mount(ListSearchBar, { listId: 'inbox' })
  const catalogRoot = mount(CatalogList)
  const listInput = listRoot.querySelector('input')!
  const catalogInput = catalogRoot.querySelector('input')!
  listInput.focus()
  for (const query of ['chiken', 'chick bre', 'milk oat', 'zzzzzzzz', '']) {
    setInput(listInput, query)
    setInput(catalogInput, query)
    await nextTick()
    const names = [...listRoot.querySelectorAll('.item-name')].map(item => item.textContent)
    equal([...catalogRoot.querySelectorAll('.list-row')].map(row => row.querySelector('p')!.textContent), names)
    if (query === 'zzzzzzzz') {
      assert(listRoot.textContent!.includes('+ Create "zzzzzzzz" in catalog'))
      assert(catalogRoot.textContent!.includes('No products match your search.'))
    }
  }
  setInput(listInput, 'chiken')
  await nextTick()
  key(listInput, 'Enter')
  await until(() => lists.lists[0].items.length === 1)
  equal(lists.lists[0].items[0].productId, chicken.id)
  equal(listInput.value, '')
})

test('product search stays current after edits, additions, deletions, replacement, and reload', async () => {
  const names = (query: string) => catalog.searchProducts(query).map(item => item.name)
  equal(names('milk'), [])
  const milk = await product('Milk')
  equal(names('milk'), ['Milk'])
  await catalog.updateProduct(milk.id!, { name: 'Oat Drink', category: 'Plant based', price: 4 })
  equal(names('milk'), [])
  equal(names('drink plant'), ['Oat Drink'])
  equal(catalog.searchProducts('oat')[0].price, 4)
  await catalog.updateProduct(milk.id!, { category: 'Beverages' })
  equal(names('plant'), [])
  equal(names('beverages'), ['Oat Drink'])
  const bread = await product('Bread')
  equal(names('bread'), ['Bread'])
  await catalog.deleteProduct(bread.id!)
  equal(names('bread'), [])
  await catalog.replaceAll([{ name: 'Coffee', category: 'Drinks', price: 5, purchaseCount: 0,
    lastUpdated: new Date().toISOString(), lastPurchasedAt: null }])
  equal(names('oat'), [])
  equal(names('cofee'), ['Coffee'])
  const saved = catalog.items[0]
  await db.put('catalog', { ...toRaw(saved), name: 'Tea' })
  await catalog.loadFromDb()
  equal(names('coffee'), [])
  equal(names('tea'), ['Tea'])
})

test('search supports Enter, arrow selection, and keyboard activation of quantity buttons', async () => {
  await product('Milk', 3.25)
  await product('Bread', 2)
  const root = mount(ListSearchBar, { listId: 'inbox' })
  const input = root.querySelector('input')!
  input.focus()
  setInput(input, 'Milk')
  await nextTick()
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await until(() => lists.lists[0].items.length === 1)
  await nextTick()
  click('+', root)
  await until(() => lists.lists[0].items.length === 2 || lists.lists[0].items[0].quantity === 2)
  setInput(input, '')
  await nextTick()
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await until(() => lists.lists[0].items.reduce((sum, item) => sum + item.quantity, 0) === 3)
})

function key(input: HTMLInputElement, value: string): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))
}
const categoryOptions = (root: ParentNode) => [...root.querySelectorAll('[role="option"]')].map(option => option.textContent)
async function createItemForm(name: string) {
  const root = mount(ListSearchBar, { listId: 'inbox' })
  setInput(root.querySelector('input')!, name)
  await nextTick()
  click(`+ Create "${name}" in catalog`, root)
  await nextTick()
  setInput(root.querySelector('input[type="number"]')!, '2.50')
  return { root, category: root.querySelector<HTMLInputElement>('[role="combobox"]')! }
}

test('category dropdown lists unique trimmed names and filters without choosing a category', async () => {
  await catalog.addProduct('Milk', 'Dairy', 3)
  await catalog.addProduct('Bread', 'Bread', 2)
  const duplicate = await catalog.addProduct('Cheese', 'Other', 2)
  const blank = await catalog.addProduct('Uncategorised', '', 2)
  // Legacy categories can have inconsistent spelling and whitespace.
  catalog.items.find(item => item.id === duplicate.id)!.category = ' dairy '
  catalog.items.find(item => item.id === blank.id)!.category = '   '
  const { root, category } = await createItemForm('New item')
  category.focus()
  await nextTick()
  equal(categoryOptions(root), ['Bread', 'Dairy'])
  equal(category.getAttribute('aria-expanded'), 'true')
  equal(category.value, '')
  setInput(category, 'AI')
  await nextTick()
  equal(categoryOptions(root), ['Dairy'])
  equal(category.getAttribute('aria-activedescendant'), null)
  setInput(category, 'New category')
  await nextTick()
  equal(categoryOptions(root), [])
  assert(root.textContent!.includes('No matching categories'))
  equal(category.value, 'New category')
})

test('category keyboard selection does not submit and a second Enter creates the item', async () => {
  await catalog.addProduct('Milk', 'Dairy', 3)
  await catalog.addProduct('Bread', 'Bread', 2)
  const { root, category } = await createItemForm('Yogurt')
  category.focus()
  await nextTick()
  key(category, 'ArrowDown')
  key(category, 'ArrowDown')
  key(category, 'ArrowUp')
  await nextTick()
  equal(root.querySelector('[aria-selected="true"]')!.textContent, 'Bread')
  const activeId = category.getAttribute('aria-activedescendant')
  equal(root.querySelector('[aria-selected="true"]')!.id, activeId)
  key(category, 'ArrowDown')
  key(category, 'Enter')
  await nextTick()
  equal(category.value, 'Dairy')
  equal(category.getAttribute('aria-expanded'), 'false')
  equal(catalog.items.length, 2)
  equal(lists.lists[0].items.length, 0)
  key(category, 'Enter')
  await until(() => lists.lists[0].items.length === 1)
  const saved = catalog.items.find(item => item.name === 'Yogurt')!
  equal(saved.category, 'Dairy')
  equal((await db.get('catalog', saved.id!))!.category, 'Dairy')
})

test('category pointer selection retains focus and Tab or outside focus dismisses without selecting', async () => {
  await catalog.addProduct('Milk', 'Dairy', 3)
  const { root, category } = await createItemForm('Yogurt')
  category.focus()
  await nextTick()
  const option = root.querySelector<HTMLElement>('[role="option"]')!
  const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  option.dispatchEvent(press)
  assert(press.defaultPrevented, 'Pointer selection must not blur the input before click')
  option.click()
  await nextTick()
  equal(category.value, 'Dairy')
  assert(document.activeElement === category, 'Pointer selection should retain category focus')
  equal(catalog.items.length, 1)
  setInput(category, 'New')
  await nextTick()
  key(category, 'Tab')
  await nextTick()
  equal(category.getAttribute('aria-expanded'), 'false')
  equal(category.value, 'New')
  category.blur()
  category.focus()
  await nextTick()
  equal(categoryOptions(root), ['Dairy'])
  key(category, 'ArrowDown')
  root.querySelector<HTMLInputElement>('input[type="number"]')!.focus()
  await nextTick()
  equal(category.getAttribute('aria-expanded'), 'false')
  equal(category.value, 'New')
})

test('new categories are saved trimmed and immediately appear in another category dropdown', async () => {
  const { root, category } = await createItemForm('Tea')
  category.focus()
  setInput(category, '  Drinks  ')
  await nextTick()
  click('Add to list', root)
  await until(() => lists.lists[0].items.length === 1)
  equal(catalog.items[0].category, 'Drinks')
  const second = mount(CategoryInput, { modelValue: '' })
  second.querySelector('input')!.focus()
  await nextTick()
  equal(categoryOptions(second), ['Drinks'])
  const next = await createItemForm('Coffee')
  setInput(next.category, ' drinks ')
  await nextTick()
  key(next.category, 'Enter')
  await until(() => lists.lists[0].items.length === 2)
  equal(catalog.items.find(item => item.name === 'Coffee')!.category, 'Drinks')
})

test('catalog editing focuses categories, selects without advancing, and saves canonical spelling', async () => {
  await catalog.addProduct('Milk', 'Dairy', 3)
  const bread = await catalog.addProduct('Bread', 'Bread', 2)
  const root = mount(CatalogItem, { product: bread })
  // Clicking the category (rather than the product name) must focus the shared input.
  const label = root.querySelectorAll<HTMLElement>('p.font-medium')[1]
  label.click()
  await nextTick()
  const category = root.querySelector<HTMLInputElement>('[role="combobox"]')!
  await until(() => root.querySelector('[role="listbox"]'))
  assert(document.activeElement === category, 'Editing the category should focus its input')
  equal(categoryOptions(root), ['Bread', 'Dairy'])
  key(category, 'Escape')
  await nextTick()
  assert(root.querySelector('[role="combobox"]'), 'Escape should close suggestions without cancelling edit')
  equal(category.getAttribute('aria-expanded'), 'false')
  setInput(category, 'dai')
  await nextTick()
  key(category, 'ArrowDown')
  key(category, 'Enter')
  await nextTick()
  equal(category.value, 'Dairy')
  assert(document.activeElement === category, 'Selecting a suggestion should not advance focus')
  key(category, 'Enter')
  assert(document.activeElement === root.querySelector('input[type="number"]'), 'A subsequent Enter should focus price')
  setInput(category, ' dairy ')
  await nextTick()
  click('Done', root)
  await until(() => !root.querySelector('[role="combobox"]'))
  equal(catalog.items.find(item => item.id === bread.id)!.category, 'Dairy')
  equal((await db.get('catalog', bread.id!))!.category, 'Dairy')
})

test('category dropdowns use independent accessible IDs and retain existing required validation', async () => {
  const first = mount(CategoryInput, { modelValue: '' })
  const second = mount(CategoryInput, { modelValue: '' })
  first.querySelector('input')!.focus()
  await nextTick()
  const firstId = first.querySelector('[role="listbox"]')!.id
  second.querySelector('input')!.focus()
  await nextTick()
  assert(second.querySelector('[role="listbox"]')!.id !== firstId)
  const { root } = await createItemForm('Tea')
  click('Add to list', root)
  await nextTick()
  assert(root.textContent!.includes('Category is required'))
  equal(catalog.items.length, 0)
})

if (window.__backup) test('provided JSON export restores all products and trips without changing the source file', async () => {
  const data = parseAppDataJson(JSON.stringify(window.__backup))
  await importAppData(data)
  await catalog.loadFromDb()
  await catalog.refreshPurchaseHistory()
  await lists.init()
  equal((await db.getAll('catalog')).length, data.catalog.length)
  equal((await db.getAll('history')).length, data.history.length)
  equal((await db.getAll('lists')).length, data.lists.some(list => list.id === 'inbox') ? data.lists.length : data.lists.length + 1)
})

window.__testResults = (async () => {
  db = await dbPromise
  const results: Result[] = []
  for (const { name, run } of tests) {
    try {
      unhandled.length = 0
      await reset()
      await run()
      await new Promise(resolve => setTimeout(resolve, 0))
      equal(unhandled, [])
      results.push({ name, passed: true })
    }
    catch (error) { results.push({ name, passed: false, error: error instanceof Error ? error.stack : String(error) }) }
  }
  for (const unmount of cleanup.splice(0)) unmount()
  return results
})()
