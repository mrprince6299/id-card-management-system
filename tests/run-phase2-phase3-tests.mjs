import assert from 'node:assert'
import {
  extractIdFromFilename,
  findMatchingEmployees,
  matchPhotosBatch,
  isSupportedPhotoFormat,
} from '../src/utils/photoMatcher.js'
import {
  getCustomFieldsForSide,
  humanizeFieldKey,
  isCustomFieldsSupported,
} from '../src/utils/customFields.js'
import {
  CR80_DIMENSIONS,
  drawTruncatedText,
} from '../src/utils/cardCanvasRenderer.js'

console.log('====================================================')
console.log('🧪 Starting Phase 2 & Phase 3 Verification Suite')
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

// ===========================================================================
// SECTION 1: PHOTO MATCHER CORRECTIONS (PHASE 2)
// ===========================================================================
console.log('--- SECTION 1: Organization-Aware Photo Matching ---')

test('Matches record by recordId even when employeeId is missing', () => {
  const roster = [
    {
      recordId: 'rec_student_99',
      fullName: 'Aarav Gupta',
      organizationId: 'apex-university',
      // No employeeId or displayedId
    },
  ]

  const matches = findMatchingEmployees('rec_student_99.jpg', roster, 'apex-university')
  assert.strictEqual(matches.length, 1)
  assert.strictEqual(matches[0].recordId, 'rec_student_99')
})

test('Matches record by human-readable aliases (rollNo, visitorId, ticketNo)', () => {
  const roster = [
    { recordId: 'rec_s1', rollNo: '2026-CS-101', organizationId: 'apex-university' },
    { recordId: 'rec_v1', visitorId: 'VIS-902', organizationId: 'novatech' },
    { recordId: 'rec_t1', ticketNo: 'TKT-778', organizationId: 'tech-summit' },
  ]

  assert.strictEqual(findMatchingEmployees('2026-CS-101_profile.png', roster, 'apex-university')[0].recordId, 'rec_s1')
  assert.strictEqual(findMatchingEmployees('VIS-902-badge.jpg', roster, 'novatech')[0].recordId, 'rec_v1')
  assert.strictEqual(findMatchingEmployees('TKT-778.webp', roster, 'tech-summit')[0].recordId, 'rec_t1')
})

test('Strips extended suffixes (_front, _back, -front, -back)', () => {
  assert.strictEqual(extractIdFromFilename('EMP-01_front.jpg'), 'EMP-01')
  assert.strictEqual(extractIdFromFilename('EMP-02_back.png'), 'EMP-02')
  assert.strictEqual(extractIdFromFilename('STU-100-front.webp'), 'STU-100')
  assert.strictEqual(extractIdFromFilename('VIS-50-back.jpg'), 'VIS-50')
})

test('Never matches empty, null, or undefined strings', () => {
  const roster = [
    { recordId: 'rec_empty', employeeId: '', displayedId: null, rollNo: undefined },
  ]
  const matches = findMatchingEmployees('undefined.jpg', roster)
  assert.strictEqual(matches.length, 0)

  const emptyMatches = findMatchingEmployees('', roster)
  assert.strictEqual(emptyMatches.length, 0)
})

test('Same displayed ID in different organizations is strictly isolated', () => {
  const multiOrgRoster = [
    { recordId: 'rec_nova_1', organizationId: 'novatech', displayedId: 'ID-001', fullName: 'Alice Nova' },
    { recordId: 'rec_apex_1', organizationId: 'apex-university', displayedId: 'ID-001', fullName: 'Bob Apex' },
  ]

  // Scoped to novatech
  const novaMatches = findMatchingEmployees('ID-001.jpg', multiOrgRoster, 'novatech')
  assert.strictEqual(novaMatches.length, 1)
  assert.strictEqual(novaMatches[0].recordId, 'rec_nova_1')

  // Scoped to apex-university
  const apexMatches = findMatchingEmployees('ID-001.jpg', multiOrgRoster, 'apex-university')
  assert.strictEqual(apexMatches.length, 1)
  assert.strictEqual(apexMatches[0].recordId, 'rec_apex_1')
})

test('Detects multi-record collision (one filename matching multiple records) as ambiguous', () => {
  const roster = [
    { recordId: 'rec_1', employeeId: '101', fullName: 'User 1' },
    { recordId: 'rec_2', rollNo: '101', fullName: 'User 2' },
  ]

  const files = [{ name: '101.jpg', size: 5000 }]
  const result = matchPhotosBatch(files, roster)

  assert.strictEqual(result.matched.length, 0)
  assert.strictEqual(result.ambiguous.length, 1)
  assert.strictEqual(result.ambiguous[0].reason, 'multi-record-collision')
})

test('Detects multiple uploaded photos for the same record as ambiguous', () => {
  const roster = [{ recordId: 'rec_single', employeeId: 'EMP-777', fullName: 'Target User' }]
  const files = [
    { name: 'EMP-777_front.jpg', size: 4000 },
    { name: 'EMP-777_badge.png', size: 4500 },
  ]

  const result = matchPhotosBatch(files, roster)
  assert.strictEqual(result.matched.length, 0)
  assert.strictEqual(result.ambiguous.length, 2)
  assert.strictEqual(result.ambiguous[0].reason, 'duplicate-files-for-record')
})

test('Flags records with existing photos to trigger replacement confirmation', () => {
  const roster = [{ recordId: 'rec_has_photo', employeeId: 'EMP-888', hasPhoto: true }]
  const existingMap = { 'novatech::rec_has_photo': 'blob:http://...' }
  const files = [{ name: 'EMP-888.jpg', size: 3000 }]

  const result = matchPhotosBatch(files, roster, existingMap, { organizationId: 'novatech' })
  assert.strictEqual(result.matched.length, 1)
  assert.strictEqual(result.matched[0].hasExistingPhoto, true)
})

