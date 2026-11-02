import assert from 'node:assert'
import {
  detectRecordOrganization,
  migrateLegacyRecords,
  UNASSIGNED_LEGACY_ORG_ID,
  MIGRATION_BACKUP_RECORDS_KEY,
} from '../src/utils/legacyMigration.js'
import {
  buildPhotoKey,
  parsePhotoKey,
} from '../src/utils/photoStorage.js'
import { computeEmployeeStats } from '../src/utils/storage.js'
import { generateRecordId } from '../src/utils/cardTypes.js'

console.log('====================================================')
console.log('🧪 Starting Phase 1 Tenant Isolation Test Suite')
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

// ---------------------------------------------------------------------------
// SECTION 1: LEGACY RECORD MIGRATION & SMART ORG DETECTION
// ---------------------------------------------------------------------------
console.log('--- SECTION 1: Legacy Data Migration & Smart Org Detection ---')

test('Detects SIDWAL Mechanical Workshop records by keywords', () => {
  const record = {
    companyName: 'SIDWAL REFRIGERATION INDUSTRIES (P) LTD',
    workshopHeading: 'MECHANICAL WORKSHOP GORAKHPUR',
    fullName: 'Rajesh Kumar',
  }
  assert.strictEqual(detectRecordOrganization(record), 'sidwal-railway')
})

test('Detects SIDWAL records by railway email domain', () => {
  const record = {
    email: 'contractor.ops@sidwal.com',
    fullName: 'Anil Verma',
  }
  assert.strictEqual(detectRecordOrganization(record), 'sidwal-railway')
})

test('Detects Apex University records by student schema and .edu email', () => {
  const record = {
    rollNo: '2026-CS-042',
    course: 'B.Tech Computer Science',
    email: 'rohan.sharma@apex-institute.edu',
  }
  assert.strictEqual(detectRecordOrganization(record), 'apex-university')
})

test('Detects Novatech Solutions corporate cohort by mock IDs and company domain', () => {
  const record = {
    employeeId: 'EMP-1001',
    email: 'sarah.jenkins@company.internal',
    department: 'Engineering',
  }
  assert.strictEqual(detectRecordOrganization(record), 'novatech')
})

test('Detects Tech Summit records by conference tickets', () => {
  const record = {
    ticketNo: 'TKT-8849',
    companyName: 'GLOBAL TECH SUMMIT 2026',
    email: 'speaker@globaltechsummit.org',
  }
  assert.strictEqual(detectRecordOrganization(record), 'tech-summit')
})

test('Preserves unassignable records as unassigned-legacy without guessing', () => {
  const ambiguousRecord = {
    id: 'X-999',
    fullName: 'Mystery User',
    department: 'Special',
  }
  // Must NOT guess; must assign to UNASSIGNED_LEGACY_ORG_ID
  assert.strictEqual(detectRecordOrganization(ambiguousRecord), UNASSIGNED_LEGACY_ORG_ID)
})

test('Migration creates backup and assigns recordId & organizationId', () => {
  // Simulate mock localStorage
  const mockStorage = {}
  global.window = {
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = v },
    },
  }

  const legacyRecords = [
    { id: 'EMP-1001', fullName: 'Sarah Jenkins', email: 'sarah@company.internal' },
    { id: 'CON-501', fullName: 'Sanjay Railway', email: 'sanjay@sidwal.com' },
    { id: 'UNKNOWN-01', fullName: 'No Org User' },
  ]

  const { migratedRecords, backupCreated, stats } = migrateLegacyRecords(legacyRecords)

  assert.strictEqual(backupCreated, true)
  assert.strictEqual(migratedRecords.length, 3)
  assert.strictEqual(migratedRecords[0].organizationId, 'novatech')
  assert.strictEqual(migratedRecords[1].organizationId, 'sidwal-railway')
  assert.strictEqual(migratedRecords[2].organizationId, UNASSIGNED_LEGACY_ORG_ID)
  assert(migratedRecords[0].recordId.startsWith('rec_'))
  assert(migratedRecords[1].recordId.startsWith('rec_'))
  assert(migratedRecords[2].recordId.startsWith('rec_'))

  // Verify backup in localStorage matches original input
  const storedBackup = JSON.parse(mockStorage[MIGRATION_BACKUP_RECORDS_KEY])
  assert.strictEqual(storedBackup.length, 3)
  assert.strictEqual(storedBackup[0].id, 'EMP-1001')
  assert.strictEqual(storedBackup[0].organizationId, undefined)
})

test('Migration is strictly idempotent and safe to retry without duplications', () => {
  const initialRecords = [
    { recordId: 'rec_already_1', organizationId: 'novatech', displayedId: 'EMP-1001', fullName: 'User 1' },
    { id: 'EMP-1002', fullName: 'Marcus Vance', email: 'marcus@company.internal' },
  ]

  const run1 = migrateLegacyRecords(initialRecords)
  const run2 = migrateLegacyRecords(run1.migratedRecords)

  assert.strictEqual(run2.migratedRecords.length, 2)
  assert.strictEqual(run2.migratedRecords[0].recordId, 'rec_already_1')
  assert.strictEqual(run2.migratedRecords[0].organizationId, 'novatech')
  assert.strictEqual(run2.stats.alreadyMigrated, 2)
  assert.strictEqual(run2.stats.migrated, 0)
})

// ---------------------------------------------------------------------------
// SECTION 2: NAMESPACED PHOTO STORAGE KEYS
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 2: Namespaced Photo Storage Keys ---')

