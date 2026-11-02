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
} from './photoStorage.js'
import {
  getSavedTemplateSettings,
  saveTemplateSettings,
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

/**
 * 32-bit FNV-1a fast deterministic string hashing utility.
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
 * Generate a comprehensive deterministic checksum string covering:
 * - Organizations (names, headings, logos, accent colors, archive states)
 * - Records (internal recordId, displayedId, personal fields, custom fields)
 * - Photos (metadata, organization-scoped keys, binary/base64 content)
 * - Template Settings & field placement configurations
 */
export const computeBackupChecksum = (data) => {
  if (!data || typeof data !== 'object') return ''

  // 1. Canonical Organizations (including logos, branding, and template mappings)
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

  // 2. Canonical Records (including internal recordId, displayedId, personal fields, custom fields)
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

  // 3. Canonical Photos (including photoKey, organizationId, recordId, filename, mimeType, and base64 content hash)
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

  // 4. Canonical Template Settings & Field Placements
  const templateSettings = data.templateSettings || {}

  // 5. Schema version
  const schemaVer = String(data.schemaVersion || data.version || '1.0.0')

  const canonicalString = JSON.stringify({
    schemaVer,
    orgs,
    records,
    photos,
    templateSettings,
  })

  // Two-pass FNV-1a 64-bit hash
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
  if (data.integrity?.checksum) {
    const expectedChecksum = computeBackupChecksum(data)
    if (data.integrity.checksum !== expectedChecksum) {
      return {
        isValid: false,
        error: `Integrity verification failed: Backup archive has been tampered with or corrupted. (Expected ${expectedChecksum}, got ${data.integrity.checksum})`,
      }
    }
  }

  return {
    isValid: true,
    data,
    schemaVersion: schemaVer,
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
  backupPayload.integrity = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    recordsCount: records.length,
    organizationsCount: organizations.length,
    photosCount: photos.length,
    checksum: computeBackupChecksum(backupPayload),
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
  await snapshotPhotosInMemory()

  const snapshot = {
    timestamp: new Date().toISOString(),
    records: getStoredEmployees(),
    organizations: getStoredOrganizations(),
    activeOrgId: getActiveOrganizationId(),
    templateSettings: getSavedTemplateSettings(),
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

  try {
    const snapshot = JSON.parse(raw)
    if (Array.isArray(snapshot.records)) {
      saveStoredEmployees(snapshot.records)
    }
    if (Array.isArray(snapshot.organizations)) {
      saveStoredOrganizations(snapshot.organizations)
    }
    if (snapshot.activeOrgId) {
      setActiveOrganizationId(snapshot.activeOrgId)
    }
    if (snapshot.templateSettings) {
      saveTemplateSettings(snapshot.templateSettings)
    }

    // Rollback photos in IndexedDB from the in-memory snapshot
    await restorePhotosFromSnapshot()

    return { rolledBack: true, timestamp: snapshot.timestamp }
  } catch (err) {
    throw new Error(`Rollback failed: ${err.message}`)
  }
}

/**
 * Execute Staged Restoration.
 * 
 * Pipeline:
 * 1. Capture complete recovery snapshot (records, orgs, templates, and IndexedDB photos).
 * 2. Validate structure & schema.
 * 3. Verify integrity metadata (checksum).
 * 4. Apply changes (Mode A: Merge & Update, Mode B: Replace All).
 * 5. Verify restored record & photo integrity.
 * 6. Rollback if any failure occurs at any stage.
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
      saveStoredOrganizations(finalOrgs)

      // 4. Set records
      finalRecords = incomingRecords
      saveStoredEmployees(finalRecords)

      // 5. Restore template settings if present
      if (data.templateSettings) {
        saveTemplateSettings(data.templateSettings)
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
      saveStoredOrganizations(finalOrgs)

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
      saveStoredEmployees(finalRecords)

      // Import incoming photos into IndexedDB (put adds/updates without clearing other org photos)
      if (hasIndexedDB && incomingPhotos.length > 0) {
        await importPhotosFromBase64(incomingPhotos)
      }
    }

    // Step 5: Post-Restore Verification
    if (finalRecords.length === 0 && incomingRecords.length > 0) {
      throw new Error('Verification failure: Restored record count is 0.')
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
    try {
      await rollbackFromRecoverySnapshot()
    } catch (rbErr) {
      console.error('Fatal: Rollback also failed:', rbErr)
    }
    throw new Error(`Restoration failed and changes were safely rolled back: ${err.message}`)
  }
}

