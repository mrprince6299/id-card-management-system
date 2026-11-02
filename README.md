# ID Card Management & Generation System

[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: Custom Attribution](https://img.shields.io/badge/License-Custom_Attribution_Required-orange.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/Tests-303%20Passing-emerald.svg)](./tests)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mrprince6299/id-card-management-system/pulls)

A modern, production-ready, **local-first ID Card Management & Generation Platform** designed for institutions, enterprises, universities, event organizers, and facilities. 

Easily manage multiple organizations, design front and back ID cards with live canvas previews, automatically match bulk photo archives, import CSV/Excel rosters, and export print-ready **300 DPI PDFs** formatted for standard **CR80 PVC cards** or multi-card **A4 print sheets** with duplex alignment and cutting crop marks.

---

## 📌 Project Overview & Purpose

Many identity card solutions are either locked to proprietary plastic card printers or tightly coupled to a single company's branding. **ID Card Management System** provides an open, highly extensible architecture that decouples card templates, organization branding, credential types, and print layouts:

- **100% Client-Side & Local-First**: All records, custom fields, organization profiles, and high-resolution photos reside securely in the browser (`localStorage` + `IndexedDB`). No employee data or photos are ever sent to external cloud servers.
- **Universal Organization Support**: Switch effortlessly between corporate enterprises, universities, contractor agencies, and workshop facilities with strict tenant isolation.
- **Physical Print Precision**: Generates vector-accurate PDFs adhering to international CR80 dimensions ($85.60 \times 53.98\text{ mm}$ or specialized industrial profiles like $86.22 \times 125.45\text{ mm}$) with front-and-back duplex mirroring and crop registration lines.

---

## ✨ Core Features

### 1. Multi-Organization Management
- **Independent Tenant Isolation**: Each organization maintains independent card rosters, custom fields, branding logos, primary/accent colors, and default templates.
- **Safe Switching & Storage**: Records and photo keys are partitioned using an internal organization identifier (`${organizationId}::${recordId}`), eliminating displayed ID collisions across tenants.
- **Archive & Restore**: Safely archive inactive organizations without data loss, or restore them with full data preservation.
- **Default Profiles**: Includes built-in reference configurations for corporate technology firms, educational academies, healthcare networks, event productions, and specialized railway workshop credentials.

### 2. Comprehensive Identity Card Types
Supports 7 standard identity models, each with tailored schema labels and validation rules:
1. **Employee ID**: Corporate badges featuring employee ID, department, designation, emergency contacts, and joining dates.
2. **Student ID**: Academic credentials with roll numbers, degree/course majors, academic years, and library tokens.
3. **Staff / Faculty ID**: University and institutional staff badges highlighting faculties, departments, and roles.
4. **Visitor Pass**: Temporary visitor badges tracking pass IDs, visiting purposes, escort requirements, and host sponsors.
5. **Contractor ID**: Industrial contractor cards featuring contractor badges, agency details, and safety clearance tags.
6. **Event Pass**: Conference and summit passes highlighting attendee tiers (VIP, Speaker, Delegate, Organizer).
7. **Custom ID**: Fully customizable layout accepting dynamic key-value attributes.

### 3. Dynamic Custom Fields & Field Placement
- Define arbitrary custom fields per organization (e.g., Blood Group, Aadhaar Number, Gate Access, Expiry Date, Vehicle Reg).
- Intuitive drag-and-toggle controls to position custom fields dynamically on either the **Front** or **Back** side of the card.
- Built-in graceful blanking: Optional or missing fields remain cleanly blank rather than displaying placeholder strings or `undefined`.

### 4. Interactive Front & Back Card Designer
- **Live Canvas Preview**: Real-time rendering of front and back sides with zoom, flip animation, and scale calibration.
- **Dynamic Barcodes & QR Codes**: Real-time client-side generation of Code 128 barcodes and ISO-compliant QR codes encoding verification URLs or structured payloads.
- **8 Professional Design Templates**:
  - `corporate-blue`: Modern corporate styling with dual-tone navy gradient, bold header bar, and clean typography.
  - `executive-minimal`: Elegant, light-themed executive badge with charcoal accents and generous white space.
  - `modern-tech`: Dark cyber/tech aesthetic featuring deep navy backdrop, cyan accents, and glowing badges.
  - `sidwal-workshop`: Exact reference replica of the physical railway mechanical workshop credential ($86.22 \times 125.45\text{ mm}$).
  - `sidwal-modern-corporate`: Modernized corporate variation of the railway workshop credential.
  - `sidwal-industrial-engineering`: Technical industrial aesthetic with monospace readouts and safety red dividers.
  - `sidwal-premium-executive`: Luxury executive styling with serif typography, pinstripes, and hairline accents.
  - `sidwal-contemporary-official`: High-contrast institutional layout with royal navy and signal red blocks.

### 5. Automated Bulk Photo Matching Engine
- Drag-and-drop folders or archives containing hundreds of portrait photos (`.jpg`, `.jpeg`, `.png`, `.webp`).
- Intelligent filename normalization matching IDs across multiple aliases (`employeeId`, `displayedId`, `rollNo`, `visitorId`).
- Automatic suffix stripping (`_photo`, `-headshot`, `_profile`, `_avatar`).
- **Ambiguity Detection**: Automatically detects colliding filenames for the same person and alerts the user instead of silently overwriting.
- Manual photo reassignment and replacement modal.
- High-performance binary storage in client-side **IndexedDB**, preventing `localStorage` quota exhaustion.

### 6. Batch Import & Data Validation
- Drag-and-drop CSV and Excel (`.xlsx`, `.xls`) roster importing.
- Automatic column header alias detection (e.g., maps `Emp ID`, `Employee Number`, `Roll No`, `Badge #` automatically).
- Pre-import validation engine flagging missing required fields, malformed emails, invalid dates, and colliding IDs.
- Configurable duplicate resolution strategies (`Skip Duplicates` vs. `Update Existing Records`).

### 7. Print-Ready PDF Generation & Sheet Layouts
- **High-Resolution 300 DPI Rendering**: HTML5 Canvas rendering pipeline exporting crisp, vector-sharp text and graphics.
- **Single CR80 Card Mode**: Direct PVC card printer output formatted to exact physical specifications ($85.60 \times 53.98\text{ mm}$ or custom mm).
- **A4 Multi-Card Sheets**:
  - **A4 Portrait (9-up)**: 3 columns $\times$ 3 rows grid layout.
  - **A4 Landscape (8-up)**: 4 columns $\times$ 2 rows grid layout.
- **Duplex Print Alignment (Front & Back)**: Automatically applies horizontal axis mirroring on even-numbered back pages so front and back cards align perfectly when flipped along the long edge.
- **Cutting Crop Marks**: High-contrast corner registration lines for manual trimming and die-cut machines.
- **Department & Filter Scoping**: Batch export filtered by department, organization, or status.

### 8. Full-Platform Backup, Restore & Recovery
- Complete platform backup into a versioned, portable JSON archive (including all organizations, records, custom fields, template settings, and Base64-encoded IndexedDB photos).
- **Cryptographic Tamper Detection**: Computes deterministic FIPS 180-4 compliant SHA-256 integrity checksums over organizations, rosters, template customizations, and photos.
- **Automatic Recovery Snapshot**: Automatically creates an atomic rollback point before any restore or bulk wipe operation.
- **Two Restoration Modes**:
  - `Replace All`: Cleanly resets and replaces the workspace with the backup contents.
  - `Merge / Append`: Intelligently merges backup records, resolving conflicts and updating existing IDs.

#### 🛡️ Backup & Restore Subsystem Architecture

##### 1. Cryptographic Checksum Format & Determinism
- **Modern Checksum Format**: Backups conforming to Schema 2.1.0+ calculate a cryptographic SHA-256 digest prefixed with `SHA256:` followed by exactly 64 lower-case hexadecimal characters (`SHA256:<64 hex>`).
- **Canonical Serialization**: Checksum calculation recursively canonicalizes objects and arrays—sorting dictionary keys lexicographically, maintaining array order, normalizing Unicode sequences, and strictly including 100% of persisted application fields (`schemaVersion`, `activeOrgId`, `organizations`, `records`, `photos`, and `templateSettings`).
- **Zero False Mismatch**: Serializing and hashing are invariant across platform environments, browser engines, key ordering, and whitespace variations.

##### 2. Legacy Schema Backward Compatibility
The restore parser provides full backward compatibility across all legacy backup formats without data loss:
- **Schema 1.0.0**: Flat single-organization employee roster format (migrated into multi-org format with active tenant assignment). Checksums are validated when present.
- **Schema 2.0.0**: Multi-organization format without mandatory integrity blocks.
- **Schema 2.1.0 (Legacy FNV-1a)**: Validates historical 32-bit FNV-1a checksums (`CHK-<8 hex>`) using the identical legacy field-sampling algorithm.
- **Schema 2.1.0+ (Modern SHA-256)**: Re-computes and strictly enforces SHA-256 cryptographic checksums before any data is written to disk.

##### 3. Storage Engine Boundary & Staged Atomic Recovery
- **Multi-Engine Boundary**: Modern web browsers lack cross-engine atomic transactions between `localStorage` (synchronous string store) and `IndexedDB` (asynchronous binary object store).
- **Staged Restore Pipeline**:
  1. *Snapshot Capture*: Captures complete in-memory and persistent snapshots of `records`, `organizations`, `activeOrgId`, `templateSettings`, and IndexedDB photos before initiating changes.
  2. *Pre-Write Validation*: Rejects corrupted payloads, invalid schemas, and mismatched checksums before writing any bytes to persistent storage.
  3. *Staged Application*: Writes records and organizations with `{ throwOnError: true }` so quota or I/O errors are immediately caught.
  4. *Exact Persisted Verification*: Re-reads actual persistent storage to confirm record counts, object keys, deep canonical equality, organization lists, template JSON, and active tenant state.
  5. *Automatic Snapshot Rollback*: If any failure occurs at any stage, `rollbackState()` restores the previous snapshot to both `localStorage` and `IndexedDB`. If rollback itself encounters an error, dual-error reporting preserves both the original restore failure and the rollback failure.

##### 4. Integrity vs. Authenticity Security Notice
- **Integrity Guarantee**: The SHA-256 checksum guarantees data integrity against accidental bit flips, incomplete downloads, network truncation, and schema tampering.
- **Authenticity Boundary**: SHA-256 is an unkeyed cryptographic hash function, not an asymmetric digital signature. An attacker with arbitrary file modification capability can recompute a valid SHA-256 checksum for modified content. Organizations requiring cryptographic non-repudiation or provenance verification should sign exported backup JSON archives with an external PKI / GPG key.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technologies Used | Purpose |
|-------|-------------------|---------|
| **UI Framework** | React 19, JSX | Component-based stateful UI architecture |
| **Bundler & Server** | Vite 8, Rolldown | Ultra-fast HMR and optimized production bundling |
| **Styling** | Tailwind CSS 4, Lucide Icons | Responsive utility-first styling and icon system |
| **Document Engine** | jsPDF, HTML5 Canvas API | Client-side 300 DPI PDF rendering and page assembly |
| **Spreadsheet Engine** | SheetJS (`xlsx`) | Client-side parsing and generation of `.xlsx` and `.csv` |
| **Code Generation** | `qrcode`, `jsbarcode` | Vector barcode and 2D QR matrix generation |
| **Client Storage** | `IndexedDB` (Photos), `localStorage` (Records) | High-capacity, local-first client-side data persistence |
| **Sanitization** | DOMPurify | XSS prevention for user-injected text and SVG assets |

---

## 📂 Project Structure

```text
id-card-management-system/
├── public/                     # Static icons and web manifest
│   ├── favicon.svg             # Platform favicon
│   └── icons.svg               # SVG sprite definitions
├── src/
│   ├── assets/                 # Brand graphics and bundled logos
│   ├── components/             # Modular UI component hierarchy
│   │   ├── backup/             # Backup, restore & recovery snapshot modals
│   │   ├── common/             # Reusable primitives (Button, Card, Badge, StatsCard)
│   │   ├── dashboard/          # Metric cards and recent credential rosters
│   │   ├── designer/           # Front/Back card views, preview canvas & controls
│   │   ├── export/             # Batch PDF export configuration and print sheets
│   │   ├── import/             # CSV/Excel parsing, validation and column mapping
│   │   ├── layout/             # Admin header, sidebar and responsive wrapper
│   │   ├── organizations/      # Multi-organization switcher and profile manager
│   │   └── photos/             # Bulk photo matcher, ambiguity reviewer & manager
│   ├── context/                # EmployeeContext (Global multi-tenant state provider)
│   ├── data/                   # Seed data and mock organizational profiles
│   ├── hooks/                  # Custom hooks (navigation, data access)
│   ├── pages/                  # Top-level views (DashboardPage, EmployeesPage)
│   └── utils/                  # Core algorithms and utilities
│       ├── backupSystem.js     # Versioned backup/restore with snapshot rollback
│       ├── cardCanvasRenderer.js # 300 DPI canvas rendering engine for all templates
│       ├── cardTypes.js        # Schemas for Employee, Student, Visitor, Contractor, etc.
│       ├── constants.js        # Dimensions (CR80/SIDWAL), templates, palettes
│       ├── importer.js         # Flexible file ingestion and schema normalizer
│       ├── organizationStorage.js # Organization persistence and tenant isolation
│       ├── pdfGenerator.js     # jsPDF single and multi-card A4 duplex engine
│       ├── photoMatcher.js     # Fuzzy photo matching and suffix stripping
│       ├── photoStorage.js     # IndexedDB photo storage layer
│       └── validator.js        # RFC email, date, duplicate and integrity validator
├── tests/                      # Comprehensive automated test suites
│   ├── fixtures/               # Synthetic mock datasets and placeholder photos
│   ├── run-validation-tests.mjs# Import schema and row validator tests
│   ├── run-photo-matching-tests.mjs # Bulk photo matching & collision tests
│   ├── run-template-tests.mjs  # Template rendering and CR80 geometry tests
│   ├── run-sidwal-template-tests.mjs # Industrial template replica verification
│   ├── run-tenant-isolation-tests.mjs # Multi-tenant isolation verification
│   ├── run-phase5-backup-restore-tests.mjs # Backup, merge and rollback tests
│   └── run-pdf-tests.mjs       # jsPDF dimensions, 300 DPI, and duplex alignment tests
├── LICENSE                     # Custom Attribution-Required Software License
├── package.json                # Project dependencies and script runner commands
└── vite.config.js              # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later (or `pnpm` / `yarn`)
- A modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari)

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mrprince6299/id-card-management-system.git
   cd id-card-management-system
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:5173` (or the port displayed in your terminal).

---

## 🔨 Available Scripts

In the project root, you can execute the following scripts:

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the Vite development server with hot module replacement (HMR). |
| `npm run build` | Compiles and bundles the production-ready application to the `dist/` directory. |
| `npm run preview` | Locally serves the optimized production bundle from `dist/`. |
| `npm run test` | Executes the full automated validation, photo matching, and PDF test suite. |
| `npm run test:fast` | Runs the ultra-fast automated Node.js test suite across all 10 core testing modules. |
| `npx oxlint --quiet` | Runs the high-performance Oxlint code linter. |

---

## 🧪 Testing & Verification

The platform includes a test suite covering all import workflows, tenant isolation guarantees, photo matching algorithms, backup recovery snapshots, and print geometries:

```bash
# Run all fast test suites
npm run test:fast
```

The test runner verifies:
- ✅ **Import & Parsing**: Validates CSV and Excel parsing, column alias mapping, and row error detection.
- ✅ **Photo Matching**: Tests suffix stripping, case-insensitive ID matching, duplicate detection, and manual mapping.
- ✅ **Tenant Isolation**: Confirms that records, custom fields, templates, and photos remain strictly isolated across organizations.
- ✅ **Backup & Rollback**: Simulates mid-restore failures and verifies that the automated snapshot system rolls back live data without corruption.
- ✅ **PDF Geometry & Duplex Printing**: Validates physical card dimensions ($85.60 \times 53.98\text{ mm}$ and $86.22 \times 125.45\text{ mm}$), page count calculations, 300 DPI pixel bounds, cutting crop mark vector paths, and back-side column mirroring for duplex printing.

---

## 🔒 Privacy, Security & Local-First Philosophy

This application was engineered with a strict **local-first privacy architecture**:
1. **Zero External Data Transmission**: All employee data, names, ID numbers, addresses, contact information, and photos are stored strictly inside your browser's local sandbox (`localStorage` and `IndexedDB`). No telemetries or private payloads are uploaded to external APIs.
2. **Safe Backup Handling**: Backup files are saved locally to your device as plain JSON files with SHA-256 integrity checksums.
3. **No Database Configuration Required**: Works completely offline out-of-the-box without requiring Docker, PostgreSQL, MongoDB, or cloud database credentials.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Ensure all automated tests pass (`npm run test:fast`).
5. Push to the branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

Please ensure all contributions preserve the local-first security guarantees and attribution requirements.

---

## 📄 License & Mandatory Attribution

This project is released under a **Custom Attribution-Required Software License**.

> [!IMPORTANT]
> **License Notice**: This is **NOT** a standard OSI-approved license (such as MIT or Apache 2.0). It is a custom software license designed by the original author.
> 
> - **Commercial, Educational & Personal Use**: You are permitted to use, modify, adapt, deploy, and distribute this software for personal, academic, or commercial purposes.
> - **Mandatory Attribution**: You **MUST** retain the original copyright notice, preserve the original author credit, and prominently include the following attribution statement in your documentation, user-facing credits, and redistributed source code:
> 
> ```text
> Based on ID Card Management System by Mithilesh Kumar (@mrprince6299).
> Original repository: https://github.com/mrprince6299/id-card-management-system
> ```
> 
> - **Derivative Works**: Modified versions must clearly identify that they have been modified and must not misrepresent themselves as the official original project.
> - **Attribution Retention**: Attribution notices must not be removed, hidden, or obscured.

For the full legal text, terms, disclaimers, and warranty limitations, please read the complete [**`LICENSE`**](./LICENSE) file.

---

## ⚖️ Third-Party Trademarks & Reference Disclaimer

- **Trademark Ownership**: All product names, company names, logos, service marks, and trademarks mentioned or displayed in this repository—including **SIDWAL**, **Indian Railways**, and any other third-party entities—are the property of their respective owners.
- **Reference & Identification Purpose**: Their inclusion in sample templates, demonstrations, and test cases is solely for descriptive identification and reference purposes (such as demonstrating historical or physical layout replica capabilities).
- **No Affiliation or Endorsement**: This project is independently developed and maintained by the author. It is **not** officially affiliated with, authorized by, sponsored by, or endorsed by Sidwal Refrigeration Industries Pvt. Ltd., Indian Railways, or any other trademark holder.
- **Commercial Usage Responsibility**: This disclaimer does not grant any permission, license, or right to use third-party trademarks. Users, organizations, and developers deploying or commercializing identity cards are solely responsible for obtaining all necessary permissions and rights from the respective trademark holders before using third-party names, logos, or branding.

---

## 👨‍💻 Author & Acknowledgments

Created with ❤️ by **Mithilesh Kumar**  
- **GitHub Profile**: [@mrprince6299](https://github.com/mrprince6299)  
- **Project Repository**: [id-card-management-system](https://github.com/mrprince6299/id-card-management-system)
