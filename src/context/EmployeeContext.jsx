import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  getStoredEmployees,
  saveStoredEmployees,
  resetStoredEmployees,
  computeEmployeeStats,
} from '../utils/storage.js'
import {
  savePhotoToDB,
  savePhotoBatchToDB,
  getAllPhotoUrlsFromDB,
  deletePhotoFromDB,
  deletePhotosByOrganization,
  reassignPhotosOrg,
  exportAllPhotosAsBase64,
  importPhotosFromBase64,
  buildPhotoKey,
} from '../utils/photoStorage.js'
import {
  createPlatformBackup,
  executeStagedRestore,
  analyzeRestorePlan,
  validateBackupStructure,
  rollbackFromRecoverySnapshot,
  BACKUP_SCHEMA_VERSION,
} from '../utils/backupSystem.js'
import {
  getStoredOrganizations,
  saveStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
  updateActiveOrganization,
  updateOrganization,
  addNewOrganization,
  archiveOrganization,
  restoreOrganization,
  deleteOrganization,
  resetOrganizationsToDefault,
} from '../utils/organizationStorage.js'
import { generateRecordId } from '../utils/cardTypes.js'
import { migrateLegacyPhotosInDB } from '../utils/legacyMigration.js'

const EmployeeContext = createContext(null)

