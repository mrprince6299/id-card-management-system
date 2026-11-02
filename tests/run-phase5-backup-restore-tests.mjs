import assert from 'node:assert'
import {
  BACKUP_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  RECOVERY_SNAPSHOT_KEY,
  LAST_BACKUP_METADATA_KEY,
  MAX_BACKUP_SIZE_BYTES,
  computeBackupChecksum,
  validateBackupStructure,
  createPlatformBackup,
  analyzeRestorePlan,
  createRecoverySnapshot,
  rollbackFromRecoverySnapshot,
  executeStagedRestore,
} from '../src/utils/backupSystem.js'
import {
  getStoredOrganizations,
  saveStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
} from '../src/utils/organizationStorage.js'
import { getStoredEmployees, saveStoredEmployees } from '../src/utils/storage.js'
import {
  buildPhotoKey,
  snapshotPhotosInMemory,
  restorePhotosFromSnapshot,
} from '../src/utils/photoStorage.js'
import { CARD_TEMPLATES } from '../src/utils/constants.js'

console.log('====================================================')
console.log('🧪 Starting Phase 5A Failure-Oriented Verification Suite')
console.log('====================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}: ${err.message}`)
    failed++
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}: ${err.message}`)
    failed++
  }
}

// In-memory mock localStorage for Node test runner
const memoryStorage = new Map()
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
}

// ---------------------------------------------------------------------------
// SECTION 1: BACKUP VALIDATION & DEEP INTEGRITY CHECKS
// ---------------------------------------------------------------------------
console.log('--- SECTION 1: Backup Validation & Deep Integrity Checks ---')

test('Validates well-formed v2.1.0 backup archive with checksum', () => {
  const baseData = {
    schemaVersion: '2.1.0',
    exportedAt: new Date().toISOString(),
    organizations: [{ id: 'novatech', name: 'Novatech' }],
    records: [
      {
        recordId: 'rec_01',
        organizationId: 'novatech',
        displayedId: 'EMP-1001',
        fullName: 'Test User',
      },
    ],
    photos: [
      {
        photoKey: 'novatech::rec_01',
        organizationId: 'novatech',
        recordId: 'rec_01',
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
      },
    ],
    templateSettings: { selectedTemplateId: 'corporate-blue' },
  }
  const checksum = computeBackupChecksum(baseData)
  const validPayload = { ...baseData, integrity: { checksum } }

  const result = validateBackupStructure(validPayload)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.counts.records, 1)
  assert.strictEqual(result.counts.organizations, 1)
  assert.strictEqual(result.counts.photos, 1)
})

test('Rejects malformed JSON and non-object inputs', () => {
  assert.strictEqual(validateBackupStructure('{ not valid json ').isValid, false)
  assert.strictEqual(validateBackupStructure(null).isValid, false)
  assert.strictEqual(validateBackupStructure(12345).isValid, false)
})

test('Rejects unsupported schema versions safely', () => {
  const unsupported = {
    schemaVersion: '99.0.0',
    records: [{ recordId: 'rec_01', fullName: 'Future Record' }],
  }
  const result = validateBackupStructure(unsupported)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /Unsupported backup schema version "99\.0\.0"/)
})

test('Rejects malicious / code injection payloads in photo base64 strings', () => {
  const malicious = {
    schemaVersion: '2.1.0',
    records: [{ recordId: 'rec_01', fullName: 'Injected Record' }],
    photos: [
      {
        photoKey: 'org::rec_01',
        base64: 'data:image/svg+xml;utf8,<script>alert("XSS")</script>',
      },
    ],
  }
  const result = validateBackupStructure(malicious)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /Security violation/)
})

test('Large backup safe failure: rejects archives exceeding safe memory threshold (100 MB)', () => {
  // Simulate an oversized raw string of >100MB without allocating 100MB real memory
  const oversizedFakeString = {
    length: 105 * 1024 * 1024,
    slice: () => '',
  }
  // Passing string-like object with length > MAX_BACKUP_SIZE_BYTES
  const result = validateBackupStructure(oversizedFakeString)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /safe local browser memory limit/)
})

// ---------------------------------------------------------------------------
// SECTION 2: CHECKSUM SENSITIVITY VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 2: Checksum Sensitivity Across All Data Types ---')

test('Changing organization details (name, branding, logo) changes checksum', () => {
  const baseline = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1', name: 'Original Name', logoUrl: 'data:image/png;base64,aaa' }],
    records: [{ recordId: 'r1', fullName: 'User 1' }],
    photos: [],
    templateSettings: { selectedTemplateId: 'corporate-blue' },
  }
  const baseChecksum = computeBackupChecksum(baseline)

  // Mutate Org Name
  const modifiedName = JSON.parse(JSON.stringify(baseline))
  modifiedName.organizations[0].name = 'Tampered Name'
  assert.notStrictEqual(computeBackupChecksum(modifiedName), baseChecksum)

  // Mutate Logo
  const modifiedLogo = JSON.parse(JSON.stringify(baseline))
  modifiedLogo.organizations[0].logoUrl = 'data:image/png;base64,tamperedLogoData'
  assert.notStrictEqual(computeBackupChecksum(modifiedLogo), baseChecksum)
})

test('Changing record attributes or custom fields changes checksum', () => {
  const baseline = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1', name: 'Org 1' }],
    records: [
      {
        recordId: 'r1',
        fullName: 'Original User',
        customFields: { clearanceLevel: 'Secret' },
      },
    ],
    photos: [],
  }
  const baseChecksum = computeBackupChecksum(baseline)

  // Mutate Full Name
  const modifiedUser = JSON.parse(JSON.stringify(baseline))
  modifiedUser.records[0].fullName = 'Tampered User'
  assert.notStrictEqual(computeBackupChecksum(modifiedUser), baseChecksum)

  // Mutate Custom Field
  const modifiedCustom = JSON.parse(JSON.stringify(baseline))
  modifiedCustom.records[0].customFields.clearanceLevel = 'Top Secret'
  assert.notStrictEqual(computeBackupChecksum(modifiedCustom), baseChecksum)
})

test('Changing photo content or template settings changes checksum', () => {
  const baseline = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1' }],
    records: [{ recordId: 'r1' }],
    photos: [{ photoKey: 'org1::r1', base64: 'data:image/jpeg;base64,original123' }],
    templateSettings: { selectedTemplateId: 'corporate-blue', showBarcode: true },
  }
  const baseChecksum = computeBackupChecksum(baseline)

  // Mutate Photo Base64 Content
  const modifiedPhoto = JSON.parse(JSON.stringify(baseline))
  modifiedPhoto.photos[0].base64 = 'data:image/jpeg;base64,tampered999'
  assert.notStrictEqual(computeBackupChecksum(modifiedPhoto), baseChecksum)

  // Mutate Template Settings
  const modifiedTemplate = JSON.parse(JSON.stringify(baseline))
  modifiedTemplate.templateSettings.selectedTemplateId = 'modern-tech'
  assert.notStrictEqual(computeBackupChecksum(modifiedTemplate), baseChecksum)
})

test('Tampered checksum causes validateBackupStructure to reject archive', () => {
  const payload = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1', name: 'Authentic Org' }],
    records: [{ recordId: 'r1', fullName: 'Authentic User' }],
    integrity: {
      checksum: 'CHK-WRONG-CHECKSUM-VALUE',
    },
  }
  const result = validateBackupStructure(payload)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /Integrity verification failed/)
})

// ---------------------------------------------------------------------------
// SECTION 3: COMPLETE PLATFORM EXPORT
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 3: Complete Platform Export ---')

await testAsync('Exports all active, archived, and unassigned organizations and records', async () => {
  memoryStorage.clear()

  const orgs = [
    { id: 'active-org', name: 'Active Org', isArchived: false },
    { id: 'archived-org', name: 'Archived Org', isArchived: true, archivedAt: '2026-10-01' },
    { id: 'sidwal-railway', name: 'SIDWAL Railway', isImmutableBranding: true },
  ]
  saveStoredOrganizations(orgs)

  const records = [
    {
      recordId: 'rec_act_01',
      organizationId: 'active-org',
      displayedId: 'ACT-01',
      fullName: 'Active Worker',
      customFields: { securityClearance: 'Top Secret' },
    },
    {
      recordId: 'rec_arc_01',
      organizationId: 'archived-org',
      displayedId: 'ARC-01',
      fullName: 'Archived Worker',
    },
    {
      recordId: 'rec_leg_01',
      organizationId: 'unassigned-legacy',
      displayedId: 'LEG-01',
      fullName: 'Unassigned Legacy Worker',
    },
  ]
  saveStoredEmployees(records)

  const backup = await createPlatformBackup()

  assert.strictEqual(backup.schemaVersion, '2.1.0')
  assert.strictEqual(backup.records.length, 3, 'Exports all 3 records across all cohorts')
  assert.ok(backup.organizations.length >= 3, 'Exports all organizations including archived')
  assert.ok(backup.counts.activeOrgs >= 2)
  assert.strictEqual(backup.counts.archivedOrgs, 1)
  assert.strictEqual(backup.counts.unassignedRecords, 1)
  assert.strictEqual(backup.records[0].customFields.securityClearance, 'Top Secret', 'Preserves custom fields')
  assert.ok(backup.integrity.checksum, 'Contains integrity checksum')
})

// ---------------------------------------------------------------------------
// SECTION 4: MERGE IDENTITY RULES & OPTIONAL/MISSING DISPLAYED IDS
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 4: Merge Identity & Collision Rules ---')

test('Analyzes merge plan accurately: separates new records, matching records, and conflicts', () => {
  const currentRecords = [
    { recordId: 'rec_01', organizationId: 'novatech', fullName: 'Alice Local', role: 'Staff Eng' },
    { recordId: 'rec_02', organizationId: 'novatech', fullName: 'Bob Local', role: 'QA Lead' },
  ]
  const currentOrgs = [{ id: 'novatech', name: 'Novatech Solutions' }]

  const incomingBackup = {
    records: [
      { recordId: 'rec_01', organizationId: 'novatech', fullName: 'Alice Local', role: 'Principal Eng' },
      { recordId: 'rec_03', organizationId: 'novatech', fullName: 'Charlie Incoming', role: 'Designer' },
    ],
    organizations: [
      { id: 'novatech', name: 'Novatech Solutions' },
      { id: 'new-org', name: 'Brand New Org' },
    ],
  }

  const plan = analyzeRestorePlan({
    incomingData: incomingBackup,
    currentRecords,
    currentOrganizations: currentOrgs,
    mode: 'merge',
  })

  assert.strictEqual(plan.newRecordsCount, 1)
  assert.strictEqual(plan.matchingRecordsCount, 1)
  assert.strictEqual(plan.conflictsCount, 1)
  assert.strictEqual(plan.newOrgsCount, 1)
  assert.strictEqual(plan.unaffectedRecordsCount, 1)
})

await testAsync('Composite tenant keying prevents collision when displayedId is identical across orgs', async () => {
  memoryStorage.clear()

  const initialRecords = [
    {
      recordId: 'rec_orgA_01',
      organizationId: 'org-A',
      displayedId: 'ID-100',
      fullName: 'Alice in Org A',
    },
    {
      recordId: 'rec_orgB_01',
      organizationId: 'org-B',
      displayedId: 'ID-100',
      fullName: 'Bob in Org B',
    },
  ]
  saveStoredEmployees(initialRecords)

  const incomingBackup = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org-A' }, { id: 'org-B' }, { id: 'org-C' }],
    records: [
      {
        recordId: 'rec_orgA_01',
        organizationId: 'org-A',
        displayedId: 'ID-100',
        fullName: 'Alice Updated',
      },
      {
        recordId: 'rec_orgC_01',
        organizationId: 'org-C',
        displayedId: 'ID-100',
        fullName: 'Charlie in Org C',
      },
    ],
  }
  incomingBackup.integrity = { checksum: computeBackupChecksum(incomingBackup) }

  const result = await executeStagedRestore({
    backupData: incomingBackup,
    mode: 'merge',
    conflictResolution: 'incoming',
  })

  assert.strictEqual(result.success, true)
  const stored = getStoredEmployees()
  assert.strictEqual(stored.length, 3)

  const alice = stored.find((r) => r.recordId === 'rec_orgA_01')
  assert.strictEqual(alice.fullName, 'Alice Updated')

  const bob = stored.find((r) => r.recordId === 'rec_orgB_01')
  assert.strictEqual(bob.fullName, 'Bob in Org B')

  const charlie = stored.find((r) => r.recordId === 'rec_orgC_01')
  assert.strictEqual(charlie.fullName, 'Charlie in Org C')
})

await testAsync('Handles records with missing optional displayed IDs without collision or failure', async () => {
  memoryStorage.clear()

  const initial = [
    {
      recordId: 'rec_no_disp_01',
      organizationId: 'novatech',
      displayedId: '', // Empty displayedId
      fullName: 'No Display ID Local',
    },
  ]
  saveStoredEmployees(initial)

  const incoming = {
    schemaVersion: '2.1.0',
    records: [
      {
        recordId: 'rec_no_disp_01',
        organizationId: 'novatech',
        displayedId: '',
        fullName: 'No Display ID Updated',
      },
      {
        recordId: 'rec_no_disp_02',
        organizationId: 'novatech',
        // displayedId undefined
        fullName: 'Another Record Without Displayed ID',
      },
    ],
  }
  incoming.integrity = { checksum: computeBackupChecksum(incoming) }

  const result = await executeStagedRestore({
    backupData: incoming,
    mode: 'merge',
    conflictResolution: 'incoming',
  })

  assert.strictEqual(result.success, true)
  const stored = getStoredEmployees()
  assert.strictEqual(stored.length, 2)
  assert.strictEqual(stored.find((r) => r.recordId === 'rec_no_disp_01').fullName, 'No Display ID Updated')
  assert.strictEqual(stored.find((r) => r.recordId === 'rec_no_disp_02').fullName, 'Another Record Without Displayed ID')
})

// ---------------------------------------------------------------------------
// SECTION 5: REPLACE ALL & MULTI-STAGE RESTORE FAILURE ROLLBACK
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 5: Multi-Stage Failure Simulation & Recovery ---')

await testAsync('Executes Replace All and creates an automatic pre-restore recovery snapshot', async () => {
  memoryStorage.clear()

  const liveInitialRecords = [
    { recordId: 'live_rec_01', organizationId: 'novatech', fullName: 'Live Record Before Replace' },
  ]
  saveStoredEmployees(liveInitialRecords)

  const incomingBackup = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'replacement-org', name: 'Replacement Org' }],
    records: [
      { recordId: 'rep_rec_01', organizationId: 'replacement-org', fullName: 'Replaced Record One' },
      { recordId: 'rep_rec_02', organizationId: 'replacement-org', fullName: 'Replaced Record Two' },
    ],
  }
  incomingBackup.integrity = { checksum: computeBackupChecksum(incomingBackup) }

  const result = await executeStagedRestore({
    backupData: incomingBackup,
    mode: 'replace',
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(getStoredEmployees().length, 2)
  assert.strictEqual(getStoredEmployees()[0].fullName, 'Replaced Record One')

  const snapshotRaw = memoryStorage.get(RECOVERY_SNAPSHOT_KEY)
  assert.ok(snapshotRaw, 'Pre-restore recovery snapshot was saved')
  const snapshot = JSON.parse(snapshotRaw)
  assert.strictEqual(snapshot.records.length, 1)
  assert.strictEqual(snapshot.records[0].fullName, 'Live Record Before Replace')
})

await testAsync('Simulates mid-flight failure and verifies rollback restores original live records', async () => {
  memoryStorage.clear()
  const initialRecords = [{ recordId: 'safe_rec_01', fullName: 'Safe User Before Failure' }]
  saveStoredEmployees(initialRecords)

  // Backup with 0 records triggers verification error during staged restore
  const corruptIncoming = {
    schemaVersion: '2.1.0',
    records: [],
  }

  let errorThrown = false
  try {
    await executeStagedRestore({
      backupData: corruptIncoming,
      mode: 'replace',
    })
  } catch (err) {
    errorThrown = true
    assert.match(err.message, /Restoration failed and changes were safely rolled back/)
  }

  assert.strictEqual(errorThrown, true)
  const liveAfterFailure = getStoredEmployees()
  assert.strictEqual(liveAfterFailure.length, 1)
  assert.strictEqual(liveAfterFailure[0].fullName, 'Safe User Before Failure')
})

await testAsync('In-memory photo snapshot and rollback functions work reliably', async () => {
  // Test photo snapshot and rollback APIs
  const snap = await snapshotPhotosInMemory()
  assert.ok(Array.isArray(snap))
  const restoredCount = await restorePhotosFromSnapshot()
  assert.strictEqual(typeof restoredCount, 'number')
})

// ---------------------------------------------------------------------------
// SECTION 6: SIDWAL TEMPLATE INTEGRITY INVARIANT CHECK
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 6: SIDWAL Mechanical Workshop Invariant Check ---')

test('SIDWAL dimensions, headings, and branding remain strictly immutable', () => {
  const sidwalTmpl = CARD_TEMPLATES.find((t) => t.id === 'sidwal-workshop')
  assert.ok(sidwalTmpl, 'SIDWAL template found in CARD_TEMPLATES')
  assert.strictEqual(sidwalTmpl.accentColor, '#e30613')
  assert.strictEqual(sidwalTmpl.primaryColor, '#0d2b59')
  assert.ok(Math.abs(sidwalTmpl.aspectRatio - (244.4 / 355.6)) < 0.001)

  const sidwalOrg = getStoredOrganizations().find((o) => o.id === 'sidwal-railway')
  assert.ok(sidwalOrg, 'SIDWAL organization profile found')
  assert.strictEqual(sidwalOrg.workshopHeading, 'MECHANICAL WORKSHOP GORAKHPUR')
  assert.strictEqual(sidwalOrg.railwayHeading, 'NORTH EASTERN RAILWAY')
  assert.strictEqual(sidwalOrg.companyName, 'SIDWAL REFRIGERATION INDUSTRIES (P) LTD')
  assert.strictEqual(sidwalOrg.isImmutableBranding, true)
})

console.log('\n====================================================')
console.log(`📊 Phase 5A Audit Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}
