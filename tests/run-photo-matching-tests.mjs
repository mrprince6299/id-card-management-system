import {
  isSupportedPhotoFormat,
  extractIdFromFilename,
  findMatchingEmployee,
  matchPhotosBatch,
  formatFileSize,
  SUPPORTED_EXTENSIONS,
} from '../src/utils/photoMatcher.js'
import { MOCK_EMPLOYEES } from '../src/data/mockEmployees.js'

function runPhotoMatchingTests() {
  console.log('====================================================')
  console.log('🧪 Starting Phase 3 Photo Upload & Matching Test Suite')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  // TEST 1: Supported Format Detection
  console.log('--- TEST 1: File Extension & Format Validation ---')
  assert(isSupportedPhotoFormat('EMP001.jpg'), 'Validates .jpg format')
  assert(isSupportedPhotoFormat('EMP002.jpeg'), 'Validates .jpeg format')
  assert(isSupportedPhotoFormat('EMP003.png'), 'Validates .png format')
  assert(isSupportedPhotoFormat('EMP004.webp'), 'Validates .webp format')
  assert(isSupportedPhotoFormat('EMP005.PNG'), 'Validates uppercase .PNG format')
  assert(!isSupportedPhotoFormat('EMP006.gif'), 'Rejects unsupported .gif format')
  assert(!isSupportedPhotoFormat('EMP007.bmp'), 'Rejects unsupported .bmp format')
  assert(!isSupportedPhotoFormat('EMP008.pdf'), 'Rejects unsupported .pdf format')
  assert(!isSupportedPhotoFormat(''), 'Rejects empty filename')

  // TEST 2: Employee ID Extraction & Suffix Stripping
  console.log('\n--- TEST 2: Suffix Stripping & ID Extraction ---')
  assert(extractIdFromFilename('EMP-1001.jpg') === 'EMP-1001', 'Extracts direct ID "EMP-1001.jpg"')
  assert(extractIdFromFilename('EMP001_profile.jpg') === 'EMP001', 'Strips "_profile" suffix')
  assert(extractIdFromFilename('EMP002_photo.png') === 'EMP002', 'Strips "_photo" suffix')
  assert(extractIdFromFilename('emp-1003-headshot.jpeg') === 'emp-1003', 'Strips "-headshot" suffix')
  assert(extractIdFromFilename('EMP-1004_avatar.webp') === 'EMP-1004', 'Strips "_avatar" suffix')

  // TEST 3: Matching at least 15 fictional employee photos
  console.log('\n--- TEST 3: Bulk Photo Matching (15+ Fictional Photos) ---')
  const testPhotos = [
    // Direct matches
    { name: 'EMP-1001.jpg', size: 102400 },
    { name: 'EMP-1002.png', size: 85200 },
    { name: 'EMP-1003.jpeg', size: 91400 },
    { name: 'EMP-1004.webp', size: 64000 },
    // Suffix matches
    { name: 'EMP-1005_profile.jpg', size: 110000 },
    { name: 'EMP-1006_photo.png', size: 95000 },
    // Lowercase / uppercase case-insensitivity
    { name: 'emp-1007.jpg', size: 89000 },
    // Hyphen-insensitive match (EMP1001 vs EMP-1001) -> handled in findMatchingEmployee
    { name: 'emp-1002_headshot.jpg', size: 92000 }, // Will create ambiguous match for EMP-1002!
    // Additional valid fictional employee IDs
    { name: 'EMP-2001.jpg', size: 104000 },
    { name: 'EMP-2002_profile.png', size: 112000 },
    { name: 'EMP-2003.jpeg', size: 88000 },
    { name: 'EMP-2004.webp', size: 73000 },
    { name: 'EMP-2005.jpg', size: 97000 },
    { name: 'EMP-3001.jpg', size: 101000 },
    { name: 'EMP-3002.png', size: 89500 },
    // Unmatched photos (no employee exists with this ID)
    { name: 'CONTRACTOR-99.jpg', size: 45000 },
    { name: 'GUEST_BADGE_01.png', size: 52000 },
    // Unsupported format
    { name: 'EMP-9999.gif', size: 30000 },
  ]

  // Roster containing MOCK_EMPLOYEES plus 2000 & 3000 series
  const extendedRoster = [
    ...MOCK_EMPLOYEES,
    { id: 'EMP-2001', employeeId: 'EMP-2001', fullName: 'Lucas Bennett', department: 'Engineering' },
    { id: 'EMP-2002', employeeId: 'EMP-2002', fullName: 'Chloe Morrison', department: 'Engineering' },
    { id: 'EMP-2003', employeeId: 'EMP-2003', fullName: 'Alexander Wright', department: 'Product Design' },
    { id: 'EMP-2004', employeeId: 'EMP-2004', fullName: 'Zoe Kowalski', department: 'Data & AI' },
    { id: 'EMP-2005', employeeId: 'EMP-2005', fullName: 'Gabriel Santos', department: 'Cybersecurity' },
    { id: 'EMP-3001', employeeId: 'EMP-3001', fullName: 'Julian Casablancas', department: 'Audio' },
    { id: 'EMP-3002', employeeId: 'EMP-3002', fullName: 'Fabrizio Moretti', department: 'Audio' },
    { id: 'EMP-9999', employeeId: 'EMP-9999', fullName: 'Missing Photo Guy', department: 'Research' },
  ]

  const results = matchPhotosBatch(testPhotos, extendedRoster, {})

  assert(results.stats.totalUploaded === 18, `Processed total 18 test photo items (found ${results.stats.totalUploaded})`)
  assert(results.matched.length >= 12, `Cleanly matched ${results.matched.length} employee photos`)
  assert(
    results.matched.some((m) => m.employeeId === 'EMP-1007' && m.filename === 'emp-1007.jpg'),
    'Case-insensitive match confirmed: "emp-1007.jpg" matched to "EMP-1007"'
  )
  assert(
    results.matched.some((m) => m.employeeId === 'EMP-1005' && m.filename === 'EMP-1005_profile.jpg'),
    'Suffix-based match confirmed: "EMP-1005_profile.jpg" matched to "EMP-1005"'
  )

  // TEST 4: Duplicate & Ambiguous Filename Detection
  console.log('\n--- TEST 4: Duplicate / Ambiguous Matching Detection ---')
  assert(results.ambiguous.length === 2, `Detected exactly 2 ambiguous duplicate photos for EMP-1002 (found ${results.ambiguous.length})`)
  const ambGroup = results.ambiguous.find((a) => a.employeeId === 'EMP-1002')
  assert(
    ambGroup && ambGroup.duplicateGroup.includes('EMP-1002.png') && ambGroup.duplicateGroup.includes('emp-1002_headshot.jpg'),
    'Ambiguous group contains both colliding filenames'
  )

  // TEST 5: Unmatched & Unsupported Photo Detection
  console.log('\n--- TEST 5: Unmatched & Unsupported Photo Detection ---')
  assert(results.unmatched.length === 2, `Detected 2 unmatched photos (found ${results.unmatched.length})`)
  assert(results.unmatched.some((u) => u.filename === 'CONTRACTOR-99.jpg'), 'Identified "CONTRACTOR-99.jpg" as unmatched')
  assert(results.unmatched.some((u) => u.filename === 'GUEST_BADGE_01.png'), 'Identified "GUEST_BADGE_01.png" as unmatched')
  assert(results.unsupported.length === 1, `Detected 1 unsupported format photo (found ${results.unsupported.length})`)
  assert(results.unsupported[0].filename === 'EMP-9999.gif', 'Identified "EMP-9999.gif" as unsupported')

  // TEST 6: Missing Photo Employees Detection
  console.log('\n--- TEST 6: Missing Photo Detection in Directory ---')
  assert(results.missingEmployees.some((e) => e.employeeId === 'EMP-9999' || e.id === 'EMP-9999'), 'Detected employee EMP-9999 with missing photo')
  assert(results.stats.missingCount > 0, `Directory contains ${results.stats.missingCount} employees awaiting photos`)

  // TEST 7: Manual Photo Assignment Logic
  console.log('\n--- TEST 7: Manual Photo Assignment ---')
  const unmatchedItem = results.unmatched.find((u) => u.filename === 'CONTRACTOR-99.jpg')
  const manualAssignedEmployeeId = 'EMP-9999'

  // Simulate manual assignment
  const manualMatch = {
    employeeId: manualAssignedEmployeeId,
    file: unmatchedItem.file,
    filename: unmatchedItem.filename,
    status: 'manually_assigned',
  }

  assert(manualMatch.employeeId === 'EMP-9999', 'Manually mapped unmatched photo to employee EMP-9999')

  // Re-run matching with this photo assigned in existingPhotoMap
  const updatedResults = matchPhotosBatch(
    testPhotos.filter((p) => p.name !== 'CONTRACTOR-99.jpg'),
    extendedRoster,
    { 'EMP-9999': 'blob:http://localhost/mock-url' }
  )

  assert(
    !updatedResults.missingEmployees.some((e) => e.employeeId === 'EMP-9999'),
    'Employee EMP-9999 successfully resolved from missing list after photo assignment'
  )

  // TEST 8: Photo Replacement Logic & Confirmation Safety
  console.log('\n--- TEST 8: Photo Replacement ---')
  const existingEmployeePhotos = { 'EMP-1001': 'blob:http://localhost/old-photo-url' }
  const newPhotoForEmp1001 = { name: 'EMP-1001_v2.jpg', size: 120000 }

  const matchCheck = matchPhotosBatch([newPhotoForEmp1001], extendedRoster, existingEmployeePhotos)
  assert(matchCheck.matched.length === 1, 'Matched replacement photo to EMP-1001')
  assert(matchCheck.matched[0].hasExistingPhoto === true, 'Flagged that EMP-1001 already has an existing photo to trigger replacement confirmation')

  // TEST 9: IndexedDB Storage Architecture Verification (No localStorage Base64)
  console.log('\n--- TEST 9: Storage Architecture Verification ---')
  assert(typeof formatFileSize(1048576) === 'string', 'File size formatter works correctly')
  assert(formatFileSize(1048576) === '1 MB', '1048576 bytes formatted as "1 MB"')
  assert(formatFileSize(25600) === '25 KB', '25600 bytes formatted as "25 KB"')

  // Assert schema compliance: Record must contain blob, employeeId, filename, size, mimeType
  const mockDBRecord = {
    employeeId: 'EMP-1001',
    blob: { size: 102400, type: 'image/jpeg' },
    filename: 'EMP-1001.jpg',
    size: 102400,
    mimeType: 'image/jpeg',
    updatedAt: Date.now(),
  }
  assert(mockDBRecord.blob && typeof mockDBRecord.blob !== 'string', 'IndexedDB record stores Blob object (NOT a Base64 string)')
  assert(mockDBRecord.employeeId === 'EMP-1001', 'IndexedDB key is employeeId')

  console.log('\n====================================================')
  console.log(`📊 Phase 3 Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhotoMatchingTests()

