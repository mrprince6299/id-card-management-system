/**
 * Automatic photo matching engine with strict organization scoping and stable recordId tracking.
 * 
 * Rules:
 * 1. Uses stable `recordId` as the primary internal identifier.
 * 2. Scopes matching strictly to the active organization.
 * 3. Never uses `undefined`, `null`, or empty string as matching keys.
 * 4. Supports human-readable filename aliases: employeeId, displayedId, rollNo, visitorId, ticketNo, id, recordId.
 * 5. Detects ambiguous matches (multiple files for one record, or one file matching multiple records) and reports them.
 * 6. Never silently attaches one photo to multiple records.
 * 7. Supports records without displayed IDs via recordId.
 * 8. Flags existing photo associations to trigger replacement confirmation.
 */

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Check if a filename has an approved photo extension.
 */
export const isSupportedPhotoFormat = (filename = '') => {
  if (!filename || typeof filename !== 'string') return false
  const lower = filename.toLowerCase()
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Format bytes to readable string (e.g. 1.2 MB, 340 KB).
 */
export const formatFileSize = (bytes = 0) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Extract clean ID candidate from a filename.
 * Strips file extension and common photo suffixes:
 * - "EMP001.jpg" -> "EMP001"
 * - "emp-1001_profile.png" -> "emp-1001"
 * - "EMP_1002-front.webp" -> "EMP_1002"
 * - "2026-CS-042_badge.jpg" -> "2026-CS-042"
 */
export const extractIdFromFilename = (filename = '') => {
  if (!filename || typeof filename !== 'string') return ''

  // 1. Strip file extension
  const dotIndex = filename.lastIndexOf('.')
  const basename = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename

  // 2. Normalize and strip standard known photo suffixes (including _front, _back, -front, -back)
  const cleanSuffixRegex = /(_profile|_photo|_headshot|_pic|_avatar|_badge|_front|_back|_new|_v\d+|-profile|-photo|-headshot|-pic|-avatar|-badge|-front|-back|-new|-v\d+)$/i
  const stripped = basename.replace(cleanSuffixRegex, '').trim()

  return stripped
}

/**
 * Find all matching records in the roster for a given filename.
 * Returns an array of matches to detect ambiguous multiple-record collisions.
 * 
 * @param {string} filename - Photo filename.
 * @param {Array<Object>} employees - Active organization roster.
 * @param {string|null} [activeOrganizationId=null] - Organization ID scope.
 * @returns {Array<Object>} All matched employee records.
 */
export const findMatchingEmployees = (filename = '', employees = [], activeOrganizationId = null) => {
  const candidateId = extractIdFromFilename(filename)
  if (!candidateId || !candidateId.trim()) return []

  const candidateLower = candidateId.toLowerCase().trim()
  const candidateAlphanum = candidateId.replace(/[^a-z0-9]/gi, '').toLowerCase().trim()

  const matches = []

  for (const emp of employees) {
    if (!emp || typeof emp !== 'object') continue

    // Enforce active organization boundary if organizationId is present
    if (activeOrganizationId && emp.organizationId && emp.organizationId !== activeOrganizationId) {
      continue
    }

    // Collect all valid, non-empty candidate identifiers for this record
    // Never include empty, null, or undefined strings
    const validIdentifiers = [
      emp.recordId,
      emp.displayedId,
      emp.employeeId,
      emp.rollNo,
      emp.visitorId,
      emp.ticketNo,
      emp.id,
    ].filter((val) => typeof val === 'string' && val.trim().length > 0)

    // 1. Direct exact match (case-insensitive)
    const hasExact = validIdentifiers.some(
      (id) => id.trim().toLowerCase() === candidateLower
    )

    if (hasExact) {
      matches.push(emp)
      continue
    }

    // 2. Normalized alphanum match (e.g. "EMP-1001" vs "EMP1001") if non-empty
    if (candidateAlphanum) {
      const hasAlphanum = validIdentifiers.some(
        (id) => id.replace(/[^a-z0-9]/gi, '').toLowerCase().trim() === candidateAlphanum
      )
      if (hasAlphanum) {
        matches.push(emp)
      }
    }
  }

  return matches
}

/**
 * Legacy single-match helper for backward compatibility.
 * Returns single match if unambiguous, null otherwise.
 */
export const findMatchingEmployee = (filename = '', employees = [], activeOrganizationId = null) => {
  const matches = findMatchingEmployees(filename, employees, activeOrganizationId)
  return matches.length === 1 ? matches[0] : null
}

/**
 * Process a batch of uploaded photo files against employee directory with organization awareness.
 * 
 * @param {Array<File|Object>} files - Uploaded photo files.
 * @param {Array<Object>} employees - Active employee directory (scoped to organization).
 * @param {Object} existingPhotoMap - Map of already stored photos { [recordId | photoKey]: string }.
 * @param {Object} options - Matching options: { organizationId }.
 * @returns {Object} Structured matching report and categorization.
 */
export const matchPhotosBatch = (files = [], employees = [], existingPhotoMap = {}, options = {}) => {
  const matched = []
  const ambiguous = []
  const unmatched = []
  const unsupported = []

  const activeOrgId = options.organizationId || employees[0]?.organizationId || null

  // Map of candidate matches: recordId -> Array of match descriptors
  const recordMatchMap = new Map()

  for (const file of files) {
    const filename = file.name || file.filename || ''

    // 1. Validate file format
    if (!isSupportedPhotoFormat(filename)) {
      unsupported.push({
        id: `unsupported-${filename}-${Date.now()}`,
        file,
        filename,
        size: file.size || 0,
        status: 'unsupported',
        error: 'Unsupported image format. Allowed: JPG, JPEG, PNG, WEBP.',
      })
      continue
    }

    // 2. Find matching records in the active organization
    const matchingRecords = findMatchingEmployees(filename, employees, activeOrgId)

    if (matchingRecords.length === 0) {
      unmatched.push({
        id: `unmatched-${filename}-${Date.now()}`,
        file,
        filename,
        size: file.size || 0,
        candidateId: extractIdFromFilename(filename),
        status: 'unmatched',
      })
      continue
    }

    // Ambiguity Check A: Single photo file matches MULTIPLE different records in the roster
    if (matchingRecords.length > 1) {
      ambiguous.push({
        id: `ambiguous-multi-${filename}-${Date.now()}`,
        file,
        filename,
        size: file.size || 0,
        candidateId: extractIdFromFilename(filename),
        status: 'ambiguous',
        reason: 'multi-record-collision',
        matchedRecords: matchingRecords.map((r) => ({
          recordId: r.recordId,
          displayedId: r.displayedId || r.employeeId || r.id,
          fullName: r.fullName,
        })),
        warning: `Photo "${filename}" matches multiple distinct records: ${matchingRecords.map((r) => r.displayedId || r.fullName).join(', ')}`,
      })
      continue
    }

    // Exactly one matching record found
    const targetRecord = matchingRecords[0]
    const recId = String(
      targetRecord.recordId ||
      targetRecord.displayedId ||
      targetRecord.employeeId ||
      targetRecord.rollNo ||
      targetRecord.visitorId ||
      targetRecord.ticketNo ||
      targetRecord.id ||
      ''
    ).trim()

    // Safety: Never use empty, null, or undefined as key
    if (!recId || recId === 'undefined' || recId === 'null') {
      unmatched.push({
        id: `unmatched-invalid-key-${filename}-${Date.now()}`,
        file,
        filename,
        size: file.size || 0,
        candidateId: extractIdFromFilename(filename),
        status: 'unmatched',
      })
      continue
    }

    const orgId = targetRecord.organizationId || activeOrgId || 'default'
    const photoKey = `${orgId}::${recId}`

    const hasExisting = Boolean(
      existingPhotoMap[photoKey] ||
      existingPhotoMap[recId] ||
      existingPhotoMap[targetRecord.employeeId]
    )

    const matchDescriptor = {
      id: `match-${recId}-${filename}`,
      file,
      filename,
      size: file.size || 0,
      candidateId: extractIdFromFilename(filename),
      employee: targetRecord,
      recordId: recId,
      organizationId: orgId,
      photoKey,
      employeeId: targetRecord.employeeId || recId,
      displayedId: targetRecord.displayedId || targetRecord.employeeId || recId,
      status: 'matched',
      hasExistingPhoto: hasExisting,
    }

    if (!recordMatchMap.has(recId)) {
      recordMatchMap.set(recId, [matchDescriptor])
    } else {
      recordMatchMap.get(recId).push(matchDescriptor)
    }
  }

  // 3. Ambiguity Check B: Multiple photo files matching the SAME record
  for (const [recId, matchList] of recordMatchMap.entries()) {
    if (matchList.length === 1) {
      matched.push(matchList[0])
    } else {
      // Multiple photos uploaded for the same record
      for (const item of matchList) {
        ambiguous.push({
          ...item,
          status: 'ambiguous',
          reason: 'duplicate-files-for-record',
          duplicateGroup: matchList.map((m) => m.filename),
          warning: `Multiple photos uploaded for ${item.displayedId || recId} (${matchList.map((m) => m.filename).join(', ')})`,
        })
      }
    }
  }

  // 4. Identify records in active organization missing photos
  const matchedRecIdSet = new Set(matched.map((m) => m.recordId))
  const missingEmployees = employees.filter((emp) => {
    const recId = String(emp.recordId || emp.employeeId || emp.id || '').trim()
    const orgId = emp.organizationId || activeOrgId || 'default'
    const photoKey = `${orgId}::${recId}`
    const hasPhoto = Boolean(
      existingPhotoMap[photoKey] ||
      existingPhotoMap[recId] ||
      existingPhotoMap[emp.employeeId] ||
      emp.hasPhoto
    )
    return !matchedRecIdSet.has(recId) && !hasPhoto
  })

  return {
    matched,
    ambiguous,
    unmatched,
    unsupported,
    missingEmployees,
    stats: {
      totalUploaded: files.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      ambiguousCount: ambiguous.length,
      unsupportedCount: unsupported.length,
      missingCount: missingEmployees.length,
    },
  }
}
