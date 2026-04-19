# Dunnes Helper

A personal, offline-first Progressive Web App (PWA) to help hit Dunnes Stores VALUEclub voucher spend thresholds without overspending. Runs entirely in the browser — no backend, no accounts, no data leaves your device.

## Setup

**Prerequisites:** [Bun](https://bun.sh) installed.

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:5173)
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview
```

### Tech stack

- **Vue 3** — component framework
- **Pinia** — state management
- **Vite** — build tool
- **Tailwind CSS** — styling
- **IndexedDB** (via `idb`) — local data persistence
- **vite-plugin-pwa** — service worker & offline support

---

# TODO
- [ ] in the history there is no need for checkmarks. Allow me to change the date in history. 
- [ ] keyboard shortcuts are not working when searching. If there is only one item in the search, pressing enter should add it. If multiple items, arrow key shold allow me to select one of them, and add it by pressing enter. When using mouse, we should highlight which item i am hovering my mouse on.
- [ ] 0.06 should not be marked as red, show it orange. show me percentage saving. (e.g., if the cart value is exact 25Euro, %saving is 20%.)
- [ ] during planning (in the list section), allow user to select the target shopping date
- [ ] recommended list in shop section should have order based on frequency (needed first)
- [ ] once i add item, it should be shown that item has already been added, and it should go down. 
- [ ] after marking the item unavailable, and select replacement item, and i meet the goal, we should remove the suggestsions
- [ ] provision for multiple lists (in the list sections), allow open list (undecided). For each item allow user to move between the lists (if items is in a list) or between undecided and any list.