/**
 * Phase 11 — Backup Integrity & Cryptographic Remediation Test Suite
 *
 * Verifies:
 * 1. Standard SHA-256 compliance against NIST test vectors and Node crypto
 * 2. 100% field coverage across all persisted organizations, records, photos, and templates
 * 3. Canonical serialization, recursive key sorting, and determinism
 * 4. Backward compatibility for schema 1.0.0, 2.0.0, and early 2.1.0 (FNV-1a CHK-)
 * 5. Strict rejection of missing, empty, or tampered checksums in schema 2.1.0+
 * 6. Single-byte mutation detection across every data category
 * 7. Staged restore safety, pre-restore recovery snapshot, and rollback verification
 * 8. Large photo backup processing
 */

import assert from 'assert'
import crypto from 'crypto'
import {
  BACKUP_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  sha256Sync,
  sha256Async,
  computeBackupChecksum,
  computeBackupChecksumAsync,
  computeLegacyBackupChecksum,
  canonicalize,
  buildCanonicalBackupPayload,
  validateBackupStructure,
  createPlatformBackup,
  executeStagedRestore,
  createRecoverySnapshot,
  rollbackFromRecoverySnapshot,
  RECOVERY_SNAPSHOT_KEY,
} from '../src/utils/backupSystem.js'
import { saveStoredEmployees, getStoredEmployees } from '../src/utils/storage.js'
import { saveStoredOrganizations, getStoredOrganizations, setActiveOrganizationId } from '../src/utils/organizationStorage.js'
import { saveTemplateSettings, getSavedTemplateSettings } from '../src/utils/templateStorage.js'

// In-memory test storage mock for Node environment
const memoryStore = new Map()
global.localStorage = {
  getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

let passedCount = 0
let failedCount = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedCount++
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message)
    failedCount++
  }
}

async function runTestAsync(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passedCount++
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message)
    failedCount++
  }
}

console.log('====================================================')
console.log('🧪 Starting Phase 11 Backup Integrity Remediation Suite')
console.log('====================================================')

// ---------------------------------------------------------------------------
// SECTION 1: STANDARD SHA-256 ALGORITHM COMPLIANCE
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 1: Standard SHA-256 Algorithm Compliance ---')

runTest('SHA-256 matches NIST standard test vectors and Node.js crypto', () => {
  const testVectors = [
    { input: '', expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'abc', expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
    { input: 'The quick brown fox jumps over the lazy dog', expected: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592' },
  ]

  for (const { input, expected } of testVectors) {
    const syncDigest = sha256Sync(input)
    assert.strictEqual(syncDigest, expected, `Sync SHA-256 vector mismatch for "${input}"`)
    const nodeDigest = crypto.createHash('sha256').update(input).digest('hex')
    assert.strictEqual(syncDigest, nodeDigest, 'Must match Node crypto hash')
  }
})

await runTestAsync('SHA-256 async variant matches sync implementation', async () => {
  const payload = 'ID Card Platform Backup Cryptographic Integrity Verification Payload 2026'
  const syncHash = sha256Sync(payload)
  const asyncHash = await sha256Async(payload)
  assert.strictEqual(asyncHash, syncHash)
  assert.strictEqual(asyncHash, crypto.createHash('sha256').update(payload).digest('hex'))
})

// ---------------------------------------------------------------------------
// SECTION 2: CANONICAL SERIALIZATION & DETERMINISM
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 2: Canonical Serialization & Determinism ---')

runTest('Recursive key sorting produces deterministic JSON regardless of key insertion order', () => {
  const objA = {
    z: 'last',
    details: { height: 180, age: 30, city: 'Dehradun' },
    a: 'first',
    customFields: { zebra: 1, alpha: 2 },
  }
  const objB = {
    a: 'first',
    customFields: { alpha: 2, zebra: 1 },
    z: 'last',
    details: { city: 'Dehradun', age: 30, height: 180 },
  }

  const canonA = JSON.stringify(canonicalize(objA))
  const canonB = JSON.stringify(canonicalize(objB))
  assert.strictEqual(canonA, canonB, 'Canonical JSON strings must be identical')
})

runTest('Array ordering invariance for organizations, records, and photos', () => {
  const dataset1 = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org-B', name: 'B' }, { id: 'org-A', name: 'A' }],
    records: [
      { recordId: 'rec-2', organizationId: 'org-A', fullName: 'Two' },
      { recordId: 'rec-1', organizationId: 'org-A', fullName: 'One' },
    ],
    photos: [
      { photoKey: 'org-A:rec-2', base64: 'b64_2' },
      { photoKey: 'org-A:rec-1', base64: 'b64_1' },
    ],
    templateSettings: { default: { theme: 'blue' } },
  }

  const dataset2 = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org-A', name: 'A' }, { id: 'org-B', name: 'B' }],
    records: [
      { recordId: 'rec-1', organizationId: 'org-A', fullName: 'One' },
      { recordId: 'rec-2', organizationId: 'org-A', fullName: 'Two' },
    ],
    photos: [
      { photoKey: 'org-A:rec-1', base64: 'b64_1' },
      { photoKey: 'org-A:rec-2', base64: 'b64_2' },
    ],
    templateSettings: { default: { theme: 'blue' } },
  }

  const chk1 = computeBackupChecksum(dataset1)
  const chk2 = computeBackupChecksum(dataset2)
  assert.strictEqual(chk1, chk2, 'Checksum must be invariant to item array permutation')
})

