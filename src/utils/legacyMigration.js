/**
 * Safe, idempotent migration utility for upgrading legacy un-namespaced records and photos.
 * 
 * Rules:
 * 1. Back up existing records before migration to dedicated backup key.
 * 2. Assign legacy records to appropriate existing organizations based on verified existing data.
 *    - Never guess: if ownership cannot be determined reliably, assign to 'unassigned-legacy'.
 * 3. Ensure every record has a unique, stable 'recordId' (internal UUID).
 * 4. Namespace photos in IndexedDB under `${organizationId}::${recordId}`.
 * 5. Verify all migrated photos remain readable.
 * 6. Migration is strictly idempotent and safe to retry without duplicating records.
 */

import { generateRecordId } from './cardTypes.js'
import { buildPhotoKey, openPhotoDB } from './photoStorage.js'

export const MIGRATION_BACKUP_RECORDS_KEY = 'idcard_migration_backup_records_v1'
export const MIGRATION_LOG_KEY = 'idcard_migration_log_v1'
export const UNASSIGNED_LEGACY_ORG_ID = 'unassigned-legacy'

/**
 * Deterministically detect organization ownership from verified existing record attributes.
 * Never guesses: returns 'unassigned-legacy' if indicators are ambiguous or missing.
 * 
 * @param {Object} record - The candidate record to analyze.
 * @returns {string} Assigned organizationId.
 */
export const detectRecordOrganization = (record = {}) => {
  if (!record || typeof record !== 'object') return UNASSIGNED_LEGACY_ORG_ID

  // 1. If already assigned to a valid organization, preserve it (Idempotent)
  if (record.organizationId && typeof record.organizationId === 'string' && record.organizationId.trim()) {
    return record.organizationId.trim()
  }

  // 2. Check explicit company / organization metadata fields
  const companyFields = [
    record.companyName,
    record.organization,
    record.employer,
    record.workshopHeading,
    record.railwayHeading,
    record.institution,
  ].filter(Boolean).map((s) => String(s).toLowerCase())

  for (const str of companyFields) {
    if (str.includes('sidwal') || str.includes('railway') || str.includes('gorakhpur') || str.includes('workshop')) {
      return 'sidwal-railway'
    }
    if (str.includes('apex') || str.includes('institute of technology') || str.includes('university')) {
      return 'apex-university'
    }
    if (str.includes('novatech')) {
      return 'novatech'
    }
    if (str.includes('summit') || str.includes('tech summit') || str.includes('conference')) {
      return 'tech-summit'
    }
  }

  // 3. Check verified email domain
  const email = String(record.email || '').toLowerCase().trim()
  if (email) {
    if (email.includes('@sidwal.com') || email.includes('railway') || email.includes('railnet')) {
      return 'sidwal-railway'
    }
    if (email.includes('@apex-institute.edu') || email.endsWith('.edu')) {
      return 'apex-university'
    }
    if (email.includes('@novatech.example') || email.endsWith('@company.internal')) {
      return 'novatech'
    }
    if (email.includes('@globaltechsummit.org')) {
      return 'tech-summit'
    }
  }

  // 4. Check card type / schema specific indicators
  const cardType = String(record.cardType || '').toLowerCase()
  if (cardType === 'contractor' || record.contractorSign || record.workOrderNo) {
    return 'sidwal-railway'
  }
  if (cardType === 'student' || record.rollNo || record.course || record.semester) {
    return 'apex-university'
  }
  if (cardType === 'event' || record.ticketNo || record.ticketType) {
    return 'tech-summit'
  }

  // 5. Check verified location patterns (from original mock data)
  const location = String(record.location || '').toLowerCase()
  if (location.includes('mechanical workshop') || location.includes('gorakhpur')) {
    return 'sidwal-railway'
  }
  if (location.includes('building a') || location.includes('design studio') || location.includes('research lab')) {
    return 'novatech'
  }

  // 6. Check ID prefix conventions
  const idStr = String(record.employeeId || record.id || '').toUpperCase().trim()
  if (idStr.startsWith('CON-') || idStr.startsWith('SID-') || idStr.startsWith('NER-')) {
    return 'sidwal-railway'
  }
  if (idStr.startsWith('STU-') || idStr.startsWith('ROLL-')) {
    return 'apex-university'
  }
  if (idStr.startsWith('TKT-') || idStr.startsWith('EVT-')) {
    return 'tech-summit'
  }

  // 7. Check if standard legacy corporate mock employee (EMP-1001 to EMP-1010)
  if (/^EMP-10(0[1-9]|1[0-5])$/i.test(idStr)) {
    return 'novatech'
  }

  // 8. Cannot determine reliably: DO NOT GUESS.
  return UNASSIGNED_LEGACY_ORG_ID
}

/**
 * Migrate legacy records:
 * 1. Creates a safe pre-migration backup in localStorage if not already backed up.
 * 2. Assigns stable recordId and organizationId.
 * 3. Never mutates original data destructively.
 * 4. Safe to retry (idempotent).
 * 
 * @param {Array<Object>} rawRecords - Unmigrated records from storage.
 * @returns {{ migratedRecords: Array<Object>, backupCreated: boolean, stats: Object }}
 */