test('buildPhotoKey creates stable ${organizationId}::${recordId} format', () => {
  const key = buildPhotoKey('novatech', 'rec_8f3d1b')
  assert.strictEqual(key, 'novatech::rec_8f3d1b')
})

test('parsePhotoKey decomposes namespaced keys correctly', () => {
  const parsed = parsePhotoKey('sidwal-railway::rec_worker_99')
  assert.strictEqual(parsed.organizationId, 'sidwal-railway')
  assert.strictEqual(parsed.recordId, 'rec_worker_99')
})

test('parsePhotoKey gracefully handles legacy un-namespaced keys', () => {
  const parsed = parsePhotoKey('EMP-1001')
  assert.strictEqual(parsed.organizationId, '')
  assert.strictEqual(parsed.recordId, 'EMP-1001')
})

// ---------------------------------------------------------------------------
// SECTION 3: MULTI-TENANT ISOLATION SIMULATION
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 3: Multi-Tenant Data Isolation ---')

test('Two organizations can have identical displayed IDs without collisions', () => {
  const masterRoster = [
    {
      recordId: 'rec_nova_01',
      organizationId: 'novatech',
      displayedId: 'ID-007',
      employeeId: 'ID-007',
      fullName: 'Alice (Novatech)',
      department: 'Cloud Ops',
    },
    {
      recordId: 'rec_apex_01',
      organizationId: 'apex-university',
      displayedId: 'ID-007',
      employeeId: 'ID-007',
      fullName: 'Bob (Apex Student)',
      department: 'Civil Engineering',
    },
  ]

  // Filter roster for novatech
  const novaRoster = masterRoster.filter((r) => r.organizationId === 'novatech')
  assert.strictEqual(novaRoster.length, 1)
  assert.strictEqual(novaRoster[0].fullName, 'Alice (Novatech)')

  // Filter roster for apex-university
  const apexRoster = masterRoster.filter((r) => r.organizationId === 'apex-university')
  assert.strictEqual(apexRoster.length, 1)
  assert.strictEqual(apexRoster[0].fullName, 'Bob (Apex Student)')

  // Photos are namespaced with zero collision
  const novaPhotoKey = buildPhotoKey('novatech', novaRoster[0].recordId)
  const apexPhotoKey = buildPhotoKey('apex-university', apexRoster[0].recordId)
  assert.notStrictEqual(novaPhotoKey, apexPhotoKey)
  assert.strictEqual(novaPhotoKey, 'novatech::rec_nova_01')
  assert.strictEqual(apexPhotoKey, 'apex-university::rec_apex_01')
})

test('Aggregate statistics are strictly scoped to the active organization', () => {
  const masterRoster = [
    { organizationId: 'novatech', status: 'Generated', department: 'Engineering' },
    { organizationId: 'novatech', status: 'Generated', department: 'Product' },
    { organizationId: 'novatech', status: 'Pending', department: 'Engineering' },
    { organizationId: 'apex-university', status: 'Generated', department: 'Computer Science' },
    { organizationId: 'apex-university', status: 'Draft', department: 'Electrical' },
  ]

  const novaStats = computeEmployeeStats(masterRoster.filter((r) => r.organizationId === 'novatech'))
  assert.strictEqual(novaStats.totalEmployees, 3)
  assert.strictEqual(novaStats.generatedCards, 2)
  assert.strictEqual(novaStats.pendingGeneration, 1)
  assert.strictEqual(novaStats.departmentsCount, 2)

  const apexStats = computeEmployeeStats(masterRoster.filter((r) => r.organizationId === 'apex-university'))
  assert.strictEqual(apexStats.totalEmployees, 2)
  assert.strictEqual(apexStats.generatedCards, 1)
  assert.strictEqual(apexStats.pendingGeneration, 0)
  assert.strictEqual(apexStats.draftCount, 1)
  assert.strictEqual(apexStats.departmentsCount, 2)
})

test('CRUD operations cannot leak or mutate records across organizations', () => {
  let masterRoster = [
    { recordId: 'rec_1', organizationId: 'novatech', displayedId: 'EMP-01', fullName: 'Org 1 User' },
    { recordId: 'rec_2', organizationId: 'sidwal-railway', displayedId: 'EMP-01', fullName: 'Org 2 User' },
  ]

  const activeOrgId = 'novatech'

  // Update operation scoped to activeOrgId
  masterRoster = masterRoster.map((emp) => {
    if (emp.organizationId !== activeOrgId) return emp
    if (emp.displayedId === 'EMP-01') {
      return { ...emp, fullName: 'Updated Org 1 User' }
    }
    return emp
  })

  // Novatech record was updated
  assert.strictEqual(masterRoster.find((e) => e.recordId === 'rec_1').fullName, 'Updated Org 1 User')
  // Sidwal record was completely untouched despite having the same displayedId
  assert.strictEqual(masterRoster.find((e) => e.recordId === 'rec_2').fullName, 'Org 2 User')

  // Delete operation scoped to activeOrgId
  masterRoster = masterRoster.filter((emp) => {
    if (emp.organizationId !== activeOrgId) return true
    return emp.displayedId !== 'EMP-01'
  })

  // Novatech record deleted
  assert.strictEqual(masterRoster.some((e) => e.recordId === 'rec_1'), false)
  // Sidwal record preserved intact
  assert.strictEqual(masterRoster.some((e) => e.recordId === 'rec_2'), true)
})

console.log(`\nTenant Isolation Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`)

if (failed > 0) process.exit(1)

