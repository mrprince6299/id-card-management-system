import { MOCK_EMPLOYEES } from '../data/mockEmployees.js'
import { migrateLegacyRecords } from './legacyMigration.js'

export const EMPLOYEES_STORAGE_KEY = 'employee_records_v1'

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

/**
 * Retrieve saved employees from localStorage with transparent legacy data migration.
 * Initializes with MOCK_EMPLOYEES on first access.
 */
export const getStoredEmployees = () => {
  const storage = getStorage()
  if (!storage) return MOCK_EMPLOYEES

  try {
    const raw = storage.getItem(EMPLOYEES_STORAGE_KEY)
    if (!raw) {
      storage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(MOCK_EMPLOYEES))
      return MOCK_EMPLOYEES
    }
    const parsed = JSON.parse(raw)
    const records = Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_EMPLOYEES

    // Transparently migrate legacy records lacking organizationId or recordId
    const needsMigration = records.some((r) => !r.organizationId || !r.recordId)
    if (needsMigration) {
      const { migratedRecords } = migrateLegacyRecords(records)
      storage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(migratedRecords))
      return migratedRecords
    }

    return records
  } catch (error) {
    console.error('Error reading employees from localStorage:', error)
    return MOCK_EMPLOYEES
  }
}

/**
 * Persist employee list to localStorage.
 */
export const saveStoredEmployees = (employees) => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees))
  } catch (error) {
    console.error('Error saving employees to localStorage:', error)
  }
}

/**
 * Reset localStorage to initial mock data.
 */
export const resetStoredEmployees = () => {
  if (typeof window === 'undefined') return MOCK_EMPLOYEES
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(MOCK_EMPLOYEES))
    return MOCK_EMPLOYEES
  } catch (error) {
    console.error('Error resetting stored employees:', error)
    return MOCK_EMPLOYEES
  }
}

/**
 * Derive real-time aggregate statistics from active employees list.
 */
export const computeEmployeeStats = (employees = []) => {
  const total = employees.length
  const generated = employees.filter((e) => e.status?.toLowerCase() === 'generated').length
  const pending = employees.filter((e) => e.status?.toLowerCase() === 'pending').length
  const draft = employees.filter((e) => e.status?.toLowerCase() === 'draft').length
  const percentage = total > 0 ? Math.round((generated / total) * 100) : 0

  const departmentSet = new Set(
    employees.map((e) => e.department).filter((d) => Boolean(d && d.trim()))
  )

  return {
    totalEmployees: total,
    totalEmployeesGrowth: `Live database: ${total} records`,
    generatedCards: generated,
    generatedPercentage: percentage,
    pendingGeneration: pending,
    draftCount: draft,
    activeTemplates: 3,
    readyForExport: generated,
    departmentsCount: departmentSet.size || 1,
  }
}
