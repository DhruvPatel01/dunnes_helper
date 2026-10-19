# System Architecture

Dunnes Helper is an offline Vue 3 PWA. Pinia manages application state; `idb` wraps IndexedDB persistence. Vite, Tailwind CSS, and vite-plugin-pwa build and cache the application. There is no backend.

## Navigation and components

`App.vue` provides the active tab, restores it from localStorage, and synchronizes valid URL hashes. `BottomNav.vue` changes tabs. The three views are `ListView`, `CatalogView`, and `HistoryView`. Components are grouped under `components/lists`, `components/catalog`, and `components/shared`.

On startup, the app loads the catalog, rebuilds purchase statistics and recommendations from history, and initializes shopping lists. Invalid saved tab preferences fall back to Lists.

## Stores and persistence

`src/db/index.ts` opens `dunnes-helper-db`, schema version 1:

| Object store | Key | Purpose |
|---|---|---|
| `catalog` | Auto-incrementing numeric `id` | Product prices, categories, and purchase statistics |
| `history` | Auto-incrementing numeric `id` | Archived trips, item prices and quantities, totals, and unavailable names |
| `lists` | String `id` | Inbox and planned shopping lists |
| `activeSession` | `id` | Retained legacy store, unused by the current application |

`catalogStore.ts` manages products and derives purchase counts, last purchase dates, and recommendation scores from history. Counts represent trips containing the product, rather than quantities purchased. Recommendations rank products by recent purchase frequency, with a half-life of four observed shopping visits. Visits use distinct local shopping days; repeated items, quantities, and multiple archives for the same day count once. A visit's weight is `2 ** (-newerVisits / 4)` and each product's score is its purchase weights divided by the weights of all visits. Missing purchases lower an item's score as newer visits accumulate; calendar gaps alone do not change scores. Products with one purchase participate, while unpurchased products retain alphabetical ordering below purchased products. The browser's `debugRecs()` helper displays these frequency scores and purchase dates.

Archived history retains the list's optional `targetDate` (shopping date) alongside `date` (archive timestamp). Purchase statistics, recommendations, and History display/editing use `targetDate`, falling back to `date` for legacy or undated records. Restoring history preserves that shopping date, and backups retain both fields.

`listsStore.ts` manages lists, quantities, price overrides, availability, and checked states. Initialization always ensures an inbox exists. Lists sort by shopping date, falling back to creation date for undated legacy lists. Basket totals exclude unavailable items. Checked items remain part of the basket total and appear separately in the progress bar.

Currency calculations use integer cents through `utils/money.ts`. Default vouchers follow the configured household rule of €5 per €25 target; explicit voucher overrides are preserved. The app displays the one-week validity reminder; it does not maintain an issued-voucher balance or expiry ledger.

Archiving writes history and removes the active list in one transaction. Restoring history creates a new active list and removes the history entry in one transaction. Item moves likewise update both lists in one transaction. In-memory changes are published after these transactions commit. Existence checks within archive/restore transactions prevent duplicate actions. `writeTransaction` rolls back request, commit, and synchronous write failures.

## Product search

MiniSearch provides offline product search for the shopping-list dropdown and catalog. The catalog store caches one in-memory index of product names and categories, rebuilding it when indexed catalog data changes. Queries support word prefixes, words in any order, case and accent normalization, and at most one typo per word of four or more characters. Every query word must match. Names have more weight than categories; exact product names rank first, then search relevance, with existing recommendation or purchase ordering breaking ties. Empty queries retain the existing ordering. The index is rebuilt from products rather than persisted separately.

## Imports and exports

`utils/dataExport.ts` exports catalog, history, and lists from one read transaction. `utils/backup.ts` validates the complete v1 backup before any replacement writes, including record shapes, numeric values, and duplicate IDs. Legacy lists without `targetDate` remain supported. Restores replace the three stores atomically, then reload the stores and purchase statistics.

`utils/csv.ts` reads and writes catalog CSV, including quoted multiline cells. It rejects invalid prices and duplicate product names. The import modal snapshots conflict choices before changing the catalog. Catalog replacement is atomic and retains matching product IDs and purchase metadata so existing list and history references remain connected.

## PWA and deployment

Node.js and npm provide the development and build tooling. `.nvmrc` selects Node 24, and `package-lock.json` locks dependency versions. `npm ci` performs clean installs locally and in CI.

`vite.config.ts` configures the `/dunnes_helper/` base path and a generated service worker with static precaching. On pushes to `master`, GitHub Actions installs with npm, runs type checks and browser regression tests, builds the application, and deploys `dist/` to GitHub Pages.

## Validation

`npm run type-check` checks application and browser test TypeScript. `npm run build` builds the production application and service worker.

`npm test` runs `tests/run.py`, a Python standard-library runner that bundles regression tests with the existing Vite installation and drives installed headless Chrome/Chromium through its debugging pipe. It uses a temporary browser profile and real IndexedDB, with no additional packages or running server. Tests cover basket and voucher arithmetic, interrupted writes and rollback, archive/restore, import/export, purchase statistics, local dates, preferences, and relevant Vue interactions. `CHROME_BIN` can specify the browser executable.

To also verify an existing export without changing it:

```bash
python3 tests/run.py --backup 'dunnes-helper-backup(1).json'
```