// ===========================================================================
// SECTION 2: CUSTOM FIELDS RENDERING (PHASE 3)
// ===========================================================================
console.log('\n--- SECTION 2: Custom Fields Layout & Rendering ---')

test('isCustomFieldsSupported locks SIDWAL template and allows others', () => {
  assert.strictEqual(isCustomFieldsSupported('sidwal-workshop'), false, 'SIDWAL must be locked')
  assert.strictEqual(isCustomFieldsSupported('corporate-blue'), true)
  assert.strictEqual(isCustomFieldsSupported('executive-minimal'), true)
  assert.strictEqual(isCustomFieldsSupported('modern-tech'), true)
})

test('humanizeFieldKey cleanly formats camelCase and snake_case keys', () => {
  assert.strictEqual(humanizeFieldKey('busRoute'), 'Bus Route')
  assert.strictEqual(humanizeFieldKey('locker_no'), 'Locker No')
  assert.strictEqual(humanizeFieldKey('emergency_contact_2'), 'Emergency Contact 2')
  assert.strictEqual(humanizeFieldKey('courseCode'), 'Course Code')
})

test('getCustomFieldsForSide omits missing/empty fields without dummy data', () => {
  const record = {
    customFields: {
      busRoute: 'Route 44',
      emptyField: '',
      blankSpaces: '   ',
      nullField: null,
      undefinedField: undefined,
    },
  }

  const frontFields = getCustomFieldsForSide(record, 'front', {}, 'corporate-blue')
  assert.strictEqual(frontFields.length, 1)
  assert.strictEqual(frontFields[0].key, 'busRoute')
  assert.strictEqual(frontFields[0].value, 'Route 44')
})

test('getCustomFieldsForSide strictly returns empty list for SIDWAL template', () => {
  const record = {
    customFields: {
      busRoute: 'Route 99',
      lockerNo: 'L-101',
      supervisor: 'John Doe',
    },
  }

  const sidwalFront = getCustomFieldsForSide(record, 'front', {}, 'sidwal-workshop')
  const sidwalBack = getCustomFieldsForSide(record, 'back', {}, 'sidwal-workshop')

  assert.strictEqual(sidwalFront.length, 0, 'SIDWAL front must never have custom fields')
  assert.strictEqual(sidwalBack.length, 0, 'SIDWAL back must never have custom fields')
})

test('Configurable front vs back placement honors customFieldPlacements', () => {
  const record = {
    customFields: {
      busRoute: 'Route 12',
      lockerNo: 'L-404',
      supervisor: 'Dr. Evelyn Stone',
    },
  }

  const settings = {
    customFieldPlacements: {
      busRoute: 'front',
      lockerNo: 'back',
      supervisor: 'back',
    },
  }

  const frontFields = getCustomFieldsForSide(record, 'front', settings, 'corporate-blue')
  const backFields = getCustomFieldsForSide(record, 'back', settings, 'corporate-blue')

  assert.strictEqual(frontFields.length, 1)
  assert.strictEqual(frontFields[0].key, 'busRoute')

  assert.strictEqual(backFields.length, 2)
  assert.strictEqual(backFields[0].key, 'lockerNo')
  assert.strictEqual(backFields[1].key, 'supervisor')
})

test('Default fallback placement puts first 2 fields on front and remainder on back', () => {
  const record = {
    customFields: {
      f1: 'Val 1',
      f2: 'Val 2',
      f3: 'Val 3',
      f4: 'Val 4',
    },
  }

  // No explicit placements given
  const frontFields = getCustomFieldsForSide(record, 'front', {}, 'corporate-blue')
  const backFields = getCustomFieldsForSide(record, 'back', {}, 'corporate-blue')

  assert.strictEqual(frontFields.length, 2, 'Default front must be max 2 to prevent overcrowding')
  assert.strictEqual(frontFields[0].key, 'f1')
  assert.strictEqual(frontFields[1].key, 'f2')

  assert.strictEqual(backFields.length, 2, 'Default back gets remainder')
  assert.strictEqual(backFields[0].key, 'f3')
  assert.strictEqual(backFields[1].key, 'f4')
})

test('drawTruncatedText gracefully truncates text that exceeds maximum boundary', () => {
  let renderedText = ''
  // Mock canvas 2D context
  const mockCtx = {
    measureText: (str) => ({ width: str.length * 10 }), // 10px per char
    fillText: (str) => { renderedText = str },
    textAlign: 'left',
  }

  // Total max width: 100px = max 10 chars
  const longText = 'Very Extremely Long Custom Field Value That Would Overflow Card'
  drawTruncatedText(mockCtx, longText, 10, 20, 100, 'left')

  assert(renderedText.endsWith('...'), 'Long text must end with ellipsis')
  assert(mockCtx.measureText(renderedText).width <= 100, 'Rendered text width must not exceed 100px')
})

// ===========================================================================
// SECTION 3: SIDWAL REPLICA PRESERVATION VERIFICATION
// ===========================================================================
console.log('\n--- SECTION 3: SIDWAL Template Immutability Check ---')

test('SIDWAL dimensions remain strictly 86.22 x 125.45 mm (aspect ratio 0.6873)', () => {
  const dims = CR80_DIMENSIONS.getCardDimensions('sidwal-workshop', 'portrait')
  assert.strictEqual(dims.widthMm, 86.22)
  assert.strictEqual(dims.heightMm, 125.45)
  assert(Math.abs(dims.aspectRatio - 244.4 / 355.6) < 0.0001)
})

console.log(`\nPhase 2 & Phase 3 Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`)

if (failed > 0) process.exit(1)

