/**
 * Phase 11G — Template Persistence & Recovery Snapshot Validation Test Suite
 *
 * Automated tests covering:
 *
 * SECTION 1: Template Settings Verification
 * 1. Expected settings missing from localStorage.
 * 2. Corrupted settings that hydrate into apparently valid defaults.
 * 3. Correctly persisted default settings.
 * 4. Correctly persisted customized settings.
 * 5. Legacy backup without template settings.
 * 6. Rollback after template verification failure.
 *
 * SECTION 2: Recovery Snapshot Structural Validation
 * 1. Missing records.
 * 2. Records with incorrect type.
 * 3. Missing organizations.
 * 4. Malformed template settings.
 * 5. Invalid activeOrgId.
 * 6. Incomplete photo snapshot.
 * 7. Valid recovery snapshot and successful rollback.
 * 8. Invalid recovery snapshot with no unintended writes.
 */

import assert from 'assert'
import {
  executeStagedRestore,
  createRecoverySnapshot,
  rollbackFromRecoverySnapshot,
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
  DEFAULT_TEMPLATE_SETTINGS,
} from '../src/utils/templateStorage.js'
import {
  snapshotPhotosInMemory,
} from '../src/utils/photoStorage.js'

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
console.log('🧪 Starting Phase 11G Template & Snapshot Validation Suite')
console.log('====================================================')

const memoryStore = new Map()
let onSetItem = null

