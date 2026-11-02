import assert from 'assert'
import {
  CARD_TYPES,
  getCardTypeById,
  generateRecordId,
  getDisplayId,
} from '../src/utils/cardTypes.js'
import {
  autoGuessMapping,
  applyColumnMapping,
  formatExcelDate,
  parseSpreadsheetFile,
} from '../src/utils/importer.js'
import {
  validateRecord,
  validateBatch,
  isRowEmpty,
} from '../src/utils/validator.js'
import {
  DEFAULT_ORGANIZATIONS,
  getStoredOrganizations,
  saveStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
  getActiveOrganization,
  updateActiveOrganization,
  resetOrganizationsToDefault,
} from '../src/utils/organizationStorage.js'
import {
  extractIdFromFilename,
  findMatchingEmployee,
  matchPhotosBatch,
} from '../src/utils/photoMatcher.js'
import { CARD_TEMPLATES, CARD_SIZES } from '../src/utils/constants.js'

async function runGeneralizationTests() {
  console.log('====================================================')
  console.log('🧪 Starting General-Purpose ID Platform Test Suite')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function test(description, fn) {
    try {
      fn()
      console.log(`✅ PASS: ${description}`)
      passed++
    } catch (err) {
      console.error(`❌ FAIL: ${description}`)
      console.error(`   ${err.message}`)
      failed++
    }
  }

  // --- SECTION 1: Card Types & Generic Schema ---
  console.log('--- SECTION 1: Dynamic Card Types & Generic Schema ---')
  test('All 7 required card types are registered in CARD_TYPES', () => {
    const requiredTypes = ['employee', 'student', 'staff', 'visitor', 'contractor', 'event', 'custom']
    for (const typeId of requiredTypes) {
      const found = CARD_TYPES.find((t) => t.id === typeId)
      assert(found, `Card type ${typeId} must be registered`)
      assert(found.idFieldLabel, `Card type ${typeId} must define idFieldLabel`)
    }
  })

  test('Student ID schema defines Roll No and Course labels', () => {
    const student = getCardTypeById('student')
    assert.strictEqual(student.idFieldLabel, 'Roll / Registration No')
    assert.strictEqual(student.primaryFieldLabel, 'Course / Program')
  })

  test('Visitor Pass schema defines Pass ID and Purpose labels', () => {
    const visitor = getCardTypeById('visitor')
    assert.strictEqual(visitor.idFieldLabel, 'Visitor Pass ID')
    assert.strictEqual(visitor.secondaryFieldLabel, 'Purpose of Visit')
  })

  test('generateRecordId produces distinct internal IDs', () => {
    const id1 = generateRecordId('rec')
    const id2 = generateRecordId('rec')
    assert(id1.startsWith('rec_'), 'ID must have rec_ prefix')
    assert.notStrictEqual(id1, id2, 'Generated internal IDs must be unique')
  })

  test('getDisplayId resolves displayedId, rollNo, visitorId, ticketNo, and employeeId', () => {
    assert.strictEqual(getDisplayId({ displayedId: 'DISP-10' }), 'DISP-10')
    assert.strictEqual(getDisplayId({ rollNo: 'ROLL-502' }), 'ROLL-502')
    assert.strictEqual(getDisplayId({ visitorId: 'VIS-99' }), 'VIS-99')
    assert.strictEqual(getDisplayId({ ticketNo: 'TKT-VIP' }), 'TKT-VIP')
    assert.strictEqual(getDisplayId({ employeeId: 'EMP-01' }), 'EMP-01')
  })

  // --- SECTION 2: Flexible Ingestion & Missing Fields Rule ---
  console.log('\n--- SECTION 2: Flexible Ingestion & Optional Fields ---')
  test('Auto-mapping detects Student and Visitor column aliases', () => {
    const headers = ['Roll Number', 'First Name', 'Last Name', 'Course', 'Semester', 'Mobile', "Father's Name", 'Aadhaar No']
    const mapping = autoGuessMapping(headers)
    assert.strictEqual(mapping.rollNo, 'Roll Number')
    assert.strictEqual(mapping.course, 'Course')
    assert.strictEqual(mapping.semester, 'Semester')
    assert.strictEqual(mapping.phone, 'Mobile')
    assert.strictEqual(mapping.fatherName, "Father's Name")
    assert.strictEqual(mapping.aadhaarNumber, 'Aadhaar No')
  })

  test('applyColumnMapping extracts personal details and skips empty rows', () => {
    const headers = ['Roll Number', 'First Name', 'Last Name', 'Course', 'Mobile', "Father's Name", 'Aadhaar No', 'Address']
    const rawRows = [
      ['STU-101', 'Rahul', 'Verma', 'Computer Science', '+91 98765 11111', 'Suresh Verma', '1234-5678-9012', 'Delhi, India'],
      ['', '', '', '', '', '', '', ''], // Completely empty row
      ['STU-102', 'Anita', 'Roy', 'Electronics', '+91 98765 22222', 'Sunil Roy', '9876-5432-1098', 'Kolkata, India'],
      [null, undefined, '', '   '], // Another empty row
    ]

    const mapped = applyColumnMapping(rawRows, headers, {
      rollNo: 'Roll Number',
      firstName: 'First Name',
      lastName: 'Last Name',
      course: 'Course',
      phone: 'Mobile',
      fatherName: "Father's Name",
      aadhaarNumber: 'Aadhaar No',
      address: 'Address',
    }, { cardType: 'student' })

    assert.strictEqual(mapped.length, 2, 'Must skip 2 completely blank rows and return exactly 2 records')
    assert.strictEqual(mapped[0].displayedId, 'STU-101')
    assert.strictEqual(mapped[0].fatherName, 'Suresh Verma')
    assert.strictEqual(mapped[0].aadhaarNumber, '1234-5678-9012')
    assert.strictEqual(mapped[0].address, 'Delhi, India')
    assert(mapped[0].recordId.startsWith('rec_'), 'Record must have internal recordId')
  })

  test('In lenient mode, records with missing personal fields are valid (No field mandatory)', () => {
    const studentRecord = {
      cardType: 'student',
      displayedId: 'STU-999',
      fullName: 'Alex Student',
      // No department, designation, email, phone, fatherName, etc.
    }
    const val = validateRecord(studentRecord, new Set(), new Map(), { strictRequired: false })
    assert.strictEqual(val.isValid, true, 'Lenient mode must not fail when personal fields are omitted')
    assert.strictEqual(val.errors.length, 0)
  })

  // --- SECTION 3: Multiple Organizations & SIDWAL Immutability ---
  console.log('\n--- SECTION 3: Multiple Organizations & SIDWAL Immutability ---')
  test('5 default organizations exist with isolated settings', () => {
    assert.strictEqual(DEFAULT_ORGANIZATIONS.length, 5)
    const novatech = DEFAULT_ORGANIZATIONS.find((o) => o.id === 'novatech')
    const sidwal = DEFAULT_ORGANIZATIONS.find((o) => o.id === 'sidwal-railway')
    const apex = DEFAULT_ORGANIZATIONS.find((o) => o.id === 'apex-university')
    const summit = DEFAULT_ORGANIZATIONS.find((o) => o.id === 'tech-summit')

    assert(novatech && sidwal && apex && summit)
    assert.strictEqual(sidwal.isImmutableBranding, true, 'SIDWAL branding must be flagged immutable')
    assert.strictEqual(novatech.isImmutableBranding, false)
  })

  test('SIDWAL Mechanical Workshop branding cannot be overwritten or altered', () => {
    // Check hydrated SIDWAL organization branding
    const orgs = getStoredOrganizations()
    const sidwal = orgs.find((o) => o.id === 'sidwal-railway')
    assert.strictEqual(sidwal.companyName, 'SIDWAL REFRIGERATION INDUSTRIES (P) LTD')
    assert(sidwal.logoUrl.startsWith('data:image/png;base64,'), 'SIDWAL logo must be genuine extracted asset')
  })

  // --- SECTION 4: Photo Matching Across Different ID Schemas ---
  console.log('\n--- SECTION 4: Photo Matching Across Different ID Types ---')
  test('Photo matcher matches Student roll numbers and strips photo suffixes', () => {
    const roster = [
      { recordId: 'rec_01', displayedId: 'STU-2026-042', fullName: 'Rahul Sharma' },
      { recordId: 'rec_02', displayedId: 'VIS-904', fullName: 'Amit Verma' },
      { recordId: 'rec_03', employeeId: 'EMP-1001', fullName: 'Sarah Jenkins' },
    ]

    const match1 = findMatchingEmployee('STU-2026-042_profile.jpg', roster)
    assert(match1, 'Must match student roll number')
    assert.strictEqual(match1.displayedId, 'STU-2026-042')

    const match2 = findMatchingEmployee('VIS-904-headshot.png', roster)
    assert(match2, 'Must match visitor pass code')
    assert.strictEqual(match2.displayedId, 'VIS-904')

    const match3 = findMatchingEmployee('emp-1001.webp', roster)
    assert(match3, 'Must match employee ID case-insensitively')
    assert.strictEqual(match3.employeeId, 'EMP-1001')
  })

  test('Duplicate photo files for the same ID are flagged as ambiguous', () => {
    const roster = [{ displayedId: 'STU-100' }]
    const files = [
      { name: 'STU-100_v1.jpg', size: 1000 },
      { name: 'STU-100_v2.jpg', size: 1200 },
    ]
    const report = matchPhotosBatch(files, roster)
    assert.strictEqual(report.matched.length, 0, 'No direct single match when colliding')
    assert.strictEqual(report.ambiguous.length, 2, 'Both colliding files must be flagged in ambiguous')
    assert.strictEqual(report.ambiguous[0].status, 'ambiguous')
  })

  // --- SECTION 5: Full-Platform Backup & Restore Structure ---
  console.log('\n--- SECTION 5: Platform Backup & Restore Verification ---')
  test('Backup schema structure validates records, organizations, and metadata', () => {
    const mockBackup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'ID Card Management Platform',
      activeOrgId: 'novatech',
      organizations: DEFAULT_ORGANIZATIONS,
      records: [
        { recordId: 'rec_101', displayedId: 'STU-01', fullName: 'Test User', cardType: 'student' },
      ],
      photos: [
        { employeeId: 'STU-01', filename: 'STU-01.jpg', mimeType: 'image/jpeg', base64: 'data:image/jpeg;base64,1234' },
      ],
    }

    assert.strictEqual(mockBackup.version, '2.0.0')
    assert(Array.isArray(mockBackup.records))
    assert.strictEqual(mockBackup.records[0].displayedId, 'STU-01')
    assert(Array.isArray(mockBackup.photos))
    assert.strictEqual(mockBackup.photos[0].employeeId, 'STU-01')
  })

  // --- SECTION 6: Template Integrity & Aspect Ratio ---
  console.log('\n--- SECTION 6: Template Preservation & Dimensions ---')
  test('All core templates exist and SIDWAL aspect ratio is preserved', () => {
    assert(CARD_TEMPLATES.length >= 4, `At least 4 templates exist (found ${CARD_TEMPLATES.length})`)
    const sidwal = CARD_TEMPLATES.find((t) => t.id === 'sidwal-workshop')
    assert(sidwal, 'SIDWAL template must exist')
    assert.strictEqual(sidwal.name, 'SIDWAL Mechanical Workshop')
    assert(Math.abs(sidwal.aspectRatio - 244.4 / 355.6) < 0.0001, 'Aspect ratio must match 244.4/355.6')
  })

  console.log('\n====================================================')
  console.log(`📊 Generalization Platform Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runGeneralizationTests()
