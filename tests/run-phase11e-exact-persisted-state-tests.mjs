/**
 * Phase 11E — Exact Persisted-State Verification Test Suite
 *
 * Automated tests covering:
 * 1. 100 expected records but only 70 persisted.
 * 2. Correct record count but one record has modified data.
 * 3. One organization missing after write.
 * 4. Correct organization count but incorrect organization data.
 * 5. Template settings not persisted correctly.
 * 6. Active organization ID not persisted correctly.
 * 7. Successful exact restore (Mode B Replace and Mode A Merge).
 * 8. Successful rollback after verification failure.
 */

import assert from 'assert'
import {
  executeStagedRestore,
  computeBackupChecksum,
  RECOVERY_SNAPSHOT_KEY,
} from '../src/utils/backupSystem.js'
import {
  saveStoredEmployees,
  getStoredEmployees,
  EMPLOYEES_STORAGE_KEY,
} from '../src/utils/storage.js'
import {
  saveStoredOrganizations,
  getStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
  ORGANIZATIONS_STORAGE_KEY,
  ACTIVE_ORG_STORAGE_KEY,
} from '../src/utils/organizationStorage.js'
import {
  saveTemplateSettings,
  getSavedTemplateSettings,
  TEMPLATE_STORAGE_KEY,
} from '../src/utils/templateStorage.js'

let passed = 0
let failed = 0

async function runTestAsync(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message)
    failed++
  }
}

console.log('====================================================')
console.log('🧪 Starting Phase 11E Exact Persisted-State Verification Tests')
console.log('====================================================')

// In-memory backing store for localStorage mock with interceptor hooks
const memoryStore = new Map()
let onSetItem = null

global.localStorage = {
  getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
  setItem: (k, v) => {
    if (onSetItem) {
      const intercepted = onSetItem(k, v)
      if (intercepted !== undefined) {
        return memoryStore.set(k, String(intercepted))
      }
    }
    return memoryStore.set(k, String(v))
  },
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

delete global.window

const INITIAL_ORGS = [
  { id: 'initial_org_1', name: 'Initial Organization One', isArchived: false },
  { id: 'initial_org_2', name: 'Initial Organization Two', isArchived: false },
]

const INITIAL_RECORDS = [
  { recordId: 'init_rec_1', organizationId: 'initial_org_1', fullName: 'Initial User One', department: 'IT' },
  { recordId: 'init_rec_2', organizationId: 'initial_org_1', fullName: 'Initial User Two', department: 'HR' },
]

function resetEnvironment() {
  memoryStore.clear()
  onSetItem = null
  delete global.window

  saveStoredOrganizations(INITIAL_ORGS)
  saveStoredEmployees(INITIAL_RECORDS)
  setActiveOrganizationId('initial_org_1')
  saveTemplateSettings({ selectedTemplateId: 'corporate-blue' })
}

function buildTestBackup({ recordCount = 10, orgCount = 2, templateSettings = null, activeOrgId = 'target_org_1' } = {}) {
  const orgs = []
  for (let i = 1; i <= orgCount; i++) {
    orgs.push({
      id: `target_org_${i}`,
      name: `Target Organization ${i}`,
      companyName: `Target Org Company ${i}`,
      tagline: `Tagline ${i}`,
      customAccentColor: `#00${i}000`,
      defaultTemplateId: 'modern-tech',
      isArchived: false,
    })
  }

  const records = []
  for (let i = 1; i <= recordCount; i++) {
    const orgId = orgs[(i - 1) % orgs.length].id
    records.push({
      recordId: `target_rec_${String(i).padStart(3, '0')}`,
      organizationId: orgId,
      displayedId: `ID-${String(i).padStart(3, '0')}`,
      fullName: `Target Cardholder ${i}`,
      role: `Specialist ${i}`,
      department: i % 2 === 0 ? 'Engineering' : 'Operations',
      customFields: { securityClearance: `Level-${(i % 5) + 1}` },
    })
  }

  const backup = {
    schemaVersion: '2.1.0',
    activeOrgId,
    organizations: orgs,
    records,
    photos: [],
    templateSettings: templateSettings || { 'target-template': { primaryColor: '#ff0000', fontSize: 16 } },
  }

  backup.integrity = {
    algorithm: 'SHA-256',
    schemaVersion: '2.1.0',
    recordsCount: records.length,
    organizationsCount: orgs.length,
    photosCount: 0,
    checksum: computeBackupChecksum(backup),
  }

  return backup
}

// ---------------------------------------------------------------------------
// TEST 1: 100 expected records but only 70 persisted
// ---------------------------------------------------------------------------
await runTestAsync('Detects partial record write: 100 expected records but only 70 persisted', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 100 })

  let interceptActive = true
  onSetItem = (key, val) => {
    // Only intercept the restore write of employee records, not the snapshot or rollback
    if (interceptActive && key === EMPLOYEES_STORAGE_KEY) {
      interceptActive = false // Only truncate once
      const parsed = JSON.parse(val)
      const truncated = parsed.slice(0, 70)
      return JSON.stringify(truncated)
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when record count is truncated')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Restored record count mismatch \(expected 100, persisted 70\)/)

  // Verify rollback restored original state
  const liveRecords = getStoredEmployees()
  assert.strictEqual(liveRecords.length, 2)
  assert.strictEqual(liveRecords[0].fullName, 'Initial User One')
})

