/**
 * Reliable Backup and Restoration System for ID Card Management Platform.
 * Supports Staged Restoration, Merge & Update, Replace All, Automatic Rollback Snapshots,
 * Multi-Tenant Isolation, and Photo Blob Integrity Verification.
 */

import {
  getStoredOrganizations,
  saveStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
  hydrateOrgAssets,
  UNASSIGNED_LEGACY_ORG,
} from './organizationStorage.js'
import { getStoredEmployees, saveStoredEmployees } from './storage.js'
import {
  exportAllPhotosAsBase64,
  importPhotosFromBase64,
  clearAllPhotosFromDB,
  getPhotoFromDB,
  buildPhotoKey,
  parsePhotoKey,
  snapshotPhotosInMemory,
  restorePhotosFromSnapshot,
  validatePhotoSnapshotInMemory,
} from './photoStorage.js'
import {
  getSavedTemplateSettings,
  saveTemplateSettings,
  TEMPLATE_STORAGE_KEY,
} from './templateStorage.js'

export const BACKUP_SCHEMA_VERSION = '2.1.0'
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0', '2.0.0', '2.1.0']
export const RECOVERY_SNAPSHOT_KEY = 'idcard_recovery_snapshot_v1'
export const LAST_BACKUP_METADATA_KEY = 'idcard_last_backup_meta_v1'
export const MAX_BACKUP_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB safe browser memory threshold

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

// Standard SHA-256 round constants (K)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/**
 * Computes standard SHA-256 hex string (FIPS 180-4 compliant) synchronously.
 * Works uniformly in browser, worker, and Node.js environments.
 */
export const sha256Sync = (input) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input || new Uint8Array(0)
  const len = bytes.length
  const bitLen = len * 8
  const totalLen = ((len + 8) >>> 6) + 1 << 6
  const padded = new Uint8Array(totalLen)
  padded.set(bytes)
  padded[len] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000))
  view.setUint32(totalLen - 4, bitLen >>> 0)

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Uint32Array(64)

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4)
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (w[t - 15] >>> 7 | w[t - 15] << 25) ^ (w[t - 15] >>> 18 | w[t - 15] << 14) ^ (w[t - 15] >>> 3)
      const s1 = (w[t - 2] >>> 17 | w[t - 2] << 15) ^ (w[t - 2] >>> 19 | w[t - 2] << 13) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let t = 0; t < 64; t++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + SHA256_K[t] + w[t]) >>> 0
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => (v >>> 0).toString(16).padStart(8, '0'))
    .join('')
}

/**
 * Computes SHA-256 asynchronously using Web Crypto API (crypto.subtle) where supported,
 * falling back to the synchronous implementation.
 */
export const sha256Async = async (input) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input || new Uint8Array(0)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle?.digest) {
    try {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (_) {
      // Fall through to synchronous implementation
    }
  }
  return sha256Sync(bytes)
}

/**
 * 32-bit FNV-1a fast deterministic non-cryptographic string hashing utility.
 * Preserved for backward-compatible verification of legacy schema 2.1.0 archives.
 */
