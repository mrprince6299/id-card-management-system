/**
 * Validator utility for general-purpose ID card records imported from Excel / CSV or added manually.
 * Supports multiple card types (Employee, Student, Staff, Visitor, Contractor, Event, Custom).
 *
 * Core Principles:
 * 1. For general-purpose records, no user-facing personal field is mandatory.
 * 2. An internal unique record ID (recordId) guarantees persistent identification.
 * 3. Empty rows (all cells empty/whitespace) are detected and skipped cleanly.
 * 4. Backward-compatible with corporate employee validation checks when strictRequired is enabled.
 */

export const REQUIRED_FIELDS = [
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
]

export const OPTIONAL_FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'joiningDate', label: 'Joining Date' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'photoFileName', label: 'Photo File Name' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'aadhaarNumber', label: 'Aadhaar Number' },
  { key: 'address', label: 'Address' },
  { key: 'rollNo', label: 'Roll Number' },
  { key: 'course', label: 'Course' },
  { key: 'semester', label: 'Semester' },
  { key: 'visitorId', label: 'Visitor Pass ID' },
  { key: 'ticketNo', label: 'Ticket / Pass No' },
  { key: 'customFields', label: 'Custom Fields' },
]

/**
 * Check if a string is a valid email format.
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return true // optional
  const trimmed = email.trim()
  if (!trimmed) return true
  // Standard RFC-compliant email regex
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return regex.test(trimmed)
}

/**
 * Check if a date string or serial value is valid.
 */
export const isValidDate = (dateVal) => {
  if (!dateVal && dateVal !== 0) return true // optional
  if (typeof dateVal === 'number' && !isNaN(dateVal) && dateVal > 10000 && dateVal < 100000) return true
  const dateStr = String(dateVal).trim()
  if (!dateStr) return true
  if (/^\d+(\.\d+)?$/.test(dateStr)) {
    const num = parseFloat(dateStr)
    return num > 10000 && num < 100000
  }
  const parsed = Date.parse(dateStr)
  return !isNaN(parsed)
}

/**
 * Check if an entire raw row or object is completely empty.
 */
export const isRowEmpty = (row) => {
  if (!row) return true
  if (Array.isArray(row)) {
    return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')
  }
  if (typeof row === 'object') {
    // Exclude internal metadata keys (_id, _validation, recordId, cardType) when checking if data cells are empty
    const dataKeys = Object.keys(row).filter((k) => !k.startsWith('_') && k !== 'recordId' && k !== 'cardType')
    if (dataKeys.length === 0) return true
    return dataKeys.every(
      (k) => row[k] === null || row[k] === undefined || String(row[k]).trim() === ''
    )
  }
  return true
}

/**
 * Validates a single record.
 * 
 * @param {Object} record - The normalized record.
 * @param {Set<string>} existingIds - Set of existing IDs in storage.
 * @param {Map<string, number>} batchIdCounts - Frequency map of displayed IDs in the current batch.
 * @param {Object} options - Options { strictRequired: boolean, cardType: string }
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[], isEmpty: boolean }
 */
export const validateRecord = (record, existingIds = new Set(), batchIdCounts = new Map(), options = {}) => {
  const errors = []
  const warnings = []

  // 1. Empty record check
  if (isRowEmpty(record)) {
    return {
      isValid: false,
      errors: ['Empty row detected (no data found in row).'],
      warnings: [],
      isEmpty: true,
    }
  }

  // 2. Strict required fields check (default for legacy employee tests; optional for generic cards)
  const isGeneric = options.strictRequired === false || (record.cardType && record.cardType !== 'employee')
  if (!isGeneric) {
    for (const field of REQUIRED_FIELDS) {
      const val = record[field.key]
      if (val === undefined || val === null || String(val).trim() === '') {
        errors.push(`Missing required field: ${field.label}`)
      }
    }
  }

  // 3. ID Collision and Duplication check (only checked if a display ID is actually provided)
  const displayId = String(
    record.employeeId ||
    record.rollNo ||
    record.visitorId ||
    record.ticketNo ||
    record.id ||
    ''
  ).trim()

  if (displayId) {
    // Check duplication within batch
    const batchCount = batchIdCounts.get(displayId) || 0
    if (batchCount > 1) {
      errors.push(`Duplicate Employee ID in import file (${displayId})`)
    }

    // Check conflict with existing stored records
    if (existingIds.has(displayId)) {
      warnings.push(`Employee ID already exists in directory (${displayId})`)
    }
  }

  // 4. Email validation
  if (record.email && !isValidEmail(record.email)) {
    errors.push(`Invalid email format: "${record.email}"`)
  }

  // 5. Date validation
  if (record.joiningDate && !isValidDate(record.joiningDate)) {
    errors.push(`Invalid date format for joining date: "${record.joiningDate}"`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isEmpty: false,
  }
}

/**
 * Validates an entire batch of mapped records.
 * 
 * @param {Array<Object>} records - Array of mapped records.
 * @param {Array<Object>} existingEmployees - Current roster.
 * @param {Object} options - Validation options { strictRequired: boolean, cardType: string }
 * @returns {Array<Object>} Records augmented with `_validation: { isValid, errors, warnings, isEmpty }`
 */
export const validateBatch = (records, existingEmployees = [], options = {}) => {
  const existingIds = new Set(
    existingEmployees.map((e) => {
      const id = e.employeeId || e.rollNo || e.visitorId || e.ticketNo || e.id
      return id ? String(id).trim() : ''
    }).filter(Boolean)
  )

  // Pre-calculate batch frequency for duplicate ID detection
  const batchIdCounts = new Map()
  for (const record of records) {
    if (isRowEmpty(record)) continue
    const id = String(
      record.employeeId ||
      record.rollNo ||
      record.visitorId ||
      record.ticketNo ||
      record.id ||
      ''
    ).trim()

    if (id) {
      batchIdCounts.set(id, (batchIdCounts.get(id) || 0) + 1)
    }
  }

  return records.map((record) => {
    const validation = validateRecord(record, existingIds, batchIdCounts, options)
    return {
      ...record,
      _validation: validation,
    }
  })
}
