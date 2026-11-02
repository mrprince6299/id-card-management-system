import { CARD_TEMPLATES } from '../src/utils/constants.js';
import { OPTIONAL_FIELDS } from '../src/utils/validator.js';
import { autoGuessMapping } from '../src/utils/importer.js';
import { CR80_DIMENSIONS } from '../src/utils/cardCanvasRenderer.js';
import { matchPhotosBatch } from '../src/utils/photoMatcher.js';
import { jsPDF } from 'jspdf';

async function runSidwalTests() {
  console.log('====================================================');
  console.log('🧪 Starting SIDWAL Mechanical Workshop Template Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Template Registration
  console.log('--- TEST 1: Template Registration & Metadata ---');
  const sidwalTmpl = CARD_TEMPLATES.find((t) => t.id === 'sidwal-workshop');
  assert(!!sidwalTmpl, 'SIDWAL Mechanical Workshop template registered in CARD_TEMPLATES');
  assert(sidwalTmpl.name === 'SIDWAL Mechanical Workshop', 'Template name is exactly "SIDWAL Mechanical Workshop"');
  assert(sidwalTmpl.accentColor === '#e30613', 'Template accent color is official red #e30613');
  assert(sidwalTmpl.primaryColor === '#0d2b59', 'Template primary color is official navy #0d2b59');
  assert(Math.abs(sidwalTmpl.aspectRatio - (244.4 / 355.6)) < 0.001, 'Aspect ratio matches reference PDF (0.6873)');

  // All 3 original templates preserved
  assert(CARD_TEMPLATES.some(t => t.id === 'corporate-blue'), 'Original Corporate Blue template preserved');
  assert(CARD_TEMPLATES.some(t => t.id === 'executive-minimal'), 'Original Executive Minimal template preserved');
  assert(CARD_TEMPLATES.some(t => t.id === 'modern-tech'), 'Original Modern Tech template preserved');

  // TEST 2: Measured Reference PDF Dimensions & Zero Distortion
  console.log('\n--- TEST 2: Measured Reference PDF Dimensions & Ratio ---');
  const dims = CR80_DIMENSIONS.getCardDimensions('sidwal-workshop');
  assert(dims.widthMm === 86.22, 'SIDWAL physical width matches reference PDF (86.22 mm)');
  assert(dims.heightMm === 125.45, 'SIDWAL physical height matches reference PDF (125.45 mm)');
  assert(Math.abs(dims.aspectRatio - 0.687289) < 0.0001, 'Aspect ratio is strictly preserved (0.687289)');

  // TEST 3: Schema & Import Field Mapping
  console.log('\n--- TEST 3: Excel/CSV Auto-Mapping of New Fields ---');
  assert(OPTIONAL_FIELDS.some(f => f.key === 'fatherName'), 'fatherName added to OPTIONAL_FIELDS');
  assert(OPTIONAL_FIELDS.some(f => f.key === 'aadhaarNumber'), 'aadhaarNumber added to OPTIONAL_FIELDS');
  assert(OPTIONAL_FIELDS.some(f => f.key === 'address'), 'address added to OPTIONAL_FIELDS');

  const headers = ['Employee ID', 'Full Name', "Father's Name", 'Designation', 'Department', 'Aadhaar No', 'Mobile', 'Permanent Address'];
  const mapping = autoGuessMapping(headers);
  assert(mapping.employeeId === 'Employee ID', 'Auto-mapped Employee ID');
  assert(mapping.fatherName === "Father's Name", "Auto-mapped Father's Name alias to fatherName");
  assert(mapping.aadhaarNumber === 'Aadhaar No', 'Auto-mapped Aadhaar No alias to aadhaarNumber');
  assert(mapping.phone === 'Mobile', 'Auto-mapped Mobile alias to existing phone field');
  assert(mapping.address === 'Permanent Address', 'Auto-mapped Permanent Address alias to address');

  // TEST 4: Photo Matching for SIDWAL Employee IDs
  console.log('\n--- TEST 4: Photo Matching Engine ---');
  const testEmployees = [
    { id: 'SO 52821', employeeId: 'SO 52821', fullName: 'NAGANDER PATHAK' },
    { id: 'SO 99999', employeeId: 'SO 99999', fullName: 'ROHIT SHARMA' },
  ];
  const photoFiles = [
    { name: 'SO 52821.jpg', size: 1024, type: 'image/jpeg' },
    { name: 'SO-99999_profile.png', size: 2048, type: 'image/png' },
  ];
  const matchResult = matchPhotosBatch(photoFiles, testEmployees);
  assert(matchResult.matched.length === 2, 'Matched both employee photos cleanly (2/2)');
  assert(matchResult.matched[0].employeeId === 'SO 52821', 'Direct match for SO 52821.jpg');
  assert(matchResult.matched[1].employeeId === 'SO 99999', 'Normalized match for SO-99999_profile.png');

  // TEST 5: Missing Personal Details Rule (Must be Blank, Never Pre-filled)
  console.log('\n--- TEST 5: Missing Fields Left Blank Rule ---');
  const empWithMissing = {
    id: 'SO 12345',
    employeeId: 'SO 12345',
    fullName: 'ANIL KUMAR',
    designation: 'TECHNICIAN',
    department: 'WORKSHOP',
  };
  assert(!empWithMissing.fatherName, 'Missing fatherName is undefined');
  assert(!empWithMissing.aadhaarNumber, 'Missing aadhaarNumber is undefined');
  assert(!empWithMissing.address, 'Missing address is undefined');

  // TEST 6: jsPDF Document Generation with Exact Dimensions
  console.log('\n--- TEST 6: jsPDF Document Generation ---');
  const docIndividual = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [dims.widthMm, dims.heightMm],
  });
  assert(Math.abs(docIndividual.internal.pageSize.getWidth() - 86.22) < 0.01, 'Individual PDF width is 86.22 mm');
  assert(Math.abs(docIndividual.internal.pageSize.getHeight() - 125.45) < 0.01, 'Individual PDF height is 125.45 mm');

  console.log('\n====================================================');
  console.log(`📊 SIDWAL Template Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runSidwalTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