const fnv1a = (str) => {
  if (!str) return '00000000'
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Legacy two-pass FNV-1a 64-bit checksum generator.
 * Used exclusively for validating early schema 2.1.0 backups that used CHK- prefixes.
 */
export const computeLegacyBackupChecksum = (data) => {
  if (!data || typeof data !== 'object') return ''

  const orgs = (Array.isArray(data.organizations) ? data.organizations : [])
    .map((o) => ({
      id: String(o.id || ''),
      name: String(o.name || ''),
      companyName: String(o.companyName || ''),
      tagline: String(o.tagline || ''),
      logoUrl: String(o.logoUrl || ''),
      customAccentColor: String(o.customAccentColor || ''),
      defaultTemplateId: String(o.defaultTemplateId || ''),
      isArchived: Boolean(o.isArchived),
      isImmutableBranding: Boolean(o.isImmutableBranding),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const records = (Array.isArray(data.records) ? data.records : [])
    .map((r) => ({
      recordId: String(r.recordId || ''),
      organizationId: String(r.organizationId || ''),
      displayedId: String(r.displayedId || r.employeeId || ''),
      fullName: String(r.fullName || ''),
      role: String(r.role || r.designation || ''),
      department: String(r.department || ''),
      hasPhoto: Boolean(r.hasPhoto),
      customFields: r.customFields || {},
    }))
    .sort((a, b) => (a.recordId || '').localeCompare(b.recordId || ''))

  const photos = (Array.isArray(data.photos) ? data.photos : [])
    .map((p) => ({
      photoKey: String(p.photoKey || ''),
      organizationId: String(p.organizationId || ''),
      recordId: String(p.recordId || ''),
      filename: String(p.filename || ''),
      mimeType: String(p.mimeType || ''),
      contentHash: p.base64 ? fnv1a(p.base64) : '',
    }))
    .sort((a, b) => (a.photoKey || '').localeCompare(b.photoKey || ''))

  const templateSettings = data.templateSettings || {}
  const schemaVer = String(data.schemaVersion || data.version || '1.0.0')

  const canonicalString = JSON.stringify({
    schemaVer,
    orgs,
    records,
    photos,
    templateSettings,
  })

  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5 ^ 0x5a5a5a5a
  for (let i = 0; i < canonicalString.length; i++) {
    const ch = canonicalString.charCodeAt(i)
    h1 ^= ch
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= ch
    h2 = Math.imul(h2, 0x01000193)
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase()
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase()
  return `CHK-${hex1}${hex2}`
}

/**
 * Recursively canonicalizes any object, array, or primitive:
 * - Objects: keys are sorted lexicographically to guarantee deterministic stringification.
 * - Arrays: array order is preserved to protect semantically meaningful sequences.
 * - Primitives: returned as-is.
 */
export const canonicalize = (value) => {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  const sortedObj = {}
  const keys = Object.keys(value).sort()
  for (const key of keys) {
    if (value[key] !== undefined) {
      sortedObj[key] = canonicalize(value[key])
    }
  }
  return sortedObj
}

/**
 * Builds the canonical deterministic payload covering 100% of persisted data:
 * - Schema version and active organization tenant.
 * - All organization properties (logos, branding, headings, contacts, colors, overlays).
 * - All cardholder record properties (IDs, names, roles, departments, emails, blood groups, custom fields).
 * - All photo metadata and binary base64 content.
 * - All template settings, field placements, coordinates, and toggles.
 */
export const buildCanonicalBackupPayload = (data) => {
  if (!data || typeof data !== 'object') return ''

  // 1. Organizations: sort deterministically by id, canonicalize 100% of properties
  const rawOrgs = Array.isArray(data.organizations) ? data.organizations : []
  const sortedOrgs = [...rawOrgs].sort((a, b) =>
    String(a?.id || '').localeCompare(String(b?.id || ''))
  )
  const canonicalOrgs = sortedOrgs.map((org) => canonicalize(org))

  // 2. Records: sort deterministically by composite tenant key, canonicalize 100% of properties
  const rawRecords = Array.isArray(data.records) ? data.records : []
  const sortedRecords = [...rawRecords].sort((a, b) => {
    const keyA = `${a?.organizationId || 'default'}::${a?.recordId || a?.displayedId || a?.id || ''}`
    const keyB = `${b?.organizationId || 'default'}::${b?.recordId || b?.displayedId || b?.id || ''}`
    return keyA.localeCompare(keyB)
  })
  const canonicalRecords = sortedRecords.map((rec) => canonicalize(rec))

  // 3. Photos: sort deterministically by photoKey, canonicalize 100% of metadata & binary base64
  const rawPhotos = Array.isArray(data.photos) ? data.photos : []
  const sortedPhotos = [...rawPhotos].sort((a, b) =>
    String(a?.photoKey || a?.recordId || '').localeCompare(String(b?.photoKey || b?.recordId || ''))
  )
  const canonicalPhotos = sortedPhotos.map((photo) => canonicalize(photo))

  // 4. Template settings: canonicalize all nested configurations and field coordinates
  const canonicalTemplateSettings = canonicalize(data.templateSettings || {})

  // 5. Root metadata that affects restoration
  const schemaVersion = String(data.schemaVersion || data.version || '1.0.0')
  const activeOrgId = String(data.activeOrgId || '')

  const payload = {
    schemaVersion,
    activeOrgId,
    organizations: canonicalOrgs,
    records: canonicalRecords,
    photos: canonicalPhotos,
    templateSettings: canonicalTemplateSettings,
  }

  return JSON.stringify(payload)
}

/**
 * Computes deterministic SHA-256 checksum covering 100% of persisted backup data.
 * Output format: SHA256:<64 hex characters lowercase>
 *
 * Security Note:
 * SHA-256 integrity checksums protect against accidental corruption, transmission errors,
 * and tampering when the expected checksum is known from an independent or trusted channel.
 * SHA-256 alone does not authenticate the author or origin of an archive if an adversary
 * has write access to modify both the payload and the checksum simultaneously.
 */
export const computeBackupChecksum = (data) => {
  const canonicalString = buildCanonicalBackupPayload(data)
  if (!canonicalString) return ''
  return `SHA256:${sha256Sync(canonicalString)}`
}

/**
 * Asynchronous variant using Web Crypto API where available.
 */
export const computeBackupChecksumAsync = async (data) => {
  const canonicalString = buildCanonicalBackupPayload(data)
  if (!canonicalString) return ''
  const hash = await sha256Async(canonicalString)
  return `SHA256:${hash}`
}

/**
 * Validate incoming backup structure, data types, and schema compatibility.
 * Rejects corrupt, malformed, or unsupported files.
 */
export const validateBackupStructure = (rawInput) => {
  if (!rawInput) {
    return { isValid: false, error: 'Backup data is empty or missing.' }
  }

  // Safe file size check
  if (rawInput && typeof rawInput.length === 'number' && rawInput.length > MAX_BACKUP_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Backup archive exceeds safe local browser memory limit (100 MB). Please reduce file size.`,
    }
  }

  let data = rawInput
  if (typeof rawInput === 'string') {
    try {
      data = JSON.parse(rawInput)
    } catch (err) {
      return { isValid: false, error: `Invalid JSON format: ${err.message}` }
    }
  }

  if (typeof data !== 'object' || data === null) {
    return { isValid: false, error: 'Backup root must be a valid JSON object.' }
  }

  // Check Schema Version
  const schemaVer = String(data.schemaVersion || data.version || '1.0.0').trim()
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVer)) {
    return {
      isValid: false,
      error: `Unsupported backup schema version "${schemaVer}". Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
    }
  }

  // Validate Records
  if (!Array.isArray(data.records)) {
    return { isValid: false, error: 'Malformed backup: "records" property must be an array.' }
  }

  // Validate Record elements
  for (let i = 0; i < data.records.length; i++) {
    const rec = data.records[i]
    if (!rec || typeof rec !== 'object') {
      return { isValid: false, error: `Malformed record at index ${i}: must be an object.` }
    }
    const hasIdentifier = rec.recordId || rec.displayedId || rec.employeeId || rec.id
    if (!hasIdentifier) {
      return { isValid: false, error: `Invalid record at index ${i}: missing unique record identifier.` }
    }
  }

  // Validate Organizations if present
  if (data.organizations && !Array.isArray(data.organizations)) {
    return { isValid: false, error: 'Malformed backup: "organizations" must be an array.' }
  }

  // Validate Photos if present
  if (data.photos) {
    if (!Array.isArray(data.photos)) {
      return { isValid: false, error: 'Malformed backup: "photos" must be an array.' }
    }
    for (let i = 0; i < data.photos.length; i++) {
      const p = data.photos[i]
      if (!p || typeof p !== 'object') {
        return { isValid: false, error: `Malformed photo entry at index ${i}.` }
      }
      if (p.base64 && typeof p.base64 !== 'string') {
        return { isValid: false, error: `Invalid photo base64 payload at index ${i}.` }
      }
      // Security: Prevent unsafe code or script injection inside base64 string
      if (p.base64 && (p.base64.includes('<script') || p.base64.includes('javascript:'))) {
        return { isValid: false, error: `Security violation: Insecure photo data detected at index ${i}.` }
      }
    }
  }

  // Integrity Checksum Verification
  const hasIntegrityChecksum = Boolean(
    data.integrity?.checksum && String(data.integrity.checksum).trim().length > 0
  )

  // Enforce mandatory integrity checksum for schema 2.1.0 and newer
  if (schemaVer === '2.1.0' && !hasIntegrityChecksum) {
    return {
      isValid: false,
      error:
        'Integrity verification failed: Backup archive schema 2.1.0 requires valid integrity metadata (integrity.checksum). Missing or empty checksum is not permitted in schema 2.1.0+.',
    }
  }

  let integrityStatus = 'legacy-unprotected'
  let isLegacy = schemaVer !== '2.1.0'

  if (hasIntegrityChecksum) {
    const rawChecksum = String(data.integrity.checksum).trim()

    if (rawChecksum.startsWith('CHK-')) {
      // Legacy FNV-1a checksum verification (backward compatibility for early 2.1.0 backups)
      const expectedLegacyChecksum = computeLegacyBackupChecksum(data)
      if (rawChecksum !== expectedLegacyChecksum) {
        return {
          isValid: false,
          error: `Integrity verification failed: Backup archive has been tampered with or corrupted. (Expected ${expectedLegacyChecksum}, got ${rawChecksum})`,
        }
      }
      integrityStatus = 'legacy-fnv1a'
      isLegacy = true
    } else if (rawChecksum.toUpperCase().startsWith('SHA256:') || /^[0-9a-f]{64}$/i.test(rawChecksum)) {
      // Modern SHA-256 cryptographic checksum verification
      const expectedChecksum = computeBackupChecksum(data)
      const normalizedProvided = rawChecksum.replace(/^SHA256:/i, '').toLowerCase()
      const normalizedExpected = expectedChecksum.replace(/^SHA256:/i, '').toLowerCase()

      if (normalizedProvided !== normalizedExpected) {
        return {
          isValid: false,
          error: `Integrity verification failed: Backup archive has been tampered with or corrupted. (Expected ${expectedChecksum}, got ${rawChecksum})`,
        }
      }
      integrityStatus = 'verified-sha256'
      isLegacy = false
    } else {
      // Unknown checksum format
      return {
        isValid: false,
        error: `Integrity verification failed: Unrecognized checksum format "${rawChecksum}". Expected standard SHA-256 or legacy CHK format.`,
      }
    }
  }

  return {
    isValid: true,
    data,
    schemaVersion: schemaVer,
    integrityStatus,
    isLegacy,
    counts: {
      records: data.records.length,
      organizations: Array.isArray(data.organizations) ? data.organizations.length : 0,
      photos: Array.isArray(data.photos) ? data.photos.length : 0,
    },
  }
}

/**
 * Creates a complete platform backup containing:
 * - All active and archived organizations
 * - All master records across organizations (including custom fields and unassigned legacy records)
 * - All binary photos exported as Base64 from IndexedDB
 * - Organization branding and template customizations
 * - Integrity metadata and counts
 */
export const createPlatformBackup = async () => {
  const organizations = getStoredOrganizations()
  const records = getStoredEmployees()
  const templateSettings = getSavedTemplateSettings()
  const activeOrgId = getActiveOrganizationId()

  // Export photos from IndexedDB if environment supports it
  const hasIndexedDB = typeof window !== 'undefined' && Boolean(window.indexedDB)
  const photos = hasIndexedDB ? await exportAllPhotosAsBase64() : []

  const exportedAt = new Date().toISOString()
  const activeOrgs = organizations.filter((o) => !o.isArchived).length
  const archivedOrgs = organizations.filter((o) => Boolean(o.isArchived)).length
  const unassignedRecords = records.filter(
    (r) => r.organizationId === 'unassigned-legacy' || !r.organizationId
  ).length

  const backupPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    applicationVersion: '2.1.0',
    exportedAt,
    platform: 'ID Card Management & Generation Platform',
    activeOrgId,
    organizations,
    records,
    photos,
    templateSettings,
    counts: {
      organizations: organizations.length,
      records: records.length,
      photos: photos.length,
      activeOrgs,
      archivedOrgs,
      unassignedRecords,
    },
  }

  // Calculate integrity hash
  const checksum = computeBackupChecksum(backupPayload)
  backupPayload.integrity = {
    algorithm: 'SHA-256',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    recordsCount: records.length,
    organizationsCount: organizations.length,
    photosCount: photos.length,
    checksum,
  }

  // Save last backup metadata locally
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(
        LAST_BACKUP_METADATA_KEY,
        JSON.stringify({
          lastBackupDate: exportedAt,
          recordsCount: records.length,
          organizationsCount: organizations.length,
          photosCount: photos.length,
          checksum: backupPayload.integrity.checksum,
        })
      )
    } catch (_) {}
  }

  return backupPayload
}

/**
 * Analyze an incoming backup and compare it against current live state.
 * Produces a clear pre-restore preview of new records, matching records, and conflicts.
 */
export const analyzeRestorePlan = ({
  incomingData,
  currentRecords = [],
  currentOrganizations = [],
  mode = 'merge',
}) => {
  const records = incomingData.records || []
  const organizations = incomingData.organizations || []
  const photos = incomingData.photos || []

  // Index existing records by composite tenant key: organizationId + '::' + recordId
  const existingRecordMap = new Map()
  currentRecords.forEach((r) => {
    if (r.recordId) {
      const key = `${r.organizationId || 'default'}::${r.recordId}`
      existingRecordMap.set(key, r)
    }
  })

  // Index existing organizations by org ID
  const existingOrgMap = new Map()
  currentOrganizations.forEach((o) => {
    if (o.id) existingOrgMap.set(o.id, o)
  })

  const newRecords = []
  const matchingRecords = []
  const conflicts = []

  for (const rec of records) {
    const key = `${rec.organizationId || 'default'}::${rec.recordId}`
    const existing = rec.recordId ? existingRecordMap.get(key) : null
    if (!existing) {
      newRecords.push(rec)
    } else {
      matchingRecords.push({ incoming: rec, existing })
      // Check if critical fields differ
      const fieldsDiffer =
        rec.fullName !== existing.fullName ||
        (rec.designation || rec.role) !== (existing.designation || existing.role) ||
        rec.department !== existing.department ||
        rec.organizationId !== existing.organizationId

      if (fieldsDiffer) {
        conflicts.push({
          recordId: rec.recordId,
          displayedId: rec.displayedId || rec.employeeId,
          incomingName: rec.fullName,
          existingName: existing.fullName,
          incomingOrg: rec.organizationId,
          existingOrg: existing.organizationId,
        })
      }
    }
  }

  const newOrgs = organizations.filter((o) => !existingOrgMap.has(o.id))
  const matchingOrgs = organizations.filter((o) => existingOrgMap.has(o.id))

  return {
    mode,
    incomingCounts: {
      records: records.length,
      organizations: organizations.length,
      photos: photos.length,
    },
    newRecordsCount: newRecords.length,
    matchingRecordsCount: matchingRecords.length,
    conflictsCount: conflicts.length,
    conflicts,
    newOrgsCount: newOrgs.length,
    matchingOrgsCount: matchingOrgs.length,
    unaffectedRecordsCount: currentRecords.length - matchingRecords.length,
  }
}

/**
 * Stage 5: Create a complete recovery snapshot of live application data before any restoration.
 * Captures master records, organizations, templates, active org, and an in-memory snapshot of IndexedDB photos.
 */
export const createRecoverySnapshot = async () => {
  const storage = getStorage()

  // Capture in-memory snapshot of IndexedDB photos
  const photoItems = await snapshotPhotosInMemory()

  const snapshot = {
    timestamp: new Date().toISOString(),
    records: getStoredEmployees(),
    organizations: getStoredOrganizations(),
    activeOrgId: getActiveOrganizationId(),
    templateSettings: getSavedTemplateSettings(),
    photoMeta: {
      count: Array.isArray(photoItems) ? photoItems.length : 0,
      captured: true,
    },
  }

  if (storage) {
    try {
      storage.setItem(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch (err) {
      console.warn('Could not write recovery snapshot to localStorage:', err)
    }
  }

  return snapshot
}

/**
 * Rollback live application state to the pre-restore recovery snapshot.
 * Restores records, organizations, active tenant, template settings, and IndexedDB photos.
 */
export const rollbackFromRecoverySnapshot = async () => {
  const storage = getStorage()
  if (!storage) throw new Error('Storage is not available for rollback.')

  const raw = storage.getItem(RECOVERY_SNAPSHOT_KEY)
  if (!raw) throw new Error('No recovery snapshot found.')

  let snapshot
  try {
    snapshot = JSON.parse(raw)
  } catch (parseErr) {
    throw new Error(`Rollback failed: Recovery snapshot contains invalid JSON: ${parseErr.message}`)
  }

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Rollback failed: Recovery snapshot root must be an object.')
  }

  // 1. Validate records
  if (!('records' in snapshot)) {
    throw new Error('Rollback failed: Recovery snapshot is missing "records" property.')
  }
  if (!Array.isArray(snapshot.records)) {
    throw new Error('Rollback failed: Recovery snapshot "records" must be an array.')
  }
  for (let i = 0; i < snapshot.records.length; i++) {
    const r = snapshot.records[i]
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      throw new Error(`Rollback failed: Malformed record entry at index ${i} in recovery snapshot.`)
    }
  }

  // 2. Validate organizations
  if (!('organizations' in snapshot)) {
    throw new Error('Rollback failed: Recovery snapshot is missing "organizations" property.')
  }
  if (!Array.isArray(snapshot.organizations)) {
    throw new Error('Rollback failed: Recovery snapshot "organizations" must be an array.')
  }
  for (let i = 0; i < snapshot.organizations.length; i++) {
    const o = snapshot.organizations[i]
    if (!o || typeof o !== 'object' || Array.isArray(o) || !o.id) {
      throw new Error(`Rollback failed: Malformed organization entry at index ${i} in recovery snapshot.`)
    }
  }

  // 3. Validate template settings
  if (!('templateSettings' in snapshot)) {
    throw new Error('Rollback failed: Recovery snapshot is missing "templateSettings" property.')
  }
  if (
    typeof snapshot.templateSettings !== 'object' ||
    snapshot.templateSettings === null ||
    Array.isArray(snapshot.templateSettings)
  ) {
    throw new Error('Rollback failed: Recovery snapshot "templateSettings" must be an object.')
  }

  // 4. Validate activeOrgId
  if (!('activeOrgId' in snapshot)) {
    throw new Error('Rollback failed: Recovery snapshot is missing "activeOrgId" property.')
  }
  if (snapshot.activeOrgId !== null && typeof snapshot.activeOrgId !== 'string') {
    throw new Error('Rollback failed: Recovery snapshot "activeOrgId" must be a string or null.')
  }

  // 5. Validate photo snapshot structure and required metadata
  if (snapshot.photoMeta !== undefined) {
    if (
      typeof snapshot.photoMeta !== 'object' ||
      snapshot.photoMeta === null ||
      Array.isArray(snapshot.photoMeta) ||
      typeof snapshot.photoMeta.count !== 'number'
    ) {
      throw new Error('Rollback failed: Recovery snapshot contains invalid photo metadata.')
    }
  }

  validatePhotoSnapshotInMemory(snapshot.photoMeta?.count)

  // ALL VALIDATIONS PASSED. Now safely execute rollback writes.
  saveStoredEmployees(snapshot.records, { throwOnError: true })
  saveStoredOrganizations(snapshot.organizations, { throwOnError: true })
  setActiveOrganizationId(snapshot.activeOrgId)
  saveTemplateSettings(snapshot.templateSettings, { throwOnError: true })

  // Rollback photos in IndexedDB from the in-memory snapshot
  await restorePhotosFromSnapshot()

  return { rolledBack: true, timestamp: snapshot.timestamp }
}

/**
 * Execute Staged Restoration.
 * 
 * Pipeline:
 * 1. Capture complete recovery snapshot (records, orgs, templates, and IndexedDB photos).
 * 2. Validate structure, schema & SHA-256 integrity metadata.
 * 3. Apply changes (Mode A: Merge & Update, Mode B: Replace All).
 * 4. Verify restored record & photo integrity.
 * 5. Rollback to recovery snapshot if any failure occurs at any stage.
 *
 * Storage boundary note:
 * Because localStorage and IndexedDB are separate browser storage engines without cross-database
 * transactions, atomicity is provided via staged restoration and automatic snapshot rollback
 * rather than a single database engine transaction.
 */
export const executeStagedRestore = async ({
  backupData,
  mode = 'merge', // 'merge' | 'replace'
  conflictResolution = 'incoming', // 'incoming' | 'preserve'
}) => {
  // Step 1: Create Recovery Snapshot BEFORE performing any modifications
  await createRecoverySnapshot()

  try {
    // Step 2: Validate structure & schema
    const validation = validateBackupStructure(backupData)
    if (!validation.isValid) {
      throw new Error(`Restore rejected: ${validation.error}`)
    }

    const data = validation.data
    const incomingRecords = data.records || []
    const incomingOrgs = data.organizations || []
    const incomingPhotos = data.photos || []

    if (incomingRecords.length === 0) {
      throw new Error('Restore rejected: Backup contains 0 records.')
    }

    let finalRecords = []
    let finalOrgs = []

    const hasIndexedDB = typeof window !== 'undefined' && Boolean(window.indexedDB)

    if (mode === 'replace') {
      // MODE B: REPLACE ALL
      // 1. Clear existing IndexedDB photos
      if (hasIndexedDB) {
        await clearAllPhotosFromDB()
      }

      // 2. Import incoming photos
      if (hasIndexedDB && incomingPhotos.length > 0) {
        await importPhotosFromBase64(incomingPhotos)
      }

      // 3. Set organizations
      finalOrgs = incomingOrgs.length > 0 ? incomingOrgs : getStoredOrganizations()
      saveStoredOrganizations(finalOrgs, { throwOnError: true })

      // 4. Set records
      finalRecords = incomingRecords
      saveStoredEmployees(finalRecords, { throwOnError: true })

      // 5. Restore template settings if present
      if (data.templateSettings) {
        saveTemplateSettings(data.templateSettings, { throwOnError: true })
      }

      // 6. Switch active org
      if (data.activeOrgId) {
        setActiveOrganizationId(data.activeOrgId)
      }
    } else {
      // MODE A: MERGE & UPDATE
      const currentRecords = getStoredEmployees()
      const currentOrgs = getStoredOrganizations()

      // Merge Organizations: Add missing orgs; preserve existing
      const existingOrgIdMap = new Map(currentOrgs.map((o) => [o.id, o]))
      for (const org of incomingOrgs) {
        if (!existingOrgIdMap.has(org.id)) {
          existingOrgIdMap.set(org.id, org)
        } else if (conflictResolution === 'incoming' && !existingOrgIdMap.get(org.id).isImmutableBranding) {
          existingOrgIdMap.set(org.id, { ...existingOrgIdMap.get(org.id), ...org })
        }
      }
      finalOrgs = Array.from(existingOrgIdMap.values())
      saveStoredOrganizations(finalOrgs, { throwOnError: true })

      // Merge Records: Match strictly by composite tenant key (organizationId + '::' + recordId)
      const recordMap = new Map(
        currentRecords.map((r) => [`${r.organizationId || 'default'}::${r.recordId}`, r])
      )
      for (const rec of incomingRecords) {
        const compositeKey = `${rec.organizationId || 'default'}::${rec.recordId}`
        if (!recordMap.has(compositeKey)) {
          // Add new record
          recordMap.set(compositeKey, rec)
        } else if (conflictResolution === 'incoming') {
          // Update matching record
          const existing = recordMap.get(compositeKey)
          recordMap.set(compositeKey, { ...existing, ...rec })
        }
      }
      finalRecords = Array.from(recordMap.values())
      saveStoredEmployees(finalRecords, { throwOnError: true })

      // Import incoming photos into IndexedDB (put adds/updates without clearing other org photos)
      if (hasIndexedDB && incomingPhotos.length > 0) {
        await importPhotosFromBase64(incomingPhotos)
      }
    }

    // Step 5: Post-Restore Verification - verify actual persisted storage
    const persistedRecords = getStoredEmployees()
    const persistedOrgs = getStoredOrganizations()

    // 5.1 Verification of Records (Count, Keys, and Canonical Field Values)
    if (persistedRecords.length !== finalRecords.length) {
      throw new Error(
        `Verification failure: Restored record count mismatch (expected ${finalRecords.length}, persisted ${persistedRecords.length}).`
      )
    }

    const getRecordKey = (r) =>
      `${r?.organizationId || 'default'}::${r?.recordId || r?.displayedId || r?.employeeId || r?.id || ''}`

    const sortRecords = (arr) =>
      [...arr].sort((a, b) => {
        const keyA = getRecordKey(a)
        const keyB = getRecordKey(b)
        const cmp = keyA.localeCompare(keyB)
        if (cmp !== 0) return cmp
        return JSON.stringify(canonicalize(a)).localeCompare(JSON.stringify(canonicalize(b)))
      })

    const sortedExpectedRecords = sortRecords(finalRecords)
    const sortedPersistedRecords = sortRecords(persistedRecords)

    for (let i = 0; i < sortedExpectedRecords.length; i++) {
      const expectedRec = sortedExpectedRecords[i]
      const actualRec = sortedPersistedRecords[i]

      const expKey = getRecordKey(expectedRec)
      const actKey = getRecordKey(actualRec)

      if (expKey !== actKey) {
        throw new Error(
          `Verification failure: Record identifier mismatch at index ${i} (expected "${expKey}", persisted "${actKey}").`
        )
      }

      const expCanonical = JSON.stringify(canonicalize(expectedRec))
      const actCanonical = JSON.stringify(canonicalize(actualRec))

      if (expCanonical !== actCanonical) {
        throw new Error(
          `Verification failure: Record data mismatch for record "${expKey}".`
        )
      }
    }

    // 5.2 Verification of Organizations (Count, Keys, and Canonical Field Values)
    const expectedOrgs = finalOrgs.map(hydrateOrgAssets)
    if (
      finalRecords.some((r) => r.organizationId === 'unassigned-legacy' || !r.organizationId) &&
      !expectedOrgs.some((o) => o.id === 'unassigned-legacy')
    ) {
      expectedOrgs.push(UNASSIGNED_LEGACY_ORG)
    }

    const actualOrgs = persistedOrgs.map(hydrateOrgAssets)

    if (actualOrgs.length !== expectedOrgs.length) {
      throw new Error(
        `Verification failure: Restored organization count mismatch (expected ${expectedOrgs.length}, persisted ${actualOrgs.length}).`
      )
    }

    const getOrgKey = (o) => String(o?.id || '')
    const sortOrgs = (arr) =>
      [...arr].sort((a, b) => {
        const keyA = getOrgKey(a)
        const keyB = getOrgKey(b)
        const cmp = keyA.localeCompare(keyB)
        if (cmp !== 0) return cmp
        return JSON.stringify(canonicalize(a)).localeCompare(JSON.stringify(canonicalize(b)))
      })

    const sortedExpectedOrgs = sortOrgs(expectedOrgs)
    const sortedPersistedOrgs = sortOrgs(actualOrgs)

    for (let i = 0; i < sortedExpectedOrgs.length; i++) {
      const expectedOrg = sortedExpectedOrgs[i]
      const actualOrg = sortedPersistedOrgs[i]

      const expKey = getOrgKey(expectedOrg)
      const actKey = getOrgKey(actualOrg)

      if (expKey !== actKey) {
        throw new Error(
          `Verification failure: Organization identifier mismatch at index ${i} (expected "${expKey}", persisted "${actKey}").`
        )
      }

      const expCanonical = JSON.stringify(canonicalize(expectedOrg))
      const actCanonical = JSON.stringify(canonicalize(actualOrg))

      if (expCanonical !== actCanonical) {
        throw new Error(
          `Verification failure: Organization data mismatch for organization "${expKey}".`
        )
      }
    }

    // 5.3 Verification of Template Settings (when part of restore operation)
    if (data.templateSettings && mode === 'replace') {
      const storage = getStorage()
      if (!storage) {
        throw new Error('Verification failure: Storage is unavailable to verify template settings.')
      }

      const raw = storage.getItem(TEMPLATE_STORAGE_KEY)
      if (raw === null || raw === undefined) {
        throw new Error('Verification failure: Template settings were not persisted to localStorage.')
      }

      let persistedTemplateSettings
      try {
        persistedTemplateSettings = JSON.parse(raw)
      } catch (parseErr) {
        throw new Error(
          `Verification failure: Persisted template settings contain invalid JSON: ${parseErr.message}`
        )
      }

      if (
        typeof persistedTemplateSettings !== 'object' ||
        persistedTemplateSettings === null ||
        Array.isArray(persistedTemplateSettings)
      ) {
        throw new Error('Verification failure: Persisted template settings must be an object.')
      }

      const expectedTemplateCanonical = JSON.stringify(canonicalize(data.templateSettings))
      const actualTemplateCanonical = JSON.stringify(canonicalize(persistedTemplateSettings))

      if (expectedTemplateCanonical !== actualTemplateCanonical) {
        throw new Error('Verification failure: Template settings were not persisted correctly.')
      }
    }

    // 5.4 Verification of Active Organization ID
    if (data.activeOrgId && mode === 'replace') {
      const persistedActiveOrgId = getActiveOrganizationId()
      if (persistedActiveOrgId !== data.activeOrgId) {
        throw new Error(
          `Verification failure: Active organization ID mismatch (expected "${data.activeOrgId}", persisted "${persistedActiveOrgId}").`
        )
      }
    }

    // Photo Readability Check (if photos exist and in browser environment)
    if (incomingPhotos.length > 0 && typeof window !== 'undefined' && window.indexedDB) {
      const samplePhoto = incomingPhotos[0]
      const parsed = parsePhotoKey(samplePhoto.photoKey || samplePhoto.employeeId || '')
      const testPhoto = await getPhotoFromDB(parsed.organizationId, parsed.recordId)
      if (testPhoto && testPhoto.blob) {
        const testUrl = URL.createObjectURL(testPhoto.blob)
        URL.revokeObjectURL(testUrl)
      }
    }

    return {
      success: true,
      mode,
      recordsCount: finalRecords.length,
      organizationsCount: finalOrgs.length,
      photosCount: incomingPhotos.length,
    }
  } catch (err) {
    // Stage 6: Rollback on any failure
    console.error('Restore operation failed. Rolling back to recovery snapshot...', err)
    let rollbackError = null
    try {
      await rollbackFromRecoverySnapshot()
    } catch (rbErr) {
      rollbackError = rbErr
      console.error('Fatal: Rollback also failed:', rbErr)
    }

    const restoreMsg = err?.message || 'Unknown restoration error'

    if (rollbackError) {
      const rollbackMsg = rollbackError?.message || 'Unknown rollback error'
      const fatalError = new Error(
        `Critical: Restoration failed (${restoreMsg}) AND automatic rollback also failed (${rollbackMsg}). Please reload the application and verify your data.`
      )
      fatalError.restoreError = err
      fatalError.rollbackError = rollbackError
      throw fatalError
    }

    const cleanError = new Error(
      `Restoration failed and changes were safely rolled back: ${restoreMsg}`
    )
    cleanError.restoreError = err
    throw cleanError
  }
}