export const EmployeeProvider = ({ children }) => {
  // Master records list across all organizations (loaded with transparent legacy migration)
  const [allEmployees, setAllEmployees] = useState(() => {
    return getStoredEmployees()
  })

  // Organizations state
  const [organizations, setOrganizations] = useState(() => getStoredOrganizations())
  const [activeOrgId, setActiveOrgIdState] = useState(() => getActiveOrganizationId())

  // Photos state: { [photoKeyOrRecordId]: { url, filename, size, updatedAt } }
  const [photoUrls, setPhotoUrls] = useState({})
  const [isPhotoStorageReady, setIsPhotoStorageReady] = useState(false)

  // Selection state for bulk operations
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set())

  // Active organization resolution
  const activeOrganization = organizations.find((o) => o.id === activeOrgId) || organizations[0]

  // Tenant-isolated records scoped strictly to active organization
  const organizationEmployees = useMemo(() => {
    return allEmployees.filter((emp) => emp.organizationId === activeOrgId)
  }, [allEmployees, activeOrgId])

  // Real-time aggregate statistics for active organization
  const stats = useMemo(() => {
    return computeEmployeeStats(organizationEmployees)
  }, [organizationEmployees])

  // Load photos from IndexedDB on initial mount and run legacy photo migration
  useEffect(() => {
    let isMounted = true

    const loadIndexedDBPhotos = async () => {
      try {
        // Run background migration for any legacy un-namespaced photos
        await migrateLegacyPhotosInDB(allEmployees)

        const loadedUrls = await getAllPhotoUrlsFromDB(activeOrgId)
        if (isMounted) {
          setPhotoUrls(loadedUrls)
          setIsPhotoStorageReady(true)
        }
      } catch (err) {
        console.warn('Could not load photos from IndexedDB:', err)
        if (isMounted) setIsPhotoStorageReady(true)
      }
    }

    loadIndexedDBPhotos()

    return () => {
      isMounted = false
    }
  }, [activeOrgId, allEmployees])

  // Sync master employee records to localStorage whenever allEmployees array changes
  useEffect(() => {
    saveStoredEmployees(allEmployees)
  }, [allEmployees])

  // Sync organizations whenever state changes
  useEffect(() => {
    saveStoredOrganizations(organizations)
  }, [organizations])

  /**
   * Switch active organization profile cleanly.
   * Clears selection to prevent accidental cross-tenant actions.
   */
  const switchOrganization = (orgId) => {
    setActiveOrganizationId(orgId)
    setActiveOrgIdState(orgId)
    setSelectedRecordIds(new Set())
  }

  /**
   * Update active organization branding and details.
   */
  const updateActiveOrgSettings = (updates) => {
    const updated = updateActiveOrganization(updates)
    setOrganizations(updated)
  }

  /**
   * Create a new organization profile.
   */
  const createOrganization = (orgData) => {
    const updated = addNewOrganization(orgData)
    setOrganizations(updated)
    const newId = updated[updated.length - 1]?.id
    if (newId) {
      switchOrganization(newId)
    }
    return newId
  }

  /**
   * Edit any organization's properties.
   */
  const editOrganization = (orgId, updates) => {
    const updated = updateOrganization(orgId, updates)
    setOrganizations(updated)
    return updated
  }

  /**
   * Archive an organization with safety protections.
   */
  const archiveOrg = (orgId) => {
    const updated = archiveOrganization(orgId)
    setOrganizations(updated)
    const currentActive = getActiveOrganizationId()
    if (currentActive !== activeOrgId) {
      setActiveOrgIdState(currentActive)
      setSelectedRecordIds(new Set())
    }
    return updated
  }

  /**
   * Restore an archived organization.
   */
  const restoreOrg = (orgId) => {
    const updated = restoreOrganization(orgId)
    setOrganizations(updated)
    return updated
  }

  /**
   * Permanently delete an organization and all its isolated records & photos with explicit safety confirmation.
   * Never touches records or photos of any other organization.
   */
  const deleteOrg = async (orgId, { confirmName = '' } = {}) => {
    const target = organizations.find((o) => o.id === orgId)
    if (!target) throw new Error('Organization not found.')

    if (target.isImmutableBranding || target.isSystemOrg) {
      throw new Error('Protected system organizations cannot be deleted.')
    }

    const orgRecords = allEmployees.filter((e) => e.organizationId === orgId)
    if (orgRecords.length > 0 && confirmName !== target.name) {
      throw new Error(`Confirmation failed: You must type "${target.name}" to delete this organization.`)
    }

    // 1. Delete all photos belonging to this organization from IndexedDB
    await deletePhotosByOrganization(orgId)

    // 2. Delete all records belonging to this organization from master records
    setAllEmployees((prev) => prev.filter((e) => e.organizationId !== orgId))

    // 3. Delete organization profile from storage
    const { updatedOrgs, switchedOrgId } = deleteOrganization(orgId)
    setOrganizations(updatedOrgs)

    if (switchedOrgId) {
      setActiveOrgIdState(switchedOrgId)
      setSelectedRecordIds(new Set())
    }

    return {
      deletedRecordsCount: orgRecords.length,
      switchedOrgId,
    }
  }

  /**
   * Reassign unassigned legacy records to an active organization.
   * Preserves all record IDs, field values, custom fields, and photos in IndexedDB.
   */
  const reassignLegacyRecords = async (targetOrgId, recordIds = null) => {
    const targetOrg = organizations.find((o) => o.id === targetOrgId)
    if (!targetOrg) throw new Error('Target organization not found.')

    const idSet = Array.isArray(recordIds) && recordIds.length > 0
      ? new Set(recordIds.map(String))
      : null

    let reassignedCount = 0
    const targetRecordIds = []

    const updatedRecords = allEmployees.map((emp) => {
      const isUnassigned = emp.organizationId === 'unassigned-legacy' || !emp.organizationId
      if (isUnassigned) {
        if (!idSet || idSet.has(emp.recordId) || idSet.has(emp.id) || idSet.has(emp.displayedId)) {
          reassignedCount++
          targetRecordIds.push(emp.recordId)
          return {
            ...emp,
            organizationId: targetOrgId,
          }
        }
      }
      return emp
    })

    if (reassignedCount === 0) {
      return { reassignedCount: 0, photosMigratedCount: 0, targetOrgName: targetOrg.name }
    }

    // Migrate photos in IndexedDB
    const photosMigratedCount = await reassignPhotosOrg('unassigned-legacy', targetOrgId, targetRecordIds)

    // Save records
    setAllEmployees(updatedRecords)
    saveStoredEmployees(updatedRecords)

    // Refresh photos map for active org
    const freshUrls = await getAllPhotoUrlsFromDB(activeOrgId)
    setPhotoUrls(freshUrls)

    return {
      reassignedCount,
      photosMigratedCount,
      targetOrgName: targetOrg.name,
    }
  }

  // Unassigned legacy records selector
  const unassignedRecords = useMemo(() => {
    return allEmployees.filter((e) => e.organizationId === 'unassigned-legacy' || !e.organizationId)
  }, [allEmployees])

  // Count records for an organization
  const getOrgRecordCount = useCallback(
    (orgId) => allEmployees.filter((e) => e.organizationId === orgId).length,
    [allEmployees]
  )

  // Count photos for an organization
  const getOrgPhotoCount = useCallback(
    (orgId) => allEmployees.filter((e) => e.organizationId === orgId && e.hasPhoto).length,
    [allEmployees]
  )

  /**
   * Import a batch of validated records into active organization.
   * Duplicate detection is strictly scoped to the active organization.
   */
  const importEmployees = (newRecords = [], duplicateStrategy = 'skip') => {
    // Build map of existing displayed IDs within the active organization only
    const existingOrgIdMap = new Map()
    organizationEmployees.forEach((emp) => {
      const idKey = String(emp.displayedId || emp.employeeId || emp.id || '').trim().toLowerCase()
      if (idKey) existingOrgIdMap.set(idKey, emp.recordId)
    })

    const updatedAllList = [...allEmployees]
    let importedCount = 0
    let skippedCount = 0
    let duplicateCount = 0

    for (const record of newRecords) {
      const displayId = String(record.displayedId || record.employeeId || record.id || '').trim()
      const displayKey = displayId.toLowerCase()
      const internalId = record.recordId || generateRecordId('rec')

      const normalizedRecord = {
        ...record,
        recordId: internalId,
        organizationId: activeOrgId,
        id: displayId || internalId,
        employeeId: displayId || internalId,
        displayedId: displayId,
        fullName: record.fullName || `${record.firstName || ''} ${record.lastName || ''}`.trim() || displayId || 'Unnamed Record',
        role: record.designation || record.role || 'Member',
        designation: record.designation || record.role || 'Member',
        status: record.status || 'Pending',
        issueDate: record.joiningDate || record.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: record.expiryDate || '2028-01-01',
        avatarUrl: record.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        location: record.location || 'HQ Campus',
        archived: Boolean(record.archived),
      }

      if (displayKey && existingOrgIdMap.has(displayKey)) {
        duplicateCount++
        if (duplicateStrategy === 'update') {
          const targetRecId = existingOrgIdMap.get(displayKey)
          const targetIndex = updatedAllList.findIndex((e) => e.recordId === targetRecId && e.organizationId === activeOrgId)
          if (targetIndex !== -1) {
            updatedAllList[targetIndex] = { ...updatedAllList[targetIndex], ...normalizedRecord, recordId: targetRecId }
            importedCount++
          }
        } else {
          skippedCount++
        }
      } else {
        updatedAllList.push(normalizedRecord)
        if (displayKey) existingOrgIdMap.set(displayKey, internalId)
        importedCount++
      }
    }

    setAllEmployees(updatedAllList)
    saveStoredEmployees(updatedAllList)

    return {
      importedCount,
      skippedCount,
      duplicateCount,
    }
  }

  /**
   * Add a single record manually to active organization.
   */
  const addRecord = (newRecord) => {
    const internalId = newRecord.recordId || generateRecordId('rec')
    const displayId = String(
      newRecord.displayedId ||
      newRecord.employeeId ||
      newRecord.rollNo ||
      newRecord.visitorId ||
      newRecord.ticketNo ||
      newRecord.id ||
      ''
    ).trim()

    const created = {
      ...newRecord,
      recordId: internalId,
      organizationId: activeOrgId,
      id: displayId || internalId,
      employeeId: displayId || internalId,
      displayedId: displayId,
      fullName: newRecord.fullName || `${newRecord.firstName || ''} ${newRecord.lastName || ''}`.trim() || displayId || 'Unnamed Record',
      status: newRecord.status || 'Pending',
      issueDate: newRecord.joiningDate || newRecord.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: newRecord.expiryDate || '2028-01-01',
      avatarUrl: newRecord.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      archived: false,
    }

    setAllEmployees((prev) => [created, ...prev])
    return created
  }

  /**
   * Update an existing record scoped to active organization.
   */
  const updateRecord = (idOrRecordId, fields) => {
    const targetKey = String(idOrRecordId).trim()
    setAllEmployees((prev) =>
      prev.map((emp) => {
        // Enforce active organization boundary
        if (emp.organizationId !== activeOrgId) return emp

        const matches =
          emp.recordId === targetKey ||
          emp.id === targetKey ||
          emp.employeeId === targetKey ||
          emp.displayedId === targetKey

        if (matches) {
          const updated = { ...emp, ...fields }
          if (fields.firstName || fields.lastName) {
            updated.fullName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim()
          }
          if (fields.designation) {
            updated.role = fields.designation
          }
          return updated
        }
        return emp
      })
    )
  }

  /**
   * Delete a record scoped to active organization (and remove its namespaced photo).
   */
  const deleteRecord = async (idOrRecordId) => {
    const targetKey = String(idOrRecordId).trim()
    const target = organizationEmployees.find(
      (e) =>
        e.recordId === targetKey ||
        e.id === targetKey ||
        e.employeeId === targetKey ||
        e.displayedId === targetKey
    )

    if (target) {
      await removePhoto(target.recordId)
    }

    setAllEmployees((prev) =>
      prev.filter(
        (emp) =>
          emp.organizationId !== activeOrgId ||
          (emp.recordId !== targetKey &&
            emp.id !== targetKey &&
            emp.employeeId !== targetKey &&
            emp.displayedId !== targetKey)
      )
    )

    setSelectedRecordIds((prev) => {
      const next = new Set(prev)
      next.delete(targetKey)
      return next
    })
  }

  /**
   * Bulk delete multiple records scoped to active organization.
   */
  const bulkDeleteRecords = async (idList = []) => {
    const idSet = new Set(idList.map((id) => String(id).trim()))
    const targetRecords = organizationEmployees.filter(
      (emp) =>
        idSet.has(emp.recordId) ||
        idSet.has(emp.id) ||
        idSet.has(emp.employeeId) ||
        idSet.has(emp.displayedId)
    )

    for (const rec of targetRecords) {
      await removePhoto(rec.recordId)
    }

    setAllEmployees((prev) =>
      prev.filter(
        (emp) =>
          emp.organizationId !== activeOrgId ||
          (!idSet.has(emp.recordId) &&
            !idSet.has(emp.id) &&
            !idSet.has(emp.employeeId) &&
            !idSet.has(emp.displayedId))
      )
    )

    setSelectedRecordIds(new Set())
  }

  /**
   * Archive / Soft delete record within active organization.
   */
  const archiveRecord = (idOrRecordId) => {
    updateRecord(idOrRecordId, { archived: true, status: 'Archived' })
  }

  /**
   * Restore archived record within active organization.
   */
  const restoreRecord = (idOrRecordId) => {
    updateRecord(idOrRecordId, { archived: false, status: 'Pending' })
  }

  /**
   * Bulk update status for selected records within active organization.
   */
  const bulkUpdateStatus = (idList = [], newStatus = 'Pending') => {
    const idSet = new Set(idList.map((id) => String(id).trim()))
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.organizationId !== activeOrgId) return emp

        if (
          idSet.has(emp.recordId) ||
          idSet.has(emp.id) ||
          idSet.has(emp.employeeId) ||
          idSet.has(emp.displayedId)
        ) {
          return {
            ...emp,
            status: newStatus,
            archived: newStatus === 'Archived',
          }
        }
        return emp
      })
    )
  }

  /**
   * Selection helpers for bulk operations.
   */
  const toggleSelectRecord = (id) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllRecords = (ids = []) => {
    setSelectedRecordIds(new Set(ids))
  }

  const clearRecordSelection = () => {
    setSelectedRecordIds(new Set())
  }

  /**
   * Assign a photo blob to a record via namespaced IndexedDB storage.
   * Primary key: `${activeOrgId}::${recordId}`
   */
  const assignPhoto = async (idOrRecordId, fileOrBlob, filename = '') => {
    const cleanId = String(idOrRecordId).trim()
    if (!cleanId || !fileOrBlob) return

    // Find target record in active organization to get its canonical recordId
    const targetRecord = organizationEmployees.find(
      (e) =>
        e.recordId === cleanId ||
        e.id === cleanId ||
        e.employeeId === cleanId ||
        e.displayedId === cleanId
    )

    const recId = targetRecord?.recordId || cleanId
    const photoKey = buildPhotoKey(activeOrgId, recId)

    // 1. Save to namespaced IndexedDB
    await savePhotoToDB(activeOrgId, recId, fileOrBlob, filename)

    // 2. Revoke old object URL if exists
    if (photoUrls[photoKey]?.url) {
      URL.revokeObjectURL(photoUrls[photoKey].url)
    }
    if (photoUrls[recId]?.url) {
      URL.revokeObjectURL(photoUrls[recId].url)
    }

    // 3. Create fresh object URL
    const newUrl = URL.createObjectURL(fileOrBlob)
    const photoMetadata = {
      url: newUrl,
      filename: filename || fileOrBlob.name || `${recId}.jpg`,
      size: fileOrBlob.size,
      updatedAt: Date.now(),
      recordId: recId,
      organizationId: activeOrgId,
    }

    setPhotoUrls((prev) => ({
      ...prev,
      [photoKey]: photoMetadata,
      [recId]: photoMetadata,
    }))

    // 4. Mark record hasPhoto flag
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.organizationId !== activeOrgId) return emp
        const matches =
          emp.recordId === recId ||
          emp.id === cleanId ||
          emp.employeeId === cleanId ||
          emp.displayedId === cleanId

        if (matches) {
          return {
            ...emp,
            hasPhoto: true,
            photoFileName: filename || `${recId}.jpg`,
            photoKey,
          }
        }
        return emp
      })
    )
  }

  /**
   * Batch assign multiple photos in a single IndexedDB transaction scoped to active organization.
   */
  const batchAssignPhotos = async (matchedList = []) => {
    if (matchedList.length === 0) return 0

    const dbBatch = matchedList.map((m) => {
      const recId = m.recordId || m.employee?.recordId || m.employeeId
      return {
        organizationId: activeOrgId,
        recordId: recId,
        fileOrBlob: m.file,
        filename: m.filename,
      }
    })

    // 1. Save all to IndexedDB
    const savedCount = await savePhotoBatchToDB(dbBatch)

    // 2. Update state with new Object URLs
    const newUrls = {}
    const matchedRecordIdSet = new Set()

    for (const m of matchedList) {
      const recId = m.recordId || m.employee?.recordId || m.employeeId
      const photoKey = buildPhotoKey(activeOrgId, recId)
      matchedRecordIdSet.add(recId)

      if (photoUrls[photoKey]?.url) {
        URL.revokeObjectURL(photoUrls[photoKey].url)
      }

      const photoMetadata = {
        url: URL.createObjectURL(m.file),
        filename: m.filename,
        size: m.file.size,
        updatedAt: Date.now(),
        recordId: recId,
        organizationId: activeOrgId,
      }

      newUrls[photoKey] = photoMetadata
      newUrls[recId] = photoMetadata
    }

    setPhotoUrls((prev) => ({ ...prev, ...newUrls }))

    // 3. Update employee hasPhoto flags
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.organizationId !== activeOrgId) return emp
        if (matchedRecordIdSet.has(emp.recordId) || matchedRecordIdSet.has(emp.employeeId)) {
          return { ...emp, hasPhoto: true }
        }
        return emp
      })
    )

    return savedCount
  }

  /**
   * Remove a photo from IndexedDB.
   */
  const removePhoto = async (idOrRecordId) => {
    const cleanId = String(idOrRecordId).trim()
    if (!cleanId) return

    const targetRecord = organizationEmployees.find(
      (e) =>
        e.recordId === cleanId ||
        e.id === cleanId ||
        e.employeeId === cleanId ||
        e.displayedId === cleanId
    )

    const recId = targetRecord?.recordId || cleanId
    const photoKey = buildPhotoKey(activeOrgId, recId)

    // 1. Delete from IndexedDB
    await deletePhotoFromDB(activeOrgId, recId)

    // 2. Revoke object URL
    if (photoUrls[photoKey]?.url) {
      URL.revokeObjectURL(photoUrls[photoKey].url)
    }
    if (photoUrls[recId]?.url) {
      URL.revokeObjectURL(photoUrls[recId].url)
    }

    // 3. Remove from state
    setPhotoUrls((prev) => {
      const copy = { ...prev }
      delete copy[photoKey]
      delete copy[recId]
      return copy
    })

    // 4. Update employee record
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.organizationId !== activeOrgId) return emp
        if (emp.recordId === recId || emp.employeeId === cleanId || emp.id === cleanId) {
          return { ...emp, hasPhoto: false }
        }
        return emp
      })
    )
  }

  /**
   * Helper to retrieve the current best photo URL for an employee/record.
   * Scoped strictly to record's organization and stable recordId.
   */
  const getEmployeePhoto = useCallback(
    (employee) => {
      if (!employee) return null
      const orgId = employee.organizationId || activeOrgId
      const recId = String(employee.recordId || '').trim()
      const photoKey = buildPhotoKey(orgId, recId)

      // 1. Check exact namespaced photo key
      if (photoKey && photoUrls[photoKey]?.url) {
        return photoUrls[photoKey].url
      }

      // 2. Check recordId key
      if (recId && photoUrls[recId]?.url) {
        return photoUrls[recId].url
      }

      // 3. Fallback to avatarUrl
      return employee.avatarUrl || null
    },
    [photoUrls, activeOrgId]
  )

  /**
   * Full platform backup generation.
   * Exports all organizations (active & archived), master records, custom fields,
   * IndexedDB photos, and template settings with schema version and integrity metadata.
   */
  const createFullBackup = async () => {
    return createPlatformBackup()
  }

  /**
   * Restore platform from a backup JSON object using the Staged Restore Pipeline.
   * Supports Mode A ('merge') and Mode B ('replace') with automatic rollback snapshot.
   */
  const restoreFromBackup = async (backupData, options = {}) => {
    const { mode = 'merge', conflictResolution = 'incoming' } = options
    const result = await executeStagedRestore({
      backupData,
      mode,
      conflictResolution,
    })

    // Synchronize live state after successful restoration
    setAllEmployees(getStoredEmployees())
    setOrganizations(getStoredOrganizations())
    setActiveOrgIdState(getActiveOrganizationId())
    const freshUrls = await getAllPhotoUrlsFromDB(getActiveOrganizationId())
    setPhotoUrls(freshUrls)

    return result
  }

  /**
   * Reset database back to default initial cohort.
   */
  const resetToDefault = () => {
    const defaultData = resetStoredEmployees()
    setAllEmployees(defaultData)
    resetOrganizationsToDefault()
    setOrganizations(getStoredOrganizations())
    setActiveOrgIdState(getActiveOrganizationId())
    setSelectedRecordIds(new Set())
  }

  return (
    <EmployeeContext.Provider
      value={{
        employees: organizationEmployees, // Scoped to active organization
        records: organizationEmployees,   // Alias for generic terminology
        allEmployees,                     // Full master roster across organizations
        allRecords: allEmployees,
        stats,                            // Scoped to active organization
        photoUrls,
        isPhotoStorageReady,
        organizations,
        activeOrganization,
        activeOrgId,
        switchOrganization,
        updateActiveOrgSettings,
        createOrganization,
        editOrganization,
        archiveOrg,
        restoreOrg,
        deleteOrg,
        reassignLegacyRecords,
        unassignedRecords,
        getOrgRecordCount,
        getOrgPhotoCount,
        importEmployees,
        addRecord,
        updateRecord,
        deleteRecord,
        bulkDeleteRecords,
        archiveRecord,
        restoreRecord,
        bulkUpdateStatus,
        selectedRecordIds,
        toggleSelectRecord,
        selectAllRecords,
        clearRecordSelection,
        assignPhoto,
        batchAssignPhotos,
        removePhoto,
        getEmployeePhoto,
        createFullBackup,
        restoreFromBackup,
        createPlatformBackup,
        executeStagedRestore,
        analyzeRestorePlan,
        validateBackupStructure,
        rollbackFromRecoverySnapshot,
        BACKUP_SCHEMA_VERSION,
        // Backward-compatible method aliases:
        updateEmployee: updateRecord,
        deleteEmployee: deleteRecord,
        resetToDefault,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  )
}

export const useEmployees = () => {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployees must be used within an EmployeeProvider')
  }
  return context
}