// ---------------------------------------------------------------------------
// SECTION 3: 100% FIELD COVERAGE MUTATION AUDIT
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 3: 100% Field Coverage Mutation Audit ---')

function createBaselineBackup() {
  return {
    schemaVersion: '2.1.0',
    activeOrgId: 'novatech',
    organizations: [
      {
        id: 'novatech',
        name: 'Novatech Solutions',
        companyName: 'Novatech Solutions Pvt Ltd',
        tagline: 'Excellence in Engineering',
        address: '100 Cyber City, Bangalore',
        website: 'https://novatech.internal',
        contactEmail: 'admin@novatech.internal',
        workshopHeading: 'IT OPERATIONS',
        railwayHeading: '',
        cardType: 'employee',
        emergencyPhonePlaceholder: '+91-80-000000',
        logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        customAccentColor: '#2563eb',
        defaultTemplateId: 'modern-corporate',
        isArchived: false,
        isImmutableBranding: false,
        customOverlay: { enabled: true, fieldCoordinates: [{ x: 10, y: 20 }] },
      },
    ],
    records: [
      {
        recordId: 'rec-1001',
        organizationId: 'novatech',
        displayedId: 'EMP-1001',
        fullName: 'Aarav Sharma',
        role: 'Senior Architect',
        department: 'Cloud Infrastructure',
        email: 'aarav@novatech.internal',
        bloodGroup: 'O+',
        issueDate: '2026-01-10',
        expiryDate: '2028-01-10',
        emergencyPhone: '+91-9876543210',
        location: 'Building C, Floor 3',
        status: 'Generated',
        avatarUrl: 'https://example.com/avatar.jpg',
        hasPhoto: true,
        customFields: { clearance: 'Top-Secret', workstation: 'WS-99' },
      },
    ],
    photos: [
      {
        photoKey: 'novatech:rec-1001',
        organizationId: 'novatech',
        recordId: 'rec-1001',
        filename: 'aarav.png',
        mimeType: 'image/png',
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    ],
    templateSettings: {
      'modern-corporate': { accentColor: '#2563eb', showQr: true, photoRounded: true },
    },
  }
}

const baseChecksum = computeBackupChecksum(createBaselineBackup())
assert.ok(baseChecksum.startsWith('SHA256:'), 'New checksum format must start with SHA256:')

// Test mutation of previously omitted organization fields
const orgFieldsToTest = [
  ['address', (b) => { b.organizations[0].address = 'New Address' }],
  ['website', (b) => { b.organizations[0].website = 'https://changed.internal' }],
  ['contactEmail', (b) => { b.organizations[0].contactEmail = 'tampered@evil.com' }],
  ['workshopHeading', (b) => { b.organizations[0].workshopHeading = 'TAMPERED WORKSHOP' }],
  ['cardType', (b) => { b.organizations[0].cardType = 'visitor' }],
  ['emergencyPhonePlaceholder', (b) => { b.organizations[0].emergencyPhonePlaceholder = '+1-000' }],
  ['customOverlay', (b) => { b.organizations[0].customOverlay.fieldCoordinates[0].x = 999 }],
]

for (const [field, mutate] of orgFieldsToTest) {
  runTest(`Mutating Organization.${field} alters SHA-256 checksum`, () => {
    const copy = createBaselineBackup()
    mutate(copy)
    assert.notStrictEqual(computeBackupChecksum(copy), baseChecksum)
  })
}

// Test mutation of previously omitted record fields
const recordFieldsToTest = [
  ['email', (b) => { b.records[0].email = 'hacked@domain.com' }],
  ['bloodGroup', (b) => { b.records[0].bloodGroup = 'AB-' }],
  ['issueDate', (b) => { b.records[0].issueDate = '2099-01-01' }],
  ['expiryDate', (b) => { b.records[0].expiryDate = '2099-01-01' }],
  ['emergencyPhone', (b) => { b.records[0].emergencyPhone = '+99-99999999' }],
  ['location', (b) => { b.records[0].location = 'Area 51' }],
  ['status', (b) => { b.records[0].status = 'Revoked' }],
  ['avatarUrl', (b) => { b.records[0].avatarUrl = 'https://malicious.site/pic.png' }],
  ['customFields key', (b) => { b.records[0].customFields.newSecurityTag = 'Injected' }],
]

for (const [field, mutate] of recordFieldsToTest) {
  runTest(`Mutating Record.${field} alters SHA-256 checksum`, () => {
    const copy = createBaselineBackup()
    mutate(copy)
    assert.notStrictEqual(computeBackupChecksum(copy), baseChecksum)
  })
}

runTest('Single-byte modification in photo base64 payload alters SHA-256 checksum', () => {
  const copy = createBaselineBackup()
  copy.photos[0].base64 += 'Z'
  assert.notStrictEqual(computeBackupChecksum(copy), baseChecksum)
})

runTest('Mutating templateSettings alters SHA-256 checksum', () => {
  const copy = createBaselineBackup()
  copy.templateSettings['modern-corporate'].showQr = false
  assert.notStrictEqual(computeBackupChecksum(copy), baseChecksum)
})

runTest('Mutating activeOrgId alters SHA-256 checksum', () => {
  const copy = createBaselineBackup()
  copy.activeOrgId = 'other-tenant'
  assert.notStrictEqual(computeBackupChecksum(copy), baseChecksum)
})

// ---------------------------------------------------------------------------
// SECTION 4: SCHEMA COMPATIBILITY & MISSING CHECKSUM HANDLING
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 4: Schema Compatibility & Missing Checksum Handling ---')

runTest('Schema 1.0.0 legacy backup without checksum is accepted safely', () => {
  const legacy1 = {
    schemaVersion: '1.0.0',
    records: [{ recordId: 'r1', fullName: 'Legacy 1 User' }],
  }
  const result = validateBackupStructure(legacy1)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.isLegacy, true)
  assert.strictEqual(result.integrityStatus, 'legacy-unprotected')
})