// ---------------------------------------------------------------------------
// TEST 2: Correct record count but one record has modified data
// ---------------------------------------------------------------------------
await runTestAsync('Detects record data tampering: correct count but one record has modified fields', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 10 })

  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === EMPLOYEES_STORAGE_KEY) {
      interceptActive = false
      const parsed = JSON.parse(val)
      parsed[3].department = 'Tampered Malicious Department'
      return JSON.stringify(parsed)
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when record data is modified')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Record data mismatch for record "target_org_2::target_rec_004"/)

  // Verify rollback restored original state
  const liveRecords = getStoredEmployees()
  assert.strictEqual(liveRecords.length, 2)
  assert.strictEqual(liveRecords[0].department, 'IT')
})

// ---------------------------------------------------------------------------
// TEST 3: One organization missing after write
// ---------------------------------------------------------------------------
await runTestAsync('Detects missing organization: expected 3 organizations but only 2 persisted', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 6, orgCount: 3 })

  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === ORGANIZATIONS_STORAGE_KEY) {
      interceptActive = false
      const parsed = JSON.parse(val)
      const droppedOne = parsed.slice(0, 2)
      return JSON.stringify(droppedOne)
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when organization is missing')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Restored organization count mismatch \(expected 3, persisted 2\)/)

  const liveOrgs = getStoredOrganizations()
  assert.strictEqual(liveOrgs.length, 2)
  assert.strictEqual(liveOrgs[0].name, 'Initial Organization One')
})

// ---------------------------------------------------------------------------
// TEST 4: Correct organization count but incorrect organization data
// ---------------------------------------------------------------------------
await runTestAsync('Detects organization data tampering: correct count but modified organization details', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 4, orgCount: 2 })

  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === ORGANIZATIONS_STORAGE_KEY) {
      interceptActive = false
      const parsed = JSON.parse(val)
      parsed[0].name = 'Unauthorized Altered Org Name'
      return JSON.stringify(parsed)
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when organization data is tampered')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Organization data mismatch for organization "target_org_1"/)

  const liveOrgs = getStoredOrganizations()
  assert.strictEqual(liveOrgs[0].name, 'Initial Organization One')
})

// ---------------------------------------------------------------------------
// TEST 5: Template settings not persisted correctly
// ---------------------------------------------------------------------------
await runTestAsync('Detects corrupted or altered template settings', async () => {
  resetEnvironment()
  const backup = buildTestBackup({
    recordCount: 2,
    templateSettings: { 'custom-theme': { primaryColor: '#3b82f6', cardRadius: 8 } },
  })

  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === TEMPLATE_STORAGE_KEY) {
      interceptActive = false
      return JSON.stringify({ 'custom-theme': { primaryColor: '#000000', cardRadius: 0 } })
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when template settings differ')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Template settings were not persisted correctly/)
})

