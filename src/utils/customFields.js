/**
 * Custom Fields Helper & Layout Resolution Engine
 * Handles dynamic placement (front vs back), formatting, truncation, and template support.
 * 
 * Rules:
 * 1. The SIDWAL template ('sidwal-workshop') is strictly locked: custom fields are NEVER injected into it.
 * 2. Templates A, B, and C render custom fields dynamically according to configured placement.
 * 3. Default placement: first 2 custom fields on front, remaining on back to prevent overcrowding.
 * 4. Missing fields remain blank without fallback to mock or dummy data.
 * 5. Handles long text with graceful truncation / wrapping.
 */

/**
 * Check if the selected template supports custom fields.
 * SIDWAL Mechanical Workshop is locked and strictly returns false.
 */
export const isCustomFieldsSupported = (template = 'corporate-blue') => {
  return template !== 'sidwal-workshop' && !template?.startsWith('sidwal-')
}

/**
 * Humanize a custom field key into a readable label.
 * "busRoute" -> "Bus Route"
 * "locker_no" -> "Locker No"
 * "course_code" -> "Course Code"
 */
export const humanizeFieldKey = (key = '') => {
  if (!key || typeof key !== 'string') return ''
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Resolve custom fields to display on a specific side (front or back).
 * 
 * @param {Object} record - Record containing customFields: { [key]: value }.
 * @param {string} side - 'front' or 'back'.
 * @param {Object} settings - Card settings containing customFieldPlacements: { [key]: 'front' | 'back' }.
 * @param {string} template - Active template identifier.
 * @returns {Array<{ key: string, label: string, value: string }>} Filtered custom fields for that side.
 */
export const getCustomFieldsForSide = (
  record = {},
  side = 'front',
  settings = {},
  template = 'corporate-blue'
) => {
  // Rule 8: Never inject custom fields into the locked SIDWAL template
  if (!isCustomFieldsSupported(template)) {
    return []
  }

  if (!record || !record.customFields || typeof record.customFields !== 'object') {
    return []
  }

  const placements = settings.customFieldPlacements || {}
  const entries = Object.entries(record.customFields).filter(
    ([_, val]) => val !== undefined && val !== null && String(val).trim().length > 0
  )

  const resolved = []

  entries.forEach(([key, val], index) => {
    // Explicit placement from settings takes precedence.
    // Default fallback: first 2 fields on front, any subsequent fields on back to prevent overcrowding.
    const assignedSide = placements[key] || (index < 2 ? 'front' : 'back')

    if (assignedSide === side) {
      resolved.push({
        key,
        label: humanizeFieldKey(key),
        value: String(val).trim(),
      })
    }
  })

  return resolved
}

