/**
 * IndexedDB persistent storage utility for photos with strict multi-organization tenant isolation.
 * Stores binary image Blobs namespaced by `${organizationId}::${recordId}`.
 * Does NOT use localStorage for heavy image data.
 */

const DB_NAME = 'EmployeeIdCardPhotosDB'
const DB_VERSION = 2
const STORE_NAME = 'employee_photos'

/**
 * Build a stable namespaced photo storage key.
 * Format: `${organizationId}::${recordId}`
 * 
 * @param {string} organizationId
 * @param {string} recordId
 * @returns {string}
 */
export const buildPhotoKey = (organizationId = 'default', recordId = '') => {
  const cleanOrg = String(organizationId || 'default').trim()
  const cleanRecord = String(recordId || '').trim()
  if (!cleanRecord) return ''
  return `${cleanOrg}::${cleanRecord}`
}

/**
 * Parse an existing photo storage key into organizationId and recordId.
 * 
 * @param {string} photoKey
 * @returns {{ organizationId: string, recordId: string }}
 */
export const parsePhotoKey = (photoKey = '') => {
  if (!photoKey || typeof photoKey !== 'string') {
    return { organizationId: '', recordId: '' }
  }
  const sepIdx = photoKey.indexOf('::')
  if (sepIdx === -1) {
    return { organizationId: '', recordId: photoKey }
  }
  return {
    organizationId: photoKey.slice(0, sepIdx),
    recordId: photoKey.slice(sepIdx + 2),
  }
}

/**
 * Open or upgrade the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export const openPhotoDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      // In non-browser environments (e.g. Node.js unit tests), reject gracefully
      reject(new Error('IndexedDB is not available in this environment.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      let store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with employeeId as primary key (holds namespaced key in v2)
        store = db.createObjectStore(STORE_NAME, { keyPath: 'employeeId' })
      } else {
        store = event.target.transaction.objectStore(STORE_NAME)
      }

      if (!store.indexNames.contains('organizationId')) {
        store.createIndex('organizationId', 'organizationId', { unique: false })
      }
      if (!store.indexNames.contains('recordId')) {
        store.createIndex('recordId', 'recordId', { unique: false })
      }
      if (!store.indexNames.contains('photoKey')) {
        store.createIndex('photoKey', 'photoKey', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      resolve(event.target.result)
    }

    request.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB: ${event.target.error?.message || 'Unknown error'}`))
    }
  })
}

/**
 * Save an employee/member photo blob to IndexedDB namespaced by organization.
 * Supports signatures:
 *   savePhotoToDB(organizationId, recordId, fileOrBlob, filename)
 *   savePhotoToDB(legacyKey, fileOrBlob, filename) [backward compatibility]
 * 
 * @param {string} orgIdOrKey - Organization ID or combined photo key.
 * @param {string|Blob|File} recordIdOrBlob - Record ID or file blob if legacy.
 * @param {Blob|File|string} [fileOrBlob] - Image blob or file.
 * @param {string} [filename] - Original filename.
 * @returns {Promise<{ photoKey: string, employeeId: string, filename: string, size: number }>}
 */