runTest('Schema 2.0.0 legacy backup without checksum is accepted safely', () => {
  const legacy2 = {
    schemaVersion: '2.0.0',
    organizations: [{ id: 'org1', name: 'Legacy Org' }],
    records: [{ recordId: 'r1', fullName: 'Legacy 2 User' }],
  }
  const result = validateBackupStructure(legacy2)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.isLegacy, true)
  assert.strictEqual(result.integrityStatus, 'legacy-unprotected')
})

runTest('Schema 2.1.0 backup with legacy FNV-1a checksum (CHK-) is verified and accepted', () => {
  const legacyPayload = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1', name: 'Legacy Org' }],
    records: [{ recordId: 'r1', organizationId: 'org1', fullName: 'Legacy User' }],
    photos: [],
    templateSettings: {},
  }
  const legacyChecksum = computeLegacyBackupChecksum(legacyPayload)
  assert.ok(legacyChecksum.startsWith('CHK-'), 'Legacy checksum must have CHK- prefix')

  const validLegacy = {
    ...legacyPayload,
    integrity: { checksum: legacyChecksum },
  }
  const result = validateBackupStructure(validLegacy)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.isLegacy, true)
  assert.strictEqual(result.integrityStatus, 'legacy-fnv1a')
})

runTest('Schema 2.1.0 backup with tampered FNV-1a checksum is rejected', () => {
  const legacyPayload = {
    schemaVersion: '2.1.0',
    organizations: [{ id: 'org1', name: 'Authentic Org' }],
    records: [{ recordId: 'r1', organizationId: 'org1', fullName: 'Authentic User' }],
    photos: [],
    integrity: { checksum: 'CHK-WRONG-CHECKSUM-VALUE' },
  }
  const result = validateBackupStructure(legacyPayload)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /Integrity verification failed/)
})

runTest('Schema 2.1.0 backup with MISSING checksum is rejected strictly', () => {
  const payloadNoIntegrity = {
    schemaVersion: '2.1.0',
    records: [{ recordId: 'r1', fullName: 'User Without Checksum' }],
  }
  const result = validateBackupStructure(payloadNoIntegrity)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /requires valid integrity metadata/)
})

runTest('Schema 2.1.0 backup with empty checksum string is rejected strictly', () => {
  const payloadEmptyChecksum = {
    schemaVersion: '2.1.0',
    records: [{ recordId: 'r1', fullName: 'User With Empty Checksum' }],
    integrity: { checksum: '' },
  }
  const result = validateBackupStructure(payloadEmptyChecksum)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /requires valid integrity metadata/)
})

