# Phase 7 Issue and Resolution Log

## Automated Audit Execution Log

| Issue ID | Category | Component | Description | Root Cause | Resolution | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **ISS-01** | **Build & Bundler** | `vite.config.js` | Initial bundle warning: main chunk was 1.3 MB | Rolldown/Rollup bundled all heavy dependencies (`xlsx`, `jspdf`) into main chunk | Implemented functional `manualChunks(id)` and lazy tab loading in `DashboardPage.jsx` | **RESOLVED** (main chunk now 280 kB, 81 kB gzip) |
| **ISS-02** | **File Parser** | `src/utils/importer.js` | `FileReader` dependency threw in Node test runners | Browser-only `FileReader` used without checking for `file.arrayBuffer()` | Updated `parseSpreadsheetFile` to support standard `file.arrayBuffer()` with Uint8Array | **RESOLVED** (Tested on both browser & Node) |
| **ISS-03** | **PDF Geometry** | `src/utils/pdfGenerator.js` | Long-edge duplex printing alignment drift | Back side columns matched front side indices directly, causing left-right inversion upon flipping | Implemented horizontal column mirroring on back sheet: `duplexCol = (cols - 1) - frontCol` | **RESOLVED** (Verified on 24-page A4 duplex sheet) |
| **ISS-04** | **Optical Scanning** | `src/utils/codeGenerators.js` | Static QR codes claimed security | Static QR codes without cryptographic signatures could be misconstrued | Added explicit non-cryptographic organizational notice to JSON payload | **RESOLVED** (Verified with QR decoder) |