export const savePhotoToDB = async (orgIdOrKey, recordIdOrBlob, fileOrBlob, filename = '') => {
  let organizationId = 'default'
  let recordId = ''
  let actualBlob = fileOrBlob
  let actualFilename = filename

  // Check if called with legacy signature: savePhotoToDB(legacyKey, blob, filename)
  if (
    recordIdOrBlob &&
    (recordIdOrBlob instanceof Blob ||
      (typeof File !== 'undefined' && recordIdOrBlob instanceof File) ||
      (typeof recordIdOrBlob === 'object' && recordIdOrBlob.size !== undefined))
  ) {
    const parsed = parsePhotoKey(orgIdOrKey)
    organizationId = parsed.organizationId || 'default'
    recordId = parsed.recordId || orgIdOrKey
    actualBlob = recordIdOrBlob
    actualFilename = typeof fileOrBlob === 'string' ? fileOrBlob : actualBlob.name || ''
  } else {
    organizationId = String(orgIdOrKey || 'default').trim()
    recordId = String(recordIdOrBlob || '').trim()
    actualBlob = fileOrBlob
    actualFilename = filename || actualBlob?.name || `${recordId}.jpg`
  }

  const storageKey = buildPhotoKey(organizationId, recordId)
  const db = await openPhotoDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const record = {
      employeeId: storageKey, // keyPath for IndexedDB object store
      photoKey: storageKey,
      organizationId,
      recordId,
      blob: actualBlob,
      mimeType: actualBlob?.type || 'image/jpeg',
      filename: actualFilename || `${recordId}.jpg`,
      size: actualBlob?.size || 0,
      updatedAt: Date.now(),
    }

    const request = store.put(record)

    request.onsuccess = () => {
      resolve({
        photoKey: record.photoKey,
        employeeId: record.employeeId,
        organizationId: record.organizationId,
        recordId: record.recordId,
        filename: record.filename,
        size: record.size,
      })
    }

    request.onerror = (event) => {
      reject(new Error(`Error saving photo for ${storageKey}: ${event.target.error?.message}`))
    }

    tx.oncomplete = () => db.close()
  })
}

/**
 * Batch save multiple photos in a single IndexedDB transaction.
 * Supports items with { organizationId, recordId, fileOrBlob, filename }.
 * 
 * @param {Array<{ organizationId?: string, recordId?: string, employeeId?: string, fileOrBlob: Blob|File, filename: string }>} records
 * @returns {Promise<number>} Number of successfully saved photos.
 */
export const savePhotoBatchToDB = async (records = []) => {
  if (records.length === 0) return 0
  const db = await openPhotoDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    let savedCount = 0

    for (const item of records) {
      if (!item.fileOrBlob) continue
      const orgId = item.organizationId || parsePhotoKey(item.employeeId || '').organizationId || 'default'
      const recId = item.recordId || parsePhotoKey(item.employeeId || '').recordId || item.employeeId
      if (!recId) continue

      const storageKey = buildPhotoKey(orgId, recId)
      const record = {
        employeeId: storageKey,
        photoKey: storageKey,
        organizationId: orgId,
        recordId: recId,
        blob: item.fileOrBlob,
        mimeType: item.fileOrBlob.type || 'image/jpeg',
        filename: item.filename || item.fileOrBlob.name || `${recId}.jpg`,
        size: item.fileOrBlob.size || 0,
        updatedAt: Date.now(),
      }
      store.put(record)
      savedCount++
    }

    tx.oncomplete = () => {
      db.close()
      resolve(savedCount)
    }

    tx.onerror = (event) => {
      db.close()
      reject(new Error(`Batch photo save failed: ${event.target.error?.message}`))
    }
  })
}

/**
 * Retrieve a photo record for a given organizationId and recordId from IndexedDB.
 * Supports:
 *   getPhotoFromDB(organizationId, recordId)
 *   getPhotoFromDB(namespacedPhotoKey)
 * 
 * @param {string} orgIdOrKey
 * @param {string} [recordId]
 * @returns {Promise<{ employeeId: string, photoKey: string, blob: Blob, filename: string, size: number } | null>}
 */
export const getPhotoFromDB = async (orgIdOrKey, recordId) => {
  const db = await openPhotoDB()
  const storageKey = recordId
    ? buildPhotoKey(orgIdOrKey, recordId)
    : String(orgIdOrKey).trim()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(storageKey)

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result)
      } else {
        // Fallback: check if stored under legacy un-namespaced recordId
        const parsed = parsePhotoKey(storageKey)
        if (parsed.recordId && parsed.recordId !== storageKey) {
          const fallbackReq = store.get(parsed.recordId)
          fallbackReq.onsuccess = () => resolve(fallbackReq.result || null)
          fallbackReq.onerror = () => resolve(null)
        } else {
          resolve(null)
        }
      }
    }

    request.onerror = (event) => {
      reject(new Error(`Failed to retrieve photo: ${event.target.error?.message}`))
    }

    tx.oncomplete = () => db.close()
  })
}