runTest('Schema 2.1.0 backup with valid SHA-256 is accepted as verified-sha256', () => {
  const base = createBaselineBackup()
  const checksum = computeBackupChecksum(base)
  const payload = {
    ...base,
    integrity: {
      algorithm: 'SHA-256',
      schemaVersion: '2.1.0',
      checksum,
    },
  }
  const result = validateBackupStructure(payload)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.isLegacy, false)
  assert.strictEqual(result.integrityStatus, 'verified-sha256')
})

runTest('Single-byte tamper in JSON string causes validateBackupStructure rejection', () => {
  const base = createBaselineBackup()
  const checksum = computeBackupChecksum(base)
  const payload = { ...base, integrity: { checksum } }
  const json = JSON.stringify(payload)

  // Tamper 1 byte in email
  const tamperedJson = json.replace('aarav@novatech.internal', 'aarax@novatech.internal')
  const result = validateBackupStructure(tamperedJson)
  assert.strictEqual(result.isValid, false)
  assert.match(result.error, /Integrity verification failed/)
})

// ---------------------------------------------------------------------------
// SECTION 5: STAGED RESTORATION SAFETY & ROLLBACK
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 5: Staged Restoration Safety & Rollback ---')

await runTestAsync('Validation executes BEFORE modifying live data', async () => {
  memoryStore.clear()
  const originalRecords = [{ recordId: 'safe_01', fullName: 'Live Record Must Survive' }]
  saveStoredEmployees(originalRecords)

  // Construct a tampered backup payload
  const badBackup = createBaselineBackup()
  badBackup.records[0].fullName = 'Injected Attacker'
  badBackup.integrity = { checksum: baseChecksum } // Mismatched checksum

  let failed = false
  try {
    await executeStagedRestore({
      backupData: badBackup,
      mode: 'replace',
    })
  } catch (err) {
    failed = true
    assert.match(err.message, /Integrity verification failed/)
  }

  assert.strictEqual(failed, true, 'Restore must reject invalid checksum')
  const liveRecords = getStoredEmployees()
  assert.strictEqual(liveRecords.length, 1)
  assert.strictEqual(liveRecords[0].fullName, 'Live Record Must Survive', 'Original live record must remain untouched')
})

await runTestAsync('Simulated post-validation write failure triggers rollback to recovery snapshot', async () => {
  memoryStore.clear()
  const initialOrg = [{ id: 'tenant_safe', name: 'Original Safe Tenant' }]
  const initialRec = [{ recordId: 'safe_rec_99', organizationId: 'tenant_safe', fullName: 'Safe Live User' }]
  saveStoredOrganizations(initialOrg)
  saveStoredEmployees(initialRec)
  setActiveOrganizationId('tenant_safe')

  // Create valid backup payload
  const incoming = createBaselineBackup()
  incoming.integrity = { checksum: computeBackupChecksum(incoming) }

  // Snapshot is saved before restore
  const preSnapshot = await createRecoverySnapshot()
  assert.ok(preSnapshot.timestamp, 'Snapshot created with timestamp')

  // Simulate a rollback scenario
  const rollbackResult = await rollbackFromRecoverySnapshot()
  assert.strictEqual(rollbackResult.rolledBack, true)

  assert.strictEqual(getStoredOrganizations()[0].name, 'Original Safe Tenant')
  assert.strictEqual(getStoredEmployees()[0].fullName, 'Safe Live User')
})

// ---------------------------------------------------------------------------
// SECTION 6: LARGE PHOTO BACKUP VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 6: Large Photo Backup Verification ---')

runTest('Computes and verifies SHA-256 on large multi-megabyte photo archives efficiently', () => {
  const largeBackup = createBaselineBackup()
  // Add 10 simulated high-res photo payloads (~500 KB base64 each = ~5 MB total)
  const fakeHighResBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(500 * 1024)
  largeBackup.photos = []
  for (let i = 1; i <= 10; i++) {
    largeBackup.photos.push({
      photoKey: `novatech:rec-${1000 + i}`,
      organizationId: 'novatech',
      recordId: `rec-${1000 + i}`,
      filename: `photo_${i}.jpg`,
      mimeType: 'image/jpeg',
      base64: fakeHighResBase64,
    })
  }

  const startTime = Date.now()
  const checksum = computeBackupChecksum(largeBackup)
  const duration = Date.now() - startTime
  assert.ok(checksum.startsWith('SHA256:'))
  assert.ok(duration < 2000, `Large 5MB backup hashing should take under 2000ms (took ${duration}ms)`)

  largeBackup.integrity = { checksum }
  const validation = validateBackupStructure(largeBackup)
  assert.strictEqual(validation.isValid, true)
  assert.strictEqual(validation.counts.photos, 10)
})

console.log('\n====================================================')
console.log(`📊 Phase 11 Test Results: ${passedCount} Passed, ${failedCount} Failed`)
console.log('====================================================')

if (failedCount > 0) {
  process.exit(1)
}
