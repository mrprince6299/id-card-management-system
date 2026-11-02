/**
 * Phase 11H — Empty-State Rollback Compatibility & Production API Cleanup Test Suite
 *
 * Automated tests covering:
 * 1. Empty records and organizations with null activeOrgId.
 * 2. Empty records but existing organizations.
 * 3. Existing records with no active organization (activeOrgId: null).
 * 4. Zero photos empty snapshot structure.
 * 5. Successful rollback to an initially empty application.
 * 6. Restore failure followed by successful rollback to an empty application.
 * 7. Malformed snapshots still rejected before any writes.
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
} from '../src/utils/templateStorage.js'
import {
  snapshotPhotosInMemory,
  restorePhotosFromSnapshot,
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
console.log('🧪 Starting Phase 11H Empty-State Rollback Tests')
console.log('====================================================')

const memoryStore = new Map()

global.localStorage = {
  getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

delete global.window

function resetToEmptyState() {
  memoryStore.clear()
  delete global.window

  saveStoredEmployees([])
  saveStoredOrganizations([])
  setActiveOrganizationId(null)
  saveTemplateSettings({})
}

// ---------------------------------------------------------------------------
// TEST 1: Empty records and organizations with null activeOrgId
// ---------------------------------------------------------------------------
await runTestAsync('1. Rolls back cleanly with empty records, empty organizations, and null activeOrgId', async () => {
  resetToEmptyState()

  const emptySnapshot = {
    timestamp: new Date().toISOString(),
    records: [],
    organizations: [],
    activeOrgId: null,
    templateSettings: {},
    photoMeta: { count: 0, captured: true },
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(emptySnapshot))

  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)

  const recs = getStoredEmployees()
  const orgs = getStoredOrganizations()
  const activeOrg = getActiveOrganizationId()

  assert.strictEqual(recs.length, 0, 'Records must be empty array')
  assert.strictEqual(orgs.length, 0, 'Organizations must be empty array')
  assert.strictEqual(activeOrg, null, 'Active org must be null')
})

// ---------------------------------------------------------------------------
// TEST 2: Empty records but existing organizations
// ---------------------------------------------------------------------------
await runTestAsync('2. Rolls back cleanly with empty records but existing organizations', async () => {
  resetToEmptyState()

  const snapshot = {
    timestamp: new Date().toISOString(),
    records: [],
    organizations: [{ id: 'org_alpha', name: 'Alpha Organization' }],
    activeOrgId: 'org_alpha',
    templateSettings: { theme: 'dark' },
    photoMeta: { count: 0, captured: true },
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snapshot))

  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)

  const recs = getStoredEmployees()
  const orgs = getStoredOrganizations()
  const activeOrg = getActiveOrganizationId()

  assert.strictEqual(recs.length, 0)
  assert.strictEqual(orgs.length, 1)
  assert.strictEqual(orgs[0].id, 'org_alpha')
  assert.strictEqual(activeOrg, 'org_alpha')
})

// ---------------------------------------------------------------------------
// TEST 3: Existing records with no active organization (null)
// ---------------------------------------------------------------------------
await runTestAsync('3. Rolls back cleanly with existing records and null activeOrgId', async () => {
  resetToEmptyState()

  const snapshot = {
    timestamp: new Date().toISOString(),
    records: [{ recordId: 'unassigned_1', organizationId: 'unassigned-legacy', fullName: 'Unassigned User' }],
    organizations: [],
    activeOrgId: null,
    templateSettings: {},
    photoMeta: { count: 0, captured: true },
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snapshot))

  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)

  const recs = getStoredEmployees()
  const activeOrg = getActiveOrganizationId()

  assert.strictEqual(recs.length, 1)
  assert.strictEqual(recs[0].fullName, 'Unassigned User')
  assert.strictEqual(activeOrg, null)
})

// ---------------------------------------------------------------------------
// TEST 4: Zero photos empty snapshot structure
// ---------------------------------------------------------------------------
await runTestAsync('4. Validates empty photo snapshot with zero photos', async () => {
  resetToEmptyState()

  const snapshot = {
    timestamp: new Date().toISOString(),
    records: [],
    organizations: [],
    activeOrgId: null,
    templateSettings: {},
    photoMeta: { count: 0, captured: true },
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(snapshot))

  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)
})

// ---------------------------------------------------------------------------
// TEST 5: Successful rollback to an initially empty application
// ---------------------------------------------------------------------------
await runTestAsync('5. Captures snapshot of empty application and rolls back to empty state after staging changes', async () => {
  resetToEmptyState()

  // 1. App starts completely empty: capture snapshot
  await createRecoverySnapshot()

  // 2. Simulate staging changes that populate storage
  saveStoredEmployees([{ recordId: 'temp_rec_1', organizationId: 'temp_org', fullName: 'Temporary Cardholder' }])
  saveStoredOrganizations([{ id: 'temp_org', name: 'Temporary Organization' }])
  setActiveOrganizationId('temp_org')

  assert.strictEqual(getStoredEmployees().length, 1)
  assert.strictEqual(getStoredOrganizations().length, 1)
  assert.strictEqual(getActiveOrganizationId(), 'temp_org')

  // 3. Rollback
  const result = await rollbackFromRecoverySnapshot()
  assert.strictEqual(result.rolledBack, true)

  // 4. Assert application is restored to exact empty state
  assert.strictEqual(getStoredEmployees().length, 0, 'Employees must be empty after rollback')
  assert.strictEqual(getStoredOrganizations().length, 0, 'Organizations must be empty after rollback')
  assert.strictEqual(getActiveOrganizationId(), null, 'Active org must be null after rollback')
})

// ---------------------------------------------------------------------------
// TEST 6: Restore failure followed by successful rollback to an empty application
// ---------------------------------------------------------------------------
await runTestAsync('6. Restore failure rolls back cleanly to initially empty application', async () => {
  resetToEmptyState()

  // Construct incoming backup with checksum mismatch to trigger restore failure
  const incomingBackup = {
    schemaVersion: '2.1.0',
    activeOrgId: 'incoming_org',
    organizations: [{ id: 'incoming_org', name: 'Incoming Org' }],
    records: [{ recordId: 'incoming_rec_1', organizationId: 'incoming_org', fullName: 'Incoming User' }],
    photos: [],
    templateSettings: { 'custom-theme': { color: '#ff0000' } },
    integrity: {
      algorithm: 'SHA-256',
      schemaVersion: '2.1.0',
      recordsCount: 1,
      organizationsCount: 1,
      photosCount: 0,
      checksum: 'SHA256:0000000000000000000000000000000000000000000000000000000000000000', // Invalid checksum
    },
  }

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: incomingBackup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  }

  assert.ok(caughtErr, 'Restore must fail on checksum mismatch')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)

  // Confirm live application remains 100% empty
  assert.strictEqual(getStoredEmployees().length, 0, 'Employees must remain 0')
  assert.strictEqual(getStoredOrganizations().length, 0, 'Organizations must remain 0')
  assert.strictEqual(getActiveOrganizationId(), null, 'Active org must remain null')
})

// ---------------------------------------------------------------------------
// TEST 7: Malformed snapshots still rejected before any writes
// ---------------------------------------------------------------------------
await runTestAsync('7. Rejects malformed recovery snapshot without performing any storage writes', async () => {
  resetToEmptyState()

  // Set initial state
  saveStoredEmployees([{ recordId: 'live_rec_1', organizationId: 'live_org_1', fullName: 'Live Cardholder' }])
  saveStoredOrganizations([{ id: 'live_org_1', name: 'Live Org' }])
  setActiveOrganizationId('live_org_1')

  const baselineRecs = JSON.stringify(getStoredEmployees())
  const baselineOrgs = JSON.stringify(getStoredOrganizations())
  const baselineActive = getActiveOrganizationId()

  // Malformed snapshot: activeOrgId is a number
  const malformedSnap = {
    timestamp: new Date().toISOString(),
    records: [{ recordId: 'SHOULD_NEVER_BE_WRITTEN', organizationId: 'fake', fullName: 'Fake' }],
    organizations: [{ id: 'fake_org', name: 'Fake Org' }],
    activeOrgId: 123456, // INVALID TYPE
    templateSettings: {},
  }
  memoryStore.set(RECOVERY_SNAPSHOT_KEY, JSON.stringify(malformedSnap))

  let caught = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caught = err
  }

  assert.ok(caught)
  assert.match(caught.message, /Recovery snapshot "activeOrgId" must be a string or null/)

  // Assert ZERO writes were executed
  assert.strictEqual(JSON.stringify(getStoredEmployees()), baselineRecs, 'Records must remain untouched')
  assert.strictEqual(JSON.stringify(getStoredOrganizations()), baselineOrgs, 'Orgs must remain untouched')
  assert.strictEqual(getActiveOrganizationId(), baselineActive, 'Active org must remain untouched')
})

// ---------------------------------------------------------------------------
// TEST 8: Purges staged IndexedDB photos when rolling back to an empty photo snapshot
// ---------------------------------------------------------------------------
await runTestAsync('8. Purges staged IndexedDB photos when rolling back to an empty photo snapshot', async () => {
  resetToEmptyState()

  let inMemoryDB = []
  let clearCount = 0

  const mockStore = {
    getAll: () => {
      const req = { result: [...inMemoryDB], onsuccess: null, onerror: null }
      setTimeout(() => req.onsuccess?.({ target: req }), 0)
      return req
    },
    clear: () => {
      clearCount++
      inMemoryDB = []
    },
    put: (item) => {
      inMemoryDB.push(item)
    },
  }

  const mockDb = {
    transaction: () => {
      const tx = {
        objectStore: () => mockStore,
        oncomplete: null,
        onerror: null,
      }
      setTimeout(() => tx.oncomplete?.(), 0)
      return tx
    },
    close: () => {},
  }

  global.window = {
    indexedDB: {
      open: () => {
        const req = { result: mockDb, onsuccess: null, onerror: null }
        setTimeout(() => req.onsuccess?.({ target: req }), 0)
        return req
      },
    },
  }

  // 1. Initial snapshot captured when IndexedDB is empty
  const snapshot = await snapshotPhotosInMemory()
  assert.strictEqual(snapshot.length, 0, 'Initial snapshot must have 0 photos')

  // 2. Simulate staged restore writing new photos to IndexedDB
  mockStore.put({ photoKey: 'org_1::rec_1', employeeId: 'rec_1', dataUrl: 'data:image/png;base64,...' })
  mockStore.put({ photoKey: 'org_1::rec_2', employeeId: 'rec_2', dataUrl: 'data:image/png;base64,...' })
  assert.strictEqual(inMemoryDB.length, 2, 'Staged photos must now be present in IndexedDB')

  // 3. Rollback photos from snapshot
  const restoredCount = await restorePhotosFromSnapshot()
  assert.strictEqual(restoredCount, 0, 'Restored count must be 0')
  assert.strictEqual(clearCount, 1, 'store.clear() must have been called during rollback')
  assert.strictEqual(inMemoryDB.length, 0, 'IndexedDB must be completely empty after rolling back to empty snapshot')

  delete global.window
})

console.log('\n====================================================')
console.log(`📊 Phase 11H Test Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}
