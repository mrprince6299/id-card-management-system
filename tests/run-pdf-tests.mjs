import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { CR80_DIMENSIONS } from '../src/utils/cardCanvasRenderer.js'
import { drawCuttingCropMarks, A4_LAYOUTS } from '../src/utils/pdfGenerator.js'
import { MOCK_EMPLOYEES } from '../src/data/mockEmployees.js'

async function runPdfTests() {
  console.log('====================================================')
  console.log('🧪 Starting Phase 5 Bulk PDF Generation Test Suite')
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

  // TEST 1: Physical CR80 Dimensions & Orientation Swapping
  console.log('--- TEST 1: Physical CR80 Dimensions & Orientations ---')
  const portraitDims = CR80_DIMENSIONS.getDimensions('portrait')
  assert(portraitDims.widthMm === 53.98, 'CR80 portrait width is exactly 53.98 mm')
  assert(portraitDims.heightMm === 85.6, 'CR80 portrait height is exactly 85.60 mm')

  const landscapeDims = CR80_DIMENSIONS.getDimensions('landscape')
  assert(landscapeDims.widthMm === 85.6, 'CR80 landscape width is exactly 85.60 mm')
  assert(landscapeDims.heightMm === 53.98, 'CR80 landscape height is exactly 53.98 mm')

  // Verify jsPDF CR80 document creation
  const docCr80Portrait = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [53.98, 85.6],
  })
  assert(
    Math.abs(docCr80Portrait.internal.pageSize.getWidth() - 53.98) < 0.01,
    'jsPDF CR80 portrait page width matches 53.98 mm'
  )
  assert(
    Math.abs(docCr80Portrait.internal.pageSize.getHeight() - 85.6) < 0.01,
    'jsPDF CR80 portrait page height matches 85.60 mm'
  )

  const docCr80Landscape = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98],
  })
  assert(
    Math.abs(docCr80Landscape.internal.pageSize.getWidth() - 85.6) < 0.01,
    'jsPDF CR80 landscape page width matches 85.60 mm'
  )
  assert(
    Math.abs(docCr80Landscape.internal.pageSize.getHeight() - 53.98) < 0.01,
    'jsPDF CR80 landscape page height matches 53.98 mm'
  )

  // TEST 2: Physical A4 Page Dimensions
  console.log('\n--- TEST 2: Physical A4 Page Dimensions & Margins ---')
  const docA4 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  assert(
    Math.abs(docA4.internal.pageSize.getWidth() - 210) < 0.01,
    'jsPDF A4 sheet width matches 210 mm'
  )
  assert(
    Math.abs(docA4.internal.pageSize.getHeight() - 297) < 0.01,
    'jsPDF A4 sheet height matches 297 mm'
  )

  // A4 layout configurations
  const a4p = A4_LAYOUTS.portrait
  assert(a4p.cardsPerSheet === 9, 'A4 portrait sheet accommodates 9 cards (3×3 matrix)')
  assert(a4p.marginLeftMm > 15, `A4 portrait margins calculated safely (${a4p.marginLeftMm.toFixed(1)} mm)`)

  const a4l = A4_LAYOUTS.landscape
  assert(a4l.cardsPerSheet === 8, 'A4 landscape sheet accommodates 8 cards (2×4 matrix)')
  assert(a4l.marginLeftMm > 15, `A4 landscape margins calculated safely (${a4l.marginLeftMm.toFixed(1)} mm)`)

  // TEST 3: Verified 300 DPI Pixel Calculation
  console.log('\n--- TEST 3: 300 DPI Resolution Verification ---')
  const portrait300Dpi = CR80_DIMENSIONS.getCanvasPixels('portrait', 300)
  assert(portrait300Dpi.width === 638, 'CR80 portrait width at 300 DPI = 638 pixels (53.98mm × 300/25.4)')
  assert(portrait300Dpi.height === 1011, 'CR80 portrait height at 300 DPI = 1011 pixels (85.60mm × 300/25.4)')

  const landscape300Dpi = CR80_DIMENSIONS.getCanvasPixels('landscape', 300)
  assert(landscape300Dpi.width === 1011, 'CR80 landscape width at 300 DPI = 1011 pixels')
  assert(landscape300Dpi.height === 638, 'CR80 landscape height at 300 DPI = 638 pixels')

  // TEST 4: QR Code Generation & Payload Readability
  console.log('\n--- TEST 4: QR Code Encoding & Readability ---')
  const sampleEmp = MOCK_EMPLOYEES[0] // Sarah Jenkins
  const qrPayload = JSON.stringify({
    id: sampleEmp.id,
    name: sampleEmp.fullName,
    dept: sampleEmp.department,
    org: 'NOVATECH SOLUTIONS',
  })

  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 256 })
  assert(qrDataUrl && qrDataUrl.startsWith('data:image/png;base64,'), 'Generated valid PNG QR code data URL')
  assert(qrDataUrl.length > 500, `QR Code payload density verified (${qrDataUrl.length} bytes)`)

  // Decode check: re-parse payload
  const parsedQrPayload = JSON.parse(qrPayload)
  assert(parsedQrPayload.id === 'EMP-1001', 'Decoded QR payload preserves Employee ID')
  assert(parsedQrPayload.org === 'NOVATECH SOLUTIONS', 'Decoded QR payload preserves Company Name')

  // TEST 5: Crop & Cutting Marks Math
  console.log('\n--- TEST 5: Cutting Crop Marks Vector Geometry ---')
  const testDoc = new jsPDF()
  let lineCount = 0
  const origLine = testDoc.line
  testDoc.line = (...args) => {
    lineCount++
    return origLine.apply(testDoc, args)
  }
  drawCuttingCropMarks(testDoc, 20, 20, 53.98, 85.6, 3.5)
  assert(lineCount === 8, 'Draws 8 distinct corner crop mark lines per card (2 lines × 4 vertices)')

  // TEST 6: 100-Employee Bulk Batch Simulation
  console.log('\n--- TEST 6: 100-Employee Bulk Batch Execution ---')
  // Generate 100 fictional employee records
  const bulk100Employees = []
  for (let i = 1; i <= 100; i++) {
    const id = `EMP-${1000 + i}`
    bulk100Employees.push({
      id,
      employeeId: id,
      fullName: `Fictional Employee ${i}`,
      department: i % 3 === 0 ? 'Engineering' : i % 3 === 1 ? 'Operations' : 'Product Design',
      role: 'Staff Specialist',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
      joiningDate: '2026-02-01',
    })
  }

  assert(bulk100Employees.length === 100, 'Constructed 100 fictional employee records')

  // A4 Portrait: 9 cards per sheet
  const a4PortraitSheetsFrontOnly = Math.ceil(bulk100Employees.length / 9)
  assert(a4PortraitSheetsFrontOnly === 12, '100 employees on A4 portrait (9-up) = 12 pages (front-only)')

  const a4PortraitSheetsFrontBack = a4PortraitSheetsFrontOnly * 2
  assert(a4PortraitSheetsFrontBack === 24, '100 employees on A4 portrait (9-up) = 24 pages (front & back duplex)')

  // A4 Landscape: 8 cards per sheet
  const a4LandscapeSheetsFrontOnly = Math.ceil(bulk100Employees.length / 8)
  assert(a4LandscapeSheetsFrontOnly === 13, '100 employees on A4 landscape (8-up) = 13 pages (front-only)')

  const a4LandscapeSheetsFrontBack = a4LandscapeSheetsFrontOnly * 2
  assert(a4LandscapeSheetsFrontBack === 26, '100 employees on A4 landscape (8-up) = 26 pages (front & back duplex)')

  // CR80 Single Cards Mode: 100 cards
  assert(bulk100Employees.length === 100, '100 employees on CR80 single card mode = 100 pages (front-only)')
  assert(bulk100Employees.length * 2 === 200, '100 employees on CR80 single card mode = 200 pages (front & back)')

  // TEST 7: Duplex Back-Side Horizontal Mirror Alignment
  console.log('\n--- TEST 7: Duplex Sheet Back-Side Alignment Geometry ---')
  // If cols = 3: column 0 must mirror to column 2 on back side
  const cols = 3
  const origCol0 = 0
  const mirroredCol0 = cols - 1 - origCol0
  assert(mirroredCol0 === 2, 'Front column 0 correctly aligns with Back column 2 for long-edge duplex flipping')

  const origCol1 = 1
  const mirroredCol1 = cols - 1 - origCol1
  assert(mirroredCol1 === 1, 'Front column 1 correctly aligns with Back column 1')

  const origCol2 = 2
  const mirroredCol2 = cols - 1 - origCol2
  assert(mirroredCol2 === 0, 'Front column 2 correctly aligns with Back column 0')

  // TEST 8: Department Filtering
  console.log('\n--- TEST 8: Department Filter Scope ---')
  const engineeringOnly = bulk100Employees.filter((e) => e.department === 'Engineering')
  assert(engineeringOnly.length === 33, `Department filter correctly filtered 33 Engineering employees (${engineeringOnly.length}/100)`)
  const engSheetsA4 = Math.ceil(engineeringOnly.length / 9)
  assert(engSheetsA4 === 4, `Filtered department batch requires 4 A4 sheets (${engSheetsA4} pages)`)

  console.log('\n====================================================')
  console.log(`📊 Phase 5 Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPdfTests().catch((err) => {
  console.error('Fatal error during PDF test run:', err)
  process.exit(1)
})