/**
 * Retrieve all photos stored in IndexedDB and return map of Object URLs.
 * If targetOrganizationId is specified, filters photos scoped to that organization.
 * 
 * @param {string|null} [targetOrganizationId=null] - Optional organizationId to filter by.
 * @returns {Promise<{ [key: string]: { url: string, filename: string, size: number, recordId: string, organizationId: string } }>}
 */
export const getAllPhotoUrlsFromDB = async (targetOrganizationId = null) => {
  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result || []
        const urlMap = {}

        for (const item of results) {
          if (!item.blob) continue
          const orgId = item.organizationId || parsePhotoKey(item.employeeId || '').organizationId || ''
          const recId = item.recordId || parsePhotoKey(item.employeeId || '').recordId || item.employeeId

          // If targetOrganizationId is provided, filter strictly
          if (targetOrganizationId && orgId && orgId !== targetOrganizationId) {
            continue
          }

          try {
            const objectUrl = URL.createObjectURL(item.blob)
            const metadata = {
              url: objectUrl,
              filename: item.filename,
              size: item.size,
              updatedAt: item.updatedAt,
              recordId: recId,
              organizationId: orgId,
            }

            // Index by photoKey
            const fullKey = item.photoKey || item.employeeId
            if (fullKey) urlMap[fullKey] = metadata

            // Also index by recordId for convenient component lookups within the organization
            if (recId) urlMap[recId] = metadata
          } catch (err) {
            console.warn(`Failed to create object URL for ${item.employeeId}:`, err)
          }
        }

        resolve(urlMap)
      }

      request.onerror = (event) => {
        reject(new Error(`Failed to read all photos: ${event.target.error?.message}`))
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('IndexedDB not accessible, returning empty photo map:', error.message)
    return {}
  }
}

/**
 * Delete a photo for a given organizationId and recordId from IndexedDB.
 * 
 * @param {string} orgIdOrKey
 * @param {string} [recordId]
 * @returns {Promise<boolean>}
 */
export const deletePhotoFromDB = async (orgIdOrKey, recordId) => {
  const db = await openPhotoDB()
  const storageKey = recordId
    ? buildPhotoKey(orgIdOrKey, recordId)
    : String(orgIdOrKey).trim()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(storageKey)

    request.onsuccess = () => {
      resolve(true)
    }

    request.onerror = (event) => {
      reject(new Error(`Failed to delete photo: ${event.target.error?.message}`))
    }

    tx.oncomplete = () => db.close()
  })
}

/**
 * Delete all photos associated with a specific organization from IndexedDB.
 * Never touches photos belonging to any other organization.
 * 
 * @param {string} targetOrgId
 * @returns {Promise<number>} Number of photos deleted.
 */
export const deletePhotosByOrganization = async (targetOrgId) => {
  const cleanOrg = String(targetOrgId || '').trim()
  if (!cleanOrg) return 0

  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result || []
        let deletedCount = 0

        for (const item of results) {
          const parsed = parsePhotoKey(item.photoKey || item.employeeId || '')
          const orgId = item.organizationId || parsed.organizationId || ''

          if (orgId === cleanOrg || item.employeeId?.startsWith(`${cleanOrg}::`)) {
            store.delete(item.employeeId)
            deletedCount++
          }
        }

        resolve(deletedCount)
      }

      request.onerror = (event) => {
        reject(new Error(`Failed to delete organization photos: ${event.target.error?.message}`))
      }

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.warn(`Could not delete photos for org ${cleanOrg}:`, err)
    return 0
  }
}

/**
 * Reassign photos from one organization to another in IndexedDB.
 * Preserves the binary Blob, filename, size, and recordId.
 * 
 * @param {string} fromOrgId
 * @param {string} toOrgId
 * @param {Array<string>|null} [recordIds=null] - Optional list of specific recordIds to reassign.
 * @returns {Promise<number>} Number of photos migrated.
 */