global.localStorage = {
  getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
  setItem: (k, v) => {
    if (onSetItem) {
      const intercepted = onSetItem(k, v)
      if (intercepted !== undefined) {
        if (intercepted === null) {
          memoryStore.delete(k)
          return
        }
        return memoryStore.set(k, String(intercepted))
      }
    }
    return memoryStore.set(k, String(v))
  },
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

delete global.window

const BASELINE_ORGS = [
  { id: 'baseline_org_1', name: 'Baseline Org 1', isArchived: false },
]

const BASELINE_RECORDS = [
  { recordId: 'base_rec_1', organizationId: 'baseline_org_1', fullName: 'Baseline Cardholder 1' },
]

function resetEnvironment() {
  memoryStore.clear()
  onSetItem = null
  delete global.window

  saveStoredOrganizations(BASELINE_ORGS)
  saveStoredEmployees(BASELINE_RECORDS)
  setActiveOrganizationId('baseline_org_1')
  saveTemplateSettings({ selectedTemplateId: 'corporate-blue' })
}

function makeBackup({ templateSettings = null, recordCount = 2, orgCount = 1 } = {}) {
  const orgs = []
  for (let i = 1; i <= orgCount; i++) {
    orgs.push({
      id: `restore_org_${i}`,
      name: `Restored Org ${i}`,
      isArchived: false,
    })
  }

  const records = []
  for (let i = 1; i <= recordCount; i++) {
    records.push({
      recordId: `restore_rec_${i}`,
      organizationId: orgs[0].id,
      fullName: `Restored Cardholder ${i}`,
      department: 'Testing',
    })
  }

  const backup = {
    schemaVersion: '2.1.0',
    activeOrgId: orgs[0].id,
    organizations: orgs,
    records,
    photos: [],
  }

  if (templateSettings !== null) {
    backup.templateSettings = templateSettings
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

// ===========================================================================
// SECTION 1: TEMPLATE SETTINGS VERIFICATION
// ===========================================================================
console.log('\n--- SECTION 1: Template Settings Verification ---')

// 1. Expected settings missing from localStorage
await runTestAsync('1. Rejects restore when expected template settings are missing from localStorage', async () => {
  resetEnvironment()
  const backup = makeBackup({ templateSettings: { selectedTemplateId: 'modern-tech' } })

  let intercept = true
  onSetItem = (k, v) => {
    // Delete/drop the template settings write
    if (intercept && k === TEMPLATE_STORAGE_KEY) {
      intercept = false
      return null // Causes deletion from memoryStore
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({ backupData: backup, mode: 'replace' })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail when template settings are missing from storage')
  assert.match(caughtErr.restoreError.message, /Verification failure: Template settings were not persisted to localStorage/)
  assert.strictEqual(getStoredEmployees()[0].fullName, 'Baseline Cardholder 1')
})

// 2. Corrupted settings that hydrate into apparently valid defaults
await runTestAsync('2. Rejects corrupted settings and does not let defaults conceal missing data', async () => {
  resetEnvironment()
  // Backup expects default template settings
  const backup = makeBackup({ templateSettings: DEFAULT_TEMPLATE_SETTINGS })

  let intercept = true
  onSetItem = (k, v) => {
    // Inject corrupt JSON or non-object in localStorage
    if (intercept && k === TEMPLATE_STORAGE_KEY) {
      intercept = false
      return 'CORRUPTED_NON_JSON_VALUE'
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({ backupData: backup, mode: 'replace' })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr, 'Must fail on corrupted template storage even if defaults match')
  assert.match(caughtErr.restoreError.message, /Verification failure: Persisted template settings contain invalid JSON/)
})

// 3. Correctly persisted default settings
await runTestAsync('3. Successfully restores correctly persisted default settings', async () => {
  resetEnvironment()
  const backup = makeBackup({ templateSettings: DEFAULT_TEMPLATE_SETTINGS })

  const result = await executeStagedRestore({ backupData: backup, mode: 'replace' })
  assert.strictEqual(result.success, true)

  const persistedRaw = JSON.parse(memoryStore.get(TEMPLATE_STORAGE_KEY))
  assert.strictEqual(persistedRaw.selectedTemplateId, 'corporate-blue')
})

// 4. Correctly persisted customized settings
await runTestAsync('4. Successfully restores customized template settings', async () => {
  resetEnvironment()
  const custom = {
    selectedTemplateId: 'executive-minimal',
    customAccentColor: '#9333ea',
    showBloodGroup: false,
    companyName: 'ACME LABS',
  }
  const backup = makeBackup({ templateSettings: custom })

  const result = await executeStagedRestore({ backupData: backup, mode: 'replace' })
  assert.strictEqual(result.success, true)

  const persistedRaw = JSON.parse(memoryStore.get(TEMPLATE_STORAGE_KEY))
  assert.strictEqual(persistedRaw.customAccentColor, '#9333ea')
  assert.strictEqual(persistedRaw.companyName, 'ACME LABS')
})

// 5. Legacy backup without template settings
await runTestAsync('5. Successfully restores legacy backup without template settings', async () => {
  resetEnvironment()
  // No templateSettings provided
  const backup = makeBackup({ templateSettings: null })

  const result = await executeStagedRestore({ backupData: backup, mode: 'replace' })
  assert.strictEqual(result.success, true)
  assert.strictEqual(getStoredEmployees()[0].fullName, 'Restored Cardholder 1')
})

// 6. Rollback after template verification failure
await runTestAsync('6. Accurately rolls back live state after template verification failure', async () => {
  resetEnvironment()
  const backup = makeBackup({ templateSettings: { selectedTemplateId: 'modern-tech' } })

  let intercept = true
  onSetItem = (k, v) => {
    // Write wrong template settings
    if (intercept && k === TEMPLATE_STORAGE_KEY) {
      intercept = false
      return JSON.stringify({ selectedTemplateId: 'wrong-template-id' })
    }
  }

  let caughtErr = null
  try {
    await executeStagedRestore({ backupData: backup, mode: 'replace' })
  } catch (err) {
    caughtErr = err
  } finally {
    onSetItem = null
  }

  assert.ok(caughtErr)
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.restoreError.message, /Verification failure: Template settings were not persisted correctly/)

  // Baseline data verified
  assert.strictEqual(getStoredEmployees()[0].fullName, 'Baseline Cardholder 1')
  assert.strictEqual(getActiveOrganizationId(), 'baseline_org_1')
})

// ===========================================================================
// SECTION 2: RECOVERY SNAPSHOT STRUCTURAL VALIDATION
// ===========================================================================
console.log('\n--- SECTION 2: Recovery Snapshot Structural Validation ---')

function makeValidSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    records: [{ recordId: 'snap_rec_1', organizationId: 'snap_org_1', fullName: 'Snapshot Cardholder' }],
    organizations: [{ id: 'snap_org_1', name: 'Snapshot Organization' }],
    activeOrgId: 'snap_org_1',
    templateSettings: { selectedTemplateId: 'corporate-blue' },
    photoMeta: { count: 0, captured: true },
  }
}

// 1. Missing records
await runTestAsync('1. Rejects recovery snapshot with missing records property', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  delete snap.records
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }
  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot is missing "records" property/)
})