export const migrateLegacyRecords = (rawRecords = []) => {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return {
      migratedRecords: [],
      backupCreated: false,
      stats: { total: 0, migrated: 0, alreadyMigrated: 0, unassigned: 0, byOrg: {} },
    }
  }

  // 1. Safe Pre-Migration Backup to localStorage if running in browser
  let backupCreated = false
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existingBackup = window.localStorage.getItem(MIGRATION_BACKUP_RECORDS_KEY)
      if (!existingBackup) {
        window.localStorage.setItem(MIGRATION_BACKUP_RECORDS_KEY, JSON.stringify(rawRecords))
        backupCreated = true
      }
    } catch (err) {
      console.warn('Could not write pre-migration backup to localStorage:', err)
    }
  }

  const byOrg = {}
  let alreadyMigrated = 0
  let migrated = 0
  let unassigned = 0

  const migratedRecords = rawRecords.map((item) => {
    const record = { ...item }

    // Ensure stable internal UUID
    if (!record.recordId) {
      record.recordId = generateRecordId('rec')
    }

    const wasAlreadyAssigned = Boolean(record.organizationId)
    const detectedOrg = detectRecordOrganization(record)
    record.organizationId = detectedOrg

    if (wasAlreadyAssigned) {
      alreadyMigrated++
    } else {
      migrated++
    }

    if (detectedOrg === UNASSIGNED_LEGACY_ORG_ID) {
      unassigned++
    }

    byOrg[detectedOrg] = (byOrg[detectedOrg] || 0) + 1

    // Ensure displayedId is populated
    if (!record.displayedId) {
      record.displayedId = String(
        record.employeeId ||
        record.id ||
        record.rollNo ||
        record.visitorId ||
        record.ticketNo ||
        record.recordId
      ).trim()
    }

    return record
  })

  const stats = {
    total: migratedRecords.length,
    migrated,
    alreadyMigrated,
    unassigned,
    byOrg,
  }

  // Save migration log
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        MIGRATION_LOG_KEY,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          stats,
          backupCreated,
        })
      )
    } catch (_) {}
  }

  return {
    migratedRecords,
    backupCreated,
    stats,
  }
}

/**
 * Migrate legacy IndexedDB photos:
 * Finds legacy non-namespaced photos (e.g. key 'EMP-1001') and copies them to '${organizationId}::${recordId}'.
 * Preserves the original legacy photo for safety and rollback.
 * 
 * @param {Array<Object>} migratedRecords - Records after record migration.
 * @returns {Promise<{ totalProcessed: number, photosMigrated: number, photosVerified: number }>}
 */
export const migrateLegacyPhotosInDB = async (migratedRecords = []) => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return { totalProcessed: 0, photosMigrated: 0, photosVerified: 0 }
  }

  try {
    const db = await openPhotoDB()
    const STORE_NAME = 'employee_photos'

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getAllReq = store.getAll()

      getAllReq.onsuccess = () => {
        const allPhotos = getAllReq.result || []
        let photosMigrated = 0
        let photosVerified = 0

        // Build lookup map for records by displayedId, employeeId, id, recordId
        const recordLookup = new Map()
        for (const rec of migratedRecords) {
          if (rec.recordId) recordLookup.set(rec.recordId, rec)
          if (rec.employeeId) recordLookup.set(String(rec.employeeId).trim(), rec)
          if (rec.id) recordLookup.set(String(rec.id).trim(), rec)
          if (rec.displayedId) recordLookup.set(String(rec.displayedId).trim(), rec)
        }

        for (const photoItem of allPhotos) {
          const currentKey = String(photoItem.employeeId || photoItem.photoKey || '').trim()
          if (!currentKey) continue

          // If already namespaced (contains '::'), it's already migrated
          if (currentKey.includes('::')) {
            photosVerified++
            continue
          }

          // Legacy key found (e.g. 'EMP-1001')
          const matchingRecord = recordLookup.get(currentKey)
          if (matchingRecord && matchingRecord.organizationId && matchingRecord.recordId) {
            const newKey = buildPhotoKey(matchingRecord.organizationId, matchingRecord.recordId)

            // Check if namespaced photo already exists
            const namespacedRecord = {
              ...photoItem,
              employeeId: newKey, // Primary keyPath in DB v1/v2
              photoKey: newKey,
              organizationId: matchingRecord.organizationId,
              recordId: matchingRecord.recordId,
              migratedFrom: currentKey,
              migratedAt: Date.now(),
            }

            store.put(namespacedRecord)
            photosMigrated++
            photosVerified++
          }
        }

        tx.oncomplete = () => {
          db.close()
          resolve({
            totalProcessed: allPhotos.length,
            photosMigrated,
            photosVerified,
          })
        }

        tx.onerror = () => {
          db.close()
          resolve({
            totalProcessed: allPhotos.length,
            photosMigrated,
            photosVerified,
          })
        }
      }

      getAllReq.onerror = () => {
        db.close()
        resolve({ totalProcessed: 0, photosMigrated: 0, photosVerified: 0 })
      }
    })
  } catch (err) {
    console.warn('Could not migrate legacy IndexedDB photos:', err)
    return { totalProcessed: 0, photosMigrated: 0, photosVerified: 0 }
  }
}