// ---------------------------------------------------------------------------
// TEST 6: Active organization ID not persisted correctly
// ---------------------------------------------------------------------------
await runTestAsync('Detects active organization ID mismatch after restore', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 2, activeOrgId: 'target_org_2' })

  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === ACTIVE_ORG_STORAGE_KEY) {
      interceptActive = false
      return 'wrong_tenant_id'
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when activeOrgId does not match')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Active organization ID mismatch \(expected "target_org_2", persisted "wrong_tenant_id"\)/)
})

// ---------------------------------------------------------------------------
// TEST 7: Successful exact restore
// ---------------------------------------------------------------------------
await runTestAsync('Executes successful exact restore in Replace mode and verifies all entities', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 15, orgCount: 3, activeOrgId: 'target_org_3' })

  const result = await executeStagedRestore({
    backupData: backup,
    mode: 'replace',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.recordsCount, 15)
  assert.strictEqual(result.organizationsCount, 3)

  // Verify persistent storage directly
  const liveRecords = getStoredEmployees()
  const liveOrgs = getStoredOrganizations()
  const activeOrg = getActiveOrganizationId()

  assert.strictEqual(liveRecords.length, 15)
  assert.strictEqual(liveOrgs.length, 3)
  assert.strictEqual(activeOrg, 'target_org_3')
  assert.strictEqual(liveRecords[0].fullName, 'Target Cardholder 1')
  assert.strictEqual(liveOrgs[0].id, 'target_org_1')
})

await runTestAsync('Executes successful exact restore in Merge mode', async () => {
  resetEnvironment()
  const backup = buildTestBackup({ recordCount: 5, orgCount: 2 })

  const result = await executeStagedRestore({
    backupData: backup,
    mode: 'merge',
    conflictResolution: 'incoming',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.recordsCount, 7) // 2 initial + 5 incoming

  const liveRecords = getStoredEmployees()
  assert.strictEqual(liveRecords.length, 7)
})

// ---------------------------------------------------------------------------
// TEST 8: Successful rollback after verification failure
// ---------------------------------------------------------------------------
await runTestAsync('Verification failure cleanly rolls back records, orgs, templates, and activeOrgId', async () => {
  resetEnvironment()

  // Verify pre-restore baseline
  assert.strictEqual(getStoredEmployees().length, 2)
  assert.strictEqual(getStoredOrganizations().length, 2)
  assert.strictEqual(getActiveOrganizationId(), 'initial_org_1')

  const backup = buildTestBackup({ recordCount: 20, orgCount: 4, activeOrgId: 'target_org_4' })

  // Trigger verification failure by modifying one record
  let interceptActive = true
  onSetItem = (key, val) => {
    if (interceptActive && key === EMPLOYEES_STORAGE_KEY) {
      interceptActive = false
      const parsed = JSON.parse(val)
      parsed[10].fullName = 'Injected Failure Name'
      return JSON.stringify(parsed)
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail on verification')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)

  // Baseline must be completely and cleanly restored
  const rolledBackRecords = getStoredEmployees()
  const rolledBackOrgs = getStoredOrganizations()
  const rolledBackActiveOrg = getActiveOrganizationId()

  assert.strictEqual(rolledBackRecords.length, 2, 'Records must roll back to 2')
  assert.strictEqual(rolledBackRecords[0].fullName, 'Initial User One')
  assert.strictEqual(rolledBackRecords[1].fullName, 'Initial User Two')

  assert.strictEqual(rolledBackOrgs.length, 2, 'Orgs must roll back to 2')
  assert.strictEqual(rolledBackOrgs[0].name, 'Initial Organization One')
  assert.strictEqual(rolledBackOrgs[1].name, 'Initial Organization Two')

  assert.strictEqual(rolledBackActiveOrg, 'initial_org_1', 'Active org must roll back')
})

console.log('\n====================================================')
console.log(`📊 Phase 11E Test Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}
