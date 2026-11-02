/**
 * Phase 11B — Restore Safety and Rollback Error Remediation Test Suite
 *
 * Automated tests covering:
 * 1. localStorage.setItem() throws QuotaExceededError during organization restore.
 * 2. localStorage.setItem() throws during employee/record restore.
 * 3. IndexedDB photo write failure triggers rollback.
 * 4. Restore fails, but rollback succeeds: verify accurate safe rollback reporting.
 * 5. Restore fails and rollback also fails: verify BOTH failures explicitly reported.
 * 6. Recovery snapshot is corrupted: verify rollback failure surfaced cleanly.
 * 7. Successful restore still works normally in both Merge and Replace modes.
 * 8. Existing application storage operations retain their non-throwing default behavior.
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
  ORGANIZATIONS_STORAGE_KEY,
  setActiveOrganizationId,
} from '../src/utils/organizationStorage.js'
import {
  saveTemplateSettings,
  getSavedTemplateSettings,
  TEMPLATE_STORAGE_KEY,
} from '../src/utils/templateStorage.js'

let passed = 0
let failed = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message)
    failed++
  }
}

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
console.log('🧪 Starting Phase 11B Restore Safety & Rollback Tests')
console.log('====================================================')

// In-memory backing store for localStorage mock
const localStore = new Map()
let failOnKey = null
let failCount = 0
let failError = null
let blockSnapshotWrites = false

global.localStorage = {
  getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => {
    if (k === RECOVERY_SNAPSHOT_KEY && blockSnapshotWrites) {
      return // Disallow updating snapshot
    }
    if (failOnKey && k === failOnKey && failCount > 0) {
      failCount--
      throw failError || new Error(`Injected write failure for ${k}`)
    }
    return localStore.set(k, String(v))
  },
  removeItem: (k) => localStore.delete(k),
  clear: () => localStore.clear(),
}

// Ensure global.window is undefined by default in Node test
delete global.window

function resetEnvironment() {
  localStore.clear()
  failOnKey = null
  failCount = 0
  failError = null
  blockSnapshotWrites = false
  delete global.window

  const initialOrgs = [
    { id: 'safe_org', name: 'Safe Live Organization', isArchived: false },
  ]
  const initialRecords = [
    { recordId: 'safe_rec_1', organizationId: 'safe_org', fullName: 'Safe User Before Test' },
  ]

  saveStoredOrganizations(initialOrgs)
  saveStoredEmployees(initialRecords)
  setActiveOrganizationId('safe_org')
}

function createValidBackupPayload() {
  const payload = {
    schemaVersion: '2.1.0',
    activeOrgId: 'incoming_org',
    organizations: [{ id: 'incoming_org', name: 'Incoming Restored Org' }],
    records: [{ recordId: 'incoming_rec_1', organizationId: 'incoming_org', fullName: 'Incoming Restored User' }],
    photos: [],
    templateSettings: { 'custom-theme': { color: '#00ff00' } },
  }
  payload.integrity = {
    algorithm: 'SHA-256',
    schemaVersion: '2.1.0',
    recordsCount: payload.records.length,
    organizationsCount: payload.organizations.length,
    photosCount: payload.photos.length,
    checksum: computeBackupChecksum(payload),
  }
  return payload
}

// ---------------------------------------------------------------------------
// TEST 1: QuotaExceededError during organization restore triggers rollback
// ---------------------------------------------------------------------------
await runTestAsync('localStorage QuotaExceededError during organization restore triggers rollback', async () => {
  resetEnvironment()

  failOnKey = ORGANIZATIONS_STORAGE_KEY
  failCount = 1 // Fail the restore write, but allow rollback write to succeed
  const quotaErr = new Error('QuotaExceededError: The quota has been exceeded')
  quotaErr.name = 'QuotaExceededError'
  failError = quotaErr

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: createValidBackupPayload(),
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    failOnKey = null
  }

  assert.ok(caughtErr, 'Restore must fail on storage quota error')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.message, /QuotaExceededError/)

  // Confirm safe rollback restored original data
  const orgs = getStoredOrganizations()
  const recs = getStoredEmployees()
  assert.strictEqual(orgs[0].name, 'Safe Live Organization')
  assert.strictEqual(recs[0].fullName, 'Safe User Before Test')
})

// ---------------------------------------------------------------------------
// TEST 2: localStorage error during employee/record restore triggers rollback
// ---------------------------------------------------------------------------
await runTestAsync('localStorage write failure during employee/record restore triggers rollback', async () => {
  resetEnvironment()

  failOnKey = EMPLOYEES_STORAGE_KEY
  failCount = 1 // Fail restore write, allow rollback write
  failError = new Error('EIO: Hardware I/O disk error writing employees')

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: createValidBackupPayload(),
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    failOnKey = null
  }

  assert.ok(caughtErr, 'Restore must fail on record write error')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.message, /EIO: Hardware I\/O disk error/)

  const recs = getStoredEmployees()
  assert.strictEqual(recs[0].fullName, 'Safe User Before Test')
})

// ---------------------------------------------------------------------------
// TEST 3: IndexedDB photo write failure triggers rollback
// ---------------------------------------------------------------------------
await runTestAsync('IndexedDB photo write failure triggers rollback and restores state', async () => {
  resetEnvironment()

  // Setup fake indexedDB window that rejects on open
  global.window = {
    indexedDB: {
      open: () => {
        const req = {}
        setTimeout(() => {
          if (req.onerror) {
            req.error = new Error('Disk full: IndexedDB failed to allocate quota for photo blob')
            req.onerror({ target: req })
          }
        }, 0)
        return req
      },
    },
  }

  const backupWithPhoto = createValidBackupPayload()
  backupWithPhoto.photos = [
    {
      photoKey: 'incoming_org:p1',
      organizationId: 'incoming_org',
      recordId: 'incoming_rec_1',
      filename: 'p1.jpg',
      mimeType: 'image/jpeg',
      base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    },
  ]
  backupWithPhoto.integrity.checksum = computeBackupChecksum(backupWithPhoto)

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: backupWithPhoto,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    delete global.window
  }

  assert.ok(caughtErr, 'Restore must fail when IndexedDB photo write throws')
  assert.match(caughtErr.message, /Restoration failed and changes were safely rolled back/)
  assert.match(caughtErr.message, /IndexedDB/)

  const recs = getStoredEmployees()
  assert.strictEqual(recs[0].fullName, 'Safe User Before Test')
})

// ---------------------------------------------------------------------------
// TEST 4: Restore fails, but rollback succeeds: accurate message
// ---------------------------------------------------------------------------
await runTestAsync('Restore failure with successful rollback reports safe rollback and retains restoreError', async () => {
  resetEnvironment()

  // Invalid payload with 0 records triggers restore failure after snapshot
  const zeroRecordBackup = createValidBackupPayload()
  zeroRecordBackup.records = []
  zeroRecordBackup.integrity.checksum = computeBackupChecksum(zeroRecordBackup)

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: zeroRecordBackup,
      mode: 'merge',
    })
  } catch (err) {
    caughtErr = err
  }

  assert.ok(caughtErr)
  assert.match(caughtErr.message, /^Restoration failed and changes were safely rolled back: /)
  assert.ok(caughtErr.restoreError, 'Preserves original restore error object')
  assert.match(caughtErr.restoreError.message, /Backup contains 0 records/)
})

// ---------------------------------------------------------------------------
// TEST 5: Restore fails AND rollback also fails: reports BOTH explicitly
// ---------------------------------------------------------------------------
await runTestAsync('Restore fails AND rollback also fails reports both errors without claiming safe rollback', async () => {
  resetEnvironment()

  // Pre-seed a corrupt snapshot and block updates
  localStore.set(RECOVERY_SNAPSHOT_KEY, '{ totally broken corrupt json')
  blockSnapshotWrites = true

  // Trigger restore error with 0 records
  const zeroRecordBackup = createValidBackupPayload()
  zeroRecordBackup.records = []
  zeroRecordBackup.integrity.checksum = computeBackupChecksum(zeroRecordBackup)

  let caughtErr = null
  try {
    await executeStagedRestore({
      backupData: zeroRecordBackup,
      mode: 'replace',
    })
  } catch (err) {
    caughtErr = err
  } finally {
    blockSnapshotWrites = false
  }

  assert.ok(caughtErr, 'Must throw fatal error')
  // MUST NOT say changes were safely rolled back!
  assert.strictEqual(
    caughtErr.message.includes('changes were safely rolled back'),
    false,
    'Must NEVER claim changes were safely rolled back when rollback failed'
  )
  assert.match(caughtErr.message, /^Critical: Restoration failed/)
  assert.match(caughtErr.message, /automatic rollback also failed/)
  assert.match(caughtErr.message, /Please reload the application and verify your data/)

  assert.ok(caughtErr.restoreError, 'Must preserve restoreError')
  assert.ok(caughtErr.rollbackError, 'Must preserve rollbackError')
  assert.match(caughtErr.rollbackError.message, /Rollback failed/)
})

// ---------------------------------------------------------------------------
// TEST 6: Recovery snapshot is corrupted
// ---------------------------------------------------------------------------
await runTestAsync('Corrupted recovery snapshot throws clean Rollback failed error directly', async () => {
  resetEnvironment()
  localStore.set(RECOVERY_SNAPSHOT_KEY, 'NOT_VALID_JSON')

  let caughtErr = null
  try {
    await rollbackFromRecoverySnapshot()
  } catch (err) {
    caughtErr = err
  }

  assert.ok(caughtErr)
  assert.match(caughtErr.message, /^Rollback failed: /)
})

// ---------------------------------------------------------------------------
// TEST 7: Successful restore still works normally (Merge and Replace)
// ---------------------------------------------------------------------------
await runTestAsync('Successful restore executes cleanly in Replace mode and updates persistent storage', async () => {
  resetEnvironment()

  const validBackup = createValidBackupPayload()
  const result = await executeStagedRestore({
    backupData: validBackup,
    mode: 'replace',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.recordsCount, 1)

  // Verify actual persistent storage
  const persistedRecs = getStoredEmployees()
  const persistedOrgs = getStoredOrganizations()
  assert.strictEqual(persistedRecs[0].fullName, 'Incoming Restored User')
  assert.strictEqual(persistedOrgs[0].name, 'Incoming Restored Org')
})

await runTestAsync('Successful restore executes cleanly in Merge mode', async () => {
  resetEnvironment()

  const validBackup = createValidBackupPayload()
  const result = await executeStagedRestore({
    backupData: validBackup,
    mode: 'merge',
    conflictResolution: 'incoming',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.recordsCount, 2) // 1 initial + 1 incoming

  const persistedRecs = getStoredEmployees()
  assert.strictEqual(persistedRecs.length, 2)
})

// ---------------------------------------------------------------------------
// TEST 8: Existing application storage operations retain non-throwing default
// ---------------------------------------------------------------------------
runTest('Existing storage functions do not throw when options are omitted', () => {
  resetEnvironment()

  // Simulate unexpected storage error
  failOnKey = EMPLOYEES_STORAGE_KEY
  failCount = 1
  failError = new Error('Simulated Quota Error for regular UI operation')

  let threw = false
  try {
    // Default call without { throwOnError: true }
    saveStoredEmployees([{ recordId: 'test_rec' }])
  } catch (err) {
    threw = true
  } finally {
    failOnKey = null
  }

  assert.strictEqual(threw, false, 'Default saveStoredEmployees must not crash regular callers')
})

runTest('Existing organization storage functions do not throw when options are omitted', () => {
  resetEnvironment()

  failOnKey = ORGANIZATIONS_STORAGE_KEY
  failCount = 1
  failError = new Error('Simulated Quota Error for regular UI organization save')

  let threw = false
  try {
    saveStoredOrganizations([{ id: 'test_org' }])
  } catch (err) {
    threw = true
  } finally {
    failOnKey = null
  }

  assert.strictEqual(threw, false, 'Default saveStoredOrganizations must not crash regular callers')
})

runTest('Storage functions throw when { throwOnError: true } is explicitly provided', () => {
  resetEnvironment()

  failOnKey = EMPLOYEES_STORAGE_KEY
  failCount = 1
  failError = new Error('Explicit error requested')

  let threw = false
  try {
    saveStoredEmployees([{ recordId: 'test_rec' }], { throwOnError: true })
  } catch (err) {
    threw = true
    assert.match(err.message, /Explicit error requested/)
  } finally {
    failOnKey = null
  }

  assert.strictEqual(threw, true, 'Must throw when throwOnError: true')
})

console.log('\n====================================================')
console.log(`📊 Phase 11B Test Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}
