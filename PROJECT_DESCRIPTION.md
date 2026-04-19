# Dunnes Helper — High-Level Project Document

## Overview

Dunnes Helper is a personal, offline-first Progressive Web App (PWA) that helps shoppers reach a specific spend target in order to use their Dunnes Stores vouchers efficiently — without overspending.

The app runs entirely in the browser with no backend server. All data is stored locally on the user's device.

---

## Problem Statement

Dunnes Stores VALUEclub vouchers (e.g. €10 off €50, €5 off €25) require a minimum spend threshold to activate. Shoppers currently have no easy way to track their running total against that threshold in real time while in-store, leading to either underspending (voucher wasted) or overspending (money lost).

---

## Goals

- Help the user hit a spend target as precisely as possible
- Surface their most frequently purchased items first to speed up list building
- Work fully offline — no signal required once installed
- Stay personal and private — no accounts, no servers, no data leaves the device
- Be installable on mobile as a home screen app (PWA)

---

## Non-Goals (for now)

- No backend or cloud sync
- No integration with Dunnes Stores systems or APIs
- No barcode scanning (possible future addition)
- No multi-user or shared list features

---

## Core User Flow

1. User opens the app and selects a spend target (e.g. €25 or €50)
2. A new shopping list is created automatically
3. The app displays the product catalog, ordered by purchase frequency (most used first)
4. User taps products to add them to the current list
5. The app shows a live running total and the remaining gap to the target
6. User can manually add a product not in the catalog, including its price
7. User can edit the price of any existing catalog item inline
8. Once the gap reaches zero (or close to it), the user is ready to check out

---

## Features

### MVP

- **Target selection** — Choose from preset thresholds (€25, €50) or enter a custom amount
- **Live gap display** — Prominent display of how much more is needed to hit the target
- **Progress indicator** — Visual progress bar toward the target
- **Product catalog** — Searchable list of previously used products, sorted by frequency
- **Frequency-first ordering** — Most purchased items appear at the top
- **Quantity support** — Add multiple units of any item
- **Manual product entry** — Add a new product with a name and price on the fly
- **Inline price editing** — Update a catalog item's price directly from the shopping view
- **Fully offline** — App shell and all data available with no internet connection
- **PWA install** — Installable to home screen on iOS and Android

### Data Management

- **Export catalog** — Download the product catalog as a CSV file
- **Import catalog** — Upload a CSV to populate or update the catalog
- **Export app data** — Export purchase history and frequency statistics as a JSON file
- **Import app data** — Restore from a previously exported file

### Future Considerations

- **Smart recommendations** — Use exponential decay weighting on purchase history to suggest what the user is likely to need, surfacing contextually relevant products over time
- **List history** — Browse and review past shopping sessions
- **Voucher stack awareness** — Support planning for two simultaneous voucher thresholds (e.g. €25 and €50 in one trip)
- **Price staleness indicator** — Flag catalog items whose price has not been verified recently

---

## Technical Architecture

### Principles

- Single HTML file to start; evolves into a structured project as complexity grows
- No backend, no authentication, no network dependency after first load
- All state lives in the browser; structured local storage for persistence
- Component-based UI with reactive state
- Thin, composable state layer — add complexity only when the pain is felt

### Storage Strategy

- **IndexedDB** (via a lightweight wrapper) for the product catalog and purchase history
  - Handles larger datasets than localStorage
  - Supports structured querying
- **localStorage** for lightweight app preferences (selected target, current view)

### PWA & Offline

- **Service Worker** for full offline support
  - App shell (HTML, CSS, JS assets) cached on first load
  - Subsequent loads served from cache regardless of connectivity
- **Web App Manifest** for installability
  - App name, icons, theme colour, display mode set to `standalone`
- **Hash-based routing** for navigation between views — no server required

### Views

```
App
 ├── Shopping View     (default — target, gap, product list, cart)
 ├── Catalog View      (manage products, prices, import/export)
 └── History View      (past lists — future)
```

Navigation is managed with a single reactive variable. No routing library needed at this scale.

### State Shape (conceptual)

```
catalog[]
  id, name, price, lastUpdated, purchaseCount, lastPurchasedAt

cart[]
  productId, name, price, quantity

session
  target, currentView

history[]
  date, target, items[], totalSpent
```

### Recommendation Engine (future)

Purchase frequency will be weighted using **exponential time decay**, giving more importance to recent purchases than older ones. This allows the app to adapt to changing habits over time without the user needing to manually curate their catalog.

---

## Data Formats

### Catalog CSV (import/export)

```
name,price
Avonmore Milk 2L,1.49
Brennans Bread,1.99
```

### App Data JSON (import/export)

```json
{
  "version": 1,
  "exportedAt": "2025-04-19T10:00:00Z",
  "catalog": [...],
  "history": [...]
}
```

---

## Design Principles

- **Mobile first** — designed for one-handed use in a supermarket aisle
- **Large tap targets** — easy to use quickly without reading glasses
- **High contrast** — readable under harsh store lighting
- **Minimal chrome** — the gap number and progress bar are always the hero
- **Fast** — no loading spinners; everything is local

---

## Out of Scope / Deliberate Constraints

| Constraint | Reason |
|---|---|
| No user accounts | Privacy; no server to maintain |
| No cloud backup | Keeps it simple; export/import covers the need |
| No barcode scanning | Adds complexity; prices change too frequently |
| No real-time Dunnes pricing | No public API available |

---

## Open Questions

- Should the target be locked once a list is started, or editable mid-session?
- Should partially complete sessions be auto-saved and resumable?
- What is the right UI treatment when the cart total exceeds the target?
- Should the app support multiple simultaneous lists (e.g. a partner shopping at the same time)?

---

*Document version: 0.1 — Pre-development*