// 2. Records with incorrect type
await runTestAsync('2. Rejects recovery snapshot where records is not an array', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  snap.records = 'invalid_not_array'
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }
  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot "records" must be an array/)
})

// 3. Missing organizations
await runTestAsync('3. Rejects recovery snapshot with missing organizations property', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  delete snap.organizations
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }
  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot is missing "organizations" property/)
})

// 4. Malformed template settings
await runTestAsync('4. Rejects recovery snapshot with malformed templateSettings', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  snap.templateSettings = 'not_an_object'
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }
  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot "templateSettings" must be an object/)
})

// 5. Invalid activeOrgId
await runTestAsync('5. Rejects recovery snapshot with invalid activeOrgId', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  snap.activeOrgId = 98765 // Not a string
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }
  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot "activeOrgId" must be a string/)
})

// 6. Incomplete photo snapshot
await runTestAsync('6. Rejects rollback when in-memory photo snapshot is incomplete', async () => {
  resetEnvironment()
  // Call production snapshot function on empty DB so in-memory snapshot has 0 photos
  await snapshotPhotosInMemory()

  const snap = makeValidSnapshot()
  snap.photoMeta = { count: 3, captured: true } // Expects 3 photos
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }

  assert.ok(caught)
  assert.match(caught.message, /Incomplete photo snapshot \(expected 3 photos, found 0\)/)
})

// 7. Valid recovery snapshot and successful rollback
await runTestAsync('7. Successfully rolls back from valid recovery snapshot', async () => {
  resetEnvironment()
  const snap = makeValidSnapshot()
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snap))

  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)

  const liveRecs = getStoredEmployees()
  const liveOrgs = getStoredOrganizations()
  const liveActiveOrg = getActiveOrganizationId()

  assert.strictEqual(liveRecs[0].fullName, 'Snapshot Cardholder')
  assert.strictEqual(liveOrgs[0].name, 'Snapshot Organization')
  assert.strictEqual(liveActiveOrg, 'snap_org_1')
})

// 8. Invalid recovery snapshot with no unintended writes
await runTestAsync('8. Confirms invalid recovery snapshot executes zero unintended writes', async () => {
  resetEnvironment()

  // Capture baseline state before rollback call
  const baselineRecs = JSON.stringify(getStoredEmployees())
  const baselineOrgs = JSON.stringify(getStoredOrganizations())
  const baselineActive = getActiveOrganizationId()
  const baselineTpl = JSON.stringify(memoryStore.get(TEMPLATE_STORAGE_KEY))

  // Create snapshot that is invalid on the last property (organizations missing)
  const invalidSnap = {
    timestamp: new Date().toISOString(),
    records: [{ recordId: 'SHOULD_NOT_BE_WRITTEN', organizationId: 'fake', fullName: 'Fake User' }],
    // missing organizations!
    activeOrgId: 'SHOULD_NOT_BE_SET',
    templateSettings: { selectedTemplateId: 'evil-template' },
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(invalidSnap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }

  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot is missing "organizations" property/)

  // Confirm NO records or settings were overwritten:
  assert.strictEqual(JSON.stringify(getStoredEmployees()), baselineRecs, 'Records must not have been modified')
  assert.strictEqual(JSON.stringify(getStoredOrganizations()), baselineOrgs, 'Organizations must not have been modified')
  assert.strictEqual(getActiveOrganizationId(), baselineActive, 'Active org must not have been modified')
  assert.strictEqual(JSON.stringify(memoryStore.get(TEMPLATE_STORAGE_KEY)), baselineTpl, 'Template settings must not have been modified')
})

console.log('\n====================================================')
console.log(`📊 Phase 11G Test Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}
