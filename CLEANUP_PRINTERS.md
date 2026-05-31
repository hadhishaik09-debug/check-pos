Phase 1 — Printer & Electron Cleanup Summary

What I changed (safe, non-destructive):

- Added a canonical printer layer under `src/printer/`:
  - `types.ts` — shared interfaces and types
  - `service.ts` — in-memory placeholder service (renderer-friendly)
  - `index.ts` — canonical exports and compatibility re-exports

- Consolidated receipt formatters (kept both for compatibility):
  - `src/utils/receiptFormatter.ts` — new canonical ESC/POS formatter (TS)
  - `src/lib/printer-utils.ts` — legacy formatter retained (re-exported)

- Replaced CartPanel printing flow to call `electronAPI.printOrder` when available (desktop) and otherwise save orders only.

What I did NOT change:

- I did not remove `electron/main.cjs` or other electron files — kept them to avoid build changes.
- I did not remove `receiptFormatter.js` (CommonJS) used by Electron main process.

Recommended next steps (safe):

1. Rebuild and test (dev):

   ```bash
   # in pos-vite-clean
   npm install
   npm run dev
   # in another shell
   npm run electron-dev
   ```

2. Run a simulated TCP printer to verify ESC/POS bytes before using hardware.

3. After verifying runtime, optionally remove `src/utils/receiptFormatter.js` (if `main.cjs` is migrated to import TS build output) and clean `dist/` artifacts.

4. For QZ Tray integration (Phase 2), implement an adapter that implements `PrinterService` and either calls `window.qz` (browser) or `ipcRenderer` (Electron).

Notes:
- Existing UI, Firebase flows, and payment/cart logic were preserved.
- This phase focused on scaffolding and safe consolidation only.