export const reassignPhotosOrg = async (fromOrgId, toOrgId, recordIds = null) => {
  const cleanFrom = String(fromOrgId || '').trim()
  const cleanTo = String(toOrgId || '').trim()
  if (!cleanFrom || !cleanTo || cleanFrom === cleanTo) return 0

  const targetRecSet = Array.isArray(recordIds) && recordIds.length > 0
    ? new Set(recordIds.map(String))
    : null

  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result || []
        let migratedCount = 0

        for (const item of results) {
          const parsed = parsePhotoKey(item.photoKey || item.employeeId || '')
          const orgId = item.organizationId || parsed.organizationId || ''
          const recId = item.recordId || parsed.recordId || item.employeeId

          if (orgId === cleanFrom) {
            if (targetRecSet && !targetRecSet.has(recId)) {
              continue
            }

            const newKey = buildPhotoKey(cleanTo, recId)
            const updatedRecord = {
              ...item,
              employeeId: newKey,
              photoKey: newKey,
              organizationId: cleanTo,
              recordId: recId,
              updatedAt: Date.now(),
            }

            store.put(updatedRecord)
            if (item.employeeId !== newKey) {
              store.delete(item.employeeId)
            }
            migratedCount++
          }
        }

        resolve(migratedCount)
      }

      request.onerror = (event) => {
        reject(new Error(`Failed to reassign photos: ${event.target.error?.message}`))
      }

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.warn(`Could not reassign photos from ${cleanFrom} to ${cleanTo}:`, err)
    return 0
  }
}

// In-memory cache for staged rollback snapshots
let _cachedPhotoSnapshot = null

/**
 * Validates the in-memory photo snapshot structure, element integrity, and count.
 * Used by rollbackFromRecoverySnapshot to reject malformed or incomplete snapshots.
 */
export const validatePhotoSnapshotInMemory = (expectedCount) => {
  if (_cachedPhotoSnapshot !== null) {
    if (!Array.isArray(_cachedPhotoSnapshot)) {
      throw new Error('Rollback failed: In-memory photo snapshot must be an array.')
    }
    if (typeof expectedCount === 'number' && _cachedPhotoSnapshot.length !== expectedCount) {
      throw new Error(
        `Rollback failed: Incomplete photo snapshot (expected ${expectedCount} photos, found ${_cachedPhotoSnapshot.length}).`
      )
    }
    for (let i = 0; i < _cachedPhotoSnapshot.length; i++) {
      const p = _cachedPhotoSnapshot[i]
      if (!p || typeof p !== 'object' || (!p.photoKey && !p.recordId && !p.employeeId)) {
        throw new Error(`Rollback failed: Malformed photo entry at index ${i} in photo snapshot.`)
      }
    }
  } else if (typeof expectedCount === 'number' && expectedCount > 0) {
    throw new Error(
      `Rollback failed: Incomplete photo snapshot (expected ${expectedCount} photos, but in-memory snapshot was not captured).`
    )
  }
  return true
}

/**
 * Capture a lightweight in-memory snapshot of all current IndexedDB photos.
 * Preserves the exact binary Blobs, keys, and metadata for rollback.
 */
export const snapshotPhotosInMemory = async () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    _cachedPhotoSnapshot = []
    return []
  }

  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        _cachedPhotoSnapshot = (request.result || []).map((item) => ({ ...item }))
        resolve(_cachedPhotoSnapshot)
      }

      request.onerror = (event) => {
        reject(new Error(`Failed to snapshot photos: ${event.target.error?.message}`))
      }

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.warn('Could not snapshot photos in memory:', err)
    _cachedPhotoSnapshot = []
    return []
  }
}

/**
 * Restore photos from the in-memory snapshot back to IndexedDB.
 */
export const restorePhotosFromSnapshot = async () => {
  if (!Array.isArray(_cachedPhotoSnapshot)) return 0
  if (typeof window === 'undefined' || !window.indexedDB) return _cachedPhotoSnapshot.length

  // If there were 0 photos in the original snapshot, try to clear any staged photos if DB is available.
  // If DB cannot open (e.g. quota/disk full that triggered the restore failure), do not treat as fatal
  // since the snapshot had no photos to restore.
  if (_cachedPhotoSnapshot.length === 0) {
    try {
      const db = await openPhotoDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.clear()
        tx.oncomplete = () => {
          db.close()
          resolve(0)
        }
        tx.onerror = () => {
          db.close()
          resolve(0)
        }
      })
    } catch (_) {
      return 0
    }
  }

  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      // Clear whatever was staged so failed restore photos are purged
      store.clear()

      // Re-populate original snapshot entries
      for (const item of _cachedPhotoSnapshot) {
        store.put(item)
      }

      tx.oncomplete = () => {
        db.close()
        resolve(_cachedPhotoSnapshot.length)
      }

      tx.onerror = (event) => {
        db.close()
        reject(new Error(`Failed to restore photos from snapshot: ${event.target.error?.message}`))
      }
    })
  } catch (err) {
    throw new Error(`Failed to restore photos from snapshot: ${err.message}`)
  }
}

/**
 * Clear all employee photos from IndexedDB.
 * @returns {Promise<boolean>}
 */
export const clearAllPhotosFromDB = async () => {
  const db = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve(true)
    request.onerror = (event) => reject(new Error(`Failed to clear store: ${event.target.error?.message}`))
    tx.oncomplete = () => db.close()
  })
}

/**
 * Export all stored photos as base64 strings for offline backup.
 * Preserves organizationId, recordId, and photoKey.
 * 
 * @returns {Promise<Array<{ photoKey: string, organizationId: string, recordId: string, employeeId: string, filename: string, mimeType: string, base64: string }>>}
 */
export const exportAllPhotosAsBase64 = async () => {
  try {
    const db = await openPhotoDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = async () => {
        const results = request.result || []
        const exported = []

        for (const item of results) {
          if (!item.blob) continue
          const parsed = parsePhotoKey(item.photoKey || item.employeeId || '')
          const orgId = item.organizationId || parsed.organizationId || 'default'
          const recId = item.recordId || parsed.recordId || item.employeeId

          try {
            const base64 = await new Promise((res, rej) => {
              const reader = new FileReader()
              reader.onload = () => res(reader.result)
              reader.onerror = rej
              reader.readAsDataURL(item.blob)
            })
            exported.push({
              photoKey: item.photoKey || buildPhotoKey(orgId, recId),
              organizationId: orgId,
              recordId: recId,
              employeeId: item.employeeId,
              filename: item.filename,
              mimeType: item.mimeType || item.blob.type,
              base64,
            })
          } catch (err) {
            console.warn(`Could not convert photo for ${item.employeeId} to base64:`, err)
          }
        }
        resolve(exported)
      }

      request.onerror = (event) => {
        reject(new Error(`Failed to export photos: ${event.target.error?.message}`))
      }

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.warn('Could not export photos from IndexedDB:', err)
    return []
  }
}

/**
 * Import a list of base64 photos into IndexedDB during backup restore.
 * Supports both modern namespaced photos and legacy photos.
 * 
 * @param {Array<{ photoKey?: string, organizationId?: string, recordId?: string, employeeId?: string, filename: string, mimeType: string, base64: string }>} photoList
 * @returns {Promise<number>}
 */
export const importPhotosFromBase64 = async (photoList = []) => {
  if (!photoList || photoList.length === 0) return 0

  const batch = []
  for (const item of photoList) {
    if (!item.base64) continue
    const parsed = parsePhotoKey(item.photoKey || item.employeeId || '')
    const orgId = item.organizationId || parsed.organizationId || 'default'
    const recId = item.recordId || parsed.recordId || item.employeeId
    if (!recId) continue

    try {
      const base64Content = item.base64.split(',')[1] || item.base64
      const mime = item.mimeType || (item.base64.match(/data:([^;]+);/)?.[1]) || 'image/jpeg'
      const byteChars = atob(base64Content)
      const byteNums = new Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNums)
      const blob = new Blob([byteArray], { type: mime })

      batch.push({
        organizationId: orgId,
        recordId: recId,
        employeeId: buildPhotoKey(orgId, recId),
        fileOrBlob: blob,
        filename: item.filename,
      })
    } catch (err) {
      console.warn(`Failed to decode photo for ${recId}:`, err)
    }
  }

  return savePhotoBatchToDB(batch)
}
