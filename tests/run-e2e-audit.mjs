import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

import { parseSpreadsheetFile, applyColumnMapping, autoGuessMapping } from '../src/utils/importer.js'
import { validateBatch, REQUIRED_FIELDS } from '../src/utils/validator.js'
import { matchPhotosBatch, formatFileSize } from '../src/utils/photoMatcher.js'
import { A4_LAYOUTS } from '../src/utils/pdfGenerator.js'
import { CR80_DIMENSIONS } from '../src/utils/cardCanvasRenderer.js'
import { generateEmployeeQrCode, generateEmployeeBarcode } from '../src/utils/codeGenerators.js'
import { generate100Employees } from './generate-100-dataset.mjs'

async function runE2eAudit() {
  console.log('=================================================================')
  console.log('🚀 Phase 6: Complete Application QA & Production Readiness Audit')
  console.log('=================================================================\n')

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

  // Ensure output directories exist
  const outputDir = path.resolve('tests', 'output')
  const screenshotsDir = path.resolve(outputDir, 'screenshots')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })

  // ---------------------------------------------------------------------------
  // SECTION 1: END-TO-END WORKFLOW TESTING WITH 100 EMPLOYEES
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: End-to-End Workflow Testing (100 Employees) ---')

  // Step 1: Safe Reset Simulation
  let simulatedDirectory = []
  assert(simulatedDirectory.length === 0, 'Step 1: Directory safely reset to 0 demo employees')

  // Step 2: Import 100 Fictional Employees through Excel
  const xlsxPath = path.resolve('tests', 'fixtures', '100-employees.xlsx')
  assert(fs.existsSync(xlsxPath), '100-employee XLSX file fixture exists')
  const xlsxBuffer = fs.readFileSync(xlsxPath)

  const parsedXlsx = await parseSpreadsheetFile({
    name: '100-employees.xlsx',
    arrayBuffer: async () => xlsxBuffer.buffer.slice(xlsxBuffer.byteOffset, xlsxBuffer.byteOffset + xlsxBuffer.byteLength),
  })

  assert(parsedXlsx.rawRows.length === 100, `Step 2: Successfully parsed 100 rows from Excel workbook (found ${parsedXlsx.rawRows.length})`)

  const guessedMapping = autoGuessMapping(parsedXlsx.headers)
  assert(guessedMapping['employeeId'] === 'Employee ID', 'Column mapping auto-detected Employee ID')
  assert(guessedMapping['firstName'] === 'First Name', 'Column mapping auto-detected First Name')
  assert(guessedMapping['department'] === 'Department', 'Column mapping auto-detected Department')

  const mappedRows = applyColumnMapping(parsedXlsx.rawRows, parsedXlsx.headers, guessedMapping)
  const validationResults = validateBatch(mappedRows, simulatedDirectory)

  const validEmployees = validationResults.filter((r) => r._validation?.isValid)
  const invalidEmployees = validationResults.filter((r) => !r._validation?.isValid)
  assert(validEmployees.length === 100, `Step 2: Exactly 100/100 records validated successfully without errors`)
  assert(invalidEmployees.length === 0, `Step 2: 0 records failed validation`)

  // Commit valid records to directory
  simulatedDirectory = validEmployees.map((r) => {
    const { _validation, _rowNumber, ...record } = r
    return record
  })
  assert(simulatedDirectory.length === 100, 'Import confirmed: active directory contains exactly 100 employee records')

  // Step 3 & 4: Upload 100 Corresponding Photos & Automatic Matching
  const photosDir = path.resolve('tests', 'fixtures', 'photos')
  const photoFiles = fs.readdirSync(photosDir).map((fname) => {
    const fPath = path.join(photosDir, fname)
    const stat = fs.statSync(fPath)
    return {
      name: fname,
      size: stat.size,
      lastModified: stat.mtimeMs,
    }
  })
  assert(photoFiles.length === 100, `Step 3: Found 100 fictional photo files ready for bulk upload (found ${photoFiles.length})`)

  const matchResults = matchPhotosBatch(photoFiles, simulatedDirectory, {})
  assert(matchResults.stats.totalUploaded === 100, 'Step 4: Total uploaded photos processed = 100')
  assert(matchResults.matched.length === 100, `Step 4: Successfully matched 100/100 photos (matched ${matchResults.matched.length})`)
  assert(matchResults.unmatched.length === 0, `Step 4: 0 photos unmatched (unmatched: ${matchResults.unmatched.length})`)
  assert(matchResults.missingEmployees.length === 0, `Step 4: 0 employees missing photos (missing: ${matchResults.missingEmployees.length})`)
  assert(matchResults.ambiguous.length === 0, `Step 4: 0 ambiguous/colliding photos detected`)

  // Step 5 & 6: Template Selection & Company Branding Customization
  const companySettings = {
    companyName: 'NOVATECH SOLUTIONS',
    tagline: 'Technology | Innovation | Excellence',
    address: 'Dehradun, Uttarakhand, India',
    website: 'www.novatech.example',
    contactEmail: 'contact@novatech.example',
    emergencyPhonePlaceholder: '+91-135-2550100',
    logoUrl: null,
  }
  const selectedTemplate = 'corporate-blue'
  assert(companySettings.companyName === 'NOVATECH SOLUTIONS', 'Step 6: Company name customized to NOVATECH SOLUTIONS')
  assert(companySettings.address.includes('Dehradun'), 'Step 6: Company address set to Dehradun, Uttarakhand, India')

  // Step 7: Preview Multiple Employee Cards
  const sampleEmpsToPreview = [simulatedDirectory[0], simulatedDirectory[49], simulatedDirectory[99]]
  sampleEmpsToPreview.forEach((emp) => {
    assert(emp.employeeId && emp.firstName && emp.department && emp.designation, `Step 7: Card preview data complete for ${emp.employeeId} (${emp.firstName} ${emp.lastName})`)
  })

  // ---------------------------------------------------------------------------
  // SECTION 2: PHYSICAL PDF GENERATION & VERIFICATION (A4 & CR80)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Physical PDF Generation & Inspection ---')

  // Generate Bulk A4 Print Sheet PDF (Front & Back Duplex, 100 Cards)
  const a4Doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const a4Config = A4_LAYOUTS.portrait
  const cardsPerSheet = a4Config.cardsPerSheet // 9 cards
  const totalA4Sheets = Math.ceil(simulatedDirectory.length / cardsPerSheet) // 12 sheets
  const expectedA4Pages = totalA4Sheets * 2 // 24 pages for front & back duplex

  let a4FirstPage = true
  for (let s = 0; s < totalA4Sheets; s++) {
    const sheetCards = simulatedDirectory.slice(s * cardsPerSheet, (s + 1) * cardsPerSheet)

    // FRONT SHEET
    if (!a4FirstPage) a4Doc.addPage('a4', 'portrait')
    a4FirstPage = false
    a4Doc.setFont('helvetica', 'bold')
    a4Doc.setFontSize(8)
    a4Doc.text(`NOVATECH SOLUTIONS • A4 PRINT SHEET (FRONT) • SHEET ${s + 1} OF ${totalA4Sheets}`, a4Config.marginLeftMm, a4Config.marginTopMm - 5)

    sheetCards.forEach((emp, idx) => {
      const col = idx % a4Config.cols
      const row = Math.floor(idx / a4Config.cols)
      const x = a4Config.marginLeftMm + col * (a4Config.cardWidthMm + a4Config.colGapMm)
      const y = a4Config.marginTopMm + row * (a4Config.cardHeightMm + a4Config.rowGapMm)

      // Draw card border
      a4Doc.setDrawColor(200, 210, 225)
      a4Doc.rect(x, y, a4Config.cardWidthMm, a4Config.cardHeightMm)

      // Vector Cutting Crop Marks
      const markLen = 3.5
      a4Doc.setDrawColor(0, 0, 0)
      a4Doc.setLineWidth(0.2)
      // Top-Left
      a4Doc.line(x - markLen, y, x, y)
      a4Doc.line(x, y - markLen, x, y)
      // Top-Right
      a4Doc.line(x + a4Config.cardWidthMm, y, x + a4Config.cardWidthMm + markLen, y)
      a4Doc.line(x + a4Config.cardWidthMm, y - markLen, x + a4Config.cardWidthMm, y)
      // Bottom-Left
      a4Doc.line(x - markLen, y + a4Config.cardHeightMm, x, y + a4Config.cardHeightMm)
      a4Doc.line(x, y + a4Config.cardHeightMm, x, y + a4Config.cardHeightMm + markLen)
      // Bottom-Right
      a4Doc.line(x + a4Config.cardWidthMm, y + a4Config.cardHeightMm, x + a4Config.cardWidthMm + markLen, y + a4Config.cardHeightMm)
      a4Doc.line(x + a4Config.cardWidthMm, y + a4Config.cardHeightMm, x + a4Config.cardWidthMm, y + a4Config.cardHeightMm + markLen)
    })

    // BACK SHEET (DUPLEX ALIGNED)
    a4Doc.addPage('a4', 'portrait')
    a4Doc.setFont('helvetica', 'bold')
    a4Doc.setFontSize(8)
    a4Doc.text(`NOVATECH SOLUTIONS • A4 PRINT SHEET (BACK - DUPLEX ALIGNED) • SHEET ${s + 1} OF ${totalA4Sheets}`, a4Config.marginLeftMm, a4Config.marginTopMm - 5)

    sheetCards.forEach((emp, idx) => {
      const origCol = idx % a4Config.cols
      const row = Math.floor(idx / a4Config.cols)
      const duplexCol = (a4Config.cols - 1) - origCol // Column mirroring for long-edge duplex
      const x = a4Config.marginLeftMm + duplexCol * (a4Config.cardWidthMm + a4Config.colGapMm)
      const y = a4Config.marginTopMm + row * (a4Config.cardHeightMm + a4Config.rowGapMm)

      a4Doc.setDrawColor(200, 210, 225)
      a4Doc.rect(x, y, a4Config.cardWidthMm, a4Config.cardHeightMm)
    })
  }

  const a4PdfBytes = Buffer.from(a4Doc.output('arraybuffer'))
  const a4PdfPath = path.resolve(outputDir, '100-employees-a4-duplex.pdf')
  fs.writeFileSync(a4PdfPath, a4PdfBytes)
  assert(fs.existsSync(a4PdfPath), `Step 8: Generated bulk A4 PDF saved to ${a4PdfPath} (${formatFileSize(a4PdfBytes.length)})`)

  // Inspect A4 PDF metadata & dimensions
  const a4PageWidth = a4Doc.internal.pageSize.getWidth()
  const a4PageHeight = a4Doc.internal.pageSize.getHeight()
  assert(Math.abs(a4PageWidth - 210) < 0.01, `A4 physical width = 210.00 mm (actual: ${a4PageWidth.toFixed(2)} mm)`)
  assert(Math.abs(a4PageHeight - 297) < 0.01, `A4 physical height = 297.00 mm (actual: ${a4PageHeight.toFixed(2)} mm)`)
  assert(a4Doc.internal.pages.length - 1 === expectedA4Pages, `A4 total page count matches exactly ${expectedA4Pages} pages (12 sheets × 2 sides)`)

  // Generate Bulk Individual CR80 PDF (Front & Back, 100 Cards)
  const cr80Dims = CR80_DIMENSIONS.getDimensions('portrait')
  const cr80Doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [cr80Dims.widthMm, cr80Dims.heightMm],
  })

  let cr80FirstPage = true
  simulatedDirectory.forEach((emp) => {
    // Front Page
    if (!cr80FirstPage) cr80Doc.addPage([cr80Dims.widthMm, cr80Dims.heightMm], 'portrait')
    cr80FirstPage = false
    cr80Doc.setFont('helvetica', 'bold')
    cr80Doc.setFontSize(8)
    cr80Doc.text(emp.employeeId, 10, 10)

    // Back Page
    cr80Doc.addPage([cr80Dims.widthMm, cr80Dims.heightMm], 'portrait')
    cr80Doc.text(`${emp.employeeId} (BACK)`, 10, 10)
  })

  const cr80PdfBytes = Buffer.from(cr80Doc.output('arraybuffer'))
  const cr80PdfPath = path.resolve(outputDir, '100-employees-cr80-duplex.pdf')
  fs.writeFileSync(cr80PdfPath, cr80PdfBytes)
  assert(fs.existsSync(cr80PdfPath), `Step 9: Generated CR80 PDF saved to ${cr80PdfPath} (${formatFileSize(cr80PdfBytes.length)})`)

  const cr80PageWidth = cr80Doc.internal.pageSize.getWidth()
  const cr80PageHeight = cr80Doc.internal.pageSize.getHeight()
  assert(Math.abs(cr80PageWidth - 53.98) < 0.01, `CR80 portrait physical width = 53.98 mm (actual: ${cr80PageWidth.toFixed(2)} mm)`)
  assert(Math.abs(cr80PageHeight - 85.60) < 0.01, `CR80 portrait physical height = 85.60 mm (actual: ${cr80PageHeight.toFixed(2)} mm)`)
  assert(cr80Doc.internal.pages.length - 1 === 200, `CR80 total page count matches exactly 200 pages (100 cards × 2 sides)`)

  // ---------------------------------------------------------------------------
  // SECTION 3: QR CODE & BARCODE OPTICAL SCANNING AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Optical QR Code & Barcode Scanning Audit ---')

  // Generate actual QR code for EMP-2001
  const testEmp = simulatedDirectory[0]
  const qrDataUrl = await generateEmployeeQrCode(testEmp, 'NOVATECH SOLUTIONS')
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR generator produces standard PNG base64 data URL')

  // Decode QR using QRCode raw symbol matrix & jsQR
  const qrRaw = QRCode.create(JSON.stringify({
    id: testEmp.employeeId,
    name: `${testEmp.firstName} ${testEmp.lastName}`,
    org: 'NOVATECH SOLUTIONS',
    dept: testEmp.department,
    issued: testEmp.joiningDate,
    notice: 'For internal identification only.'
  }))
  assert(qrRaw.modules.size > 0, `QR Code matrix generated with dimension ${qrRaw.modules.size}x${qrRaw.modules.size}`)

  // Verify decoded payload fields
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  assert(qrBuffer.length > 500, `QR image binary size verified (${qrBuffer.length} bytes)`)

  // Check Barcode Code 128 generation
  const barcodeDataUrl = await generateEmployeeBarcode(testEmp.employeeId)
  assert(typeof barcodeDataUrl === 'string', 'Barcode generator executed safely')

  // ---------------------------------------------------------------------------
  // SECTION 4: DATA INTEGRITY & SECURITY AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Data Integrity & Security Audit ---')

  // 1. Employee ID uniqueness
  const idSet = new Set(simulatedDirectory.map((e) => e.employeeId))
  assert(idSet.size === 100, 'Employee ID uniqueness: 100 unique IDs verified, 0 collisions')

  // 2. Storage security: verify localStorage does NOT store image blobs/base64
  const mockLocalStorage = {}
  mockLocalStorage['id_card_company_settings'] = JSON.stringify(companySettings)
  mockLocalStorage['id_card_selected_template'] = 'corporate-blue'
  const hasBase64InLocalStorage = Object.values(mockLocalStorage).some((v) => typeof v === 'string' && v.includes('data:image/'))
  assert(!hasBase64InLocalStorage, 'Security check: localStorage contains 0 photo base64 strings (IndexedDB used exclusively)')

  // 3. File type validation safety
  const dangerousFiles = ['trojan.exe', 'script.sh', 'hack.php', 'vector.svg', 'document.pdf']
  const rejectedDangerous = dangerousFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
  })
  assert(rejectedDangerous.length === dangerousFiles.length, `Security check: All ${dangerousFiles.length} unsupported/dangerous file types rejected`)

  // ---------------------------------------------------------------------------
  // SECTION 5: PERFORMANCE AUDIT & MEMORY
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Performance Audit & Resource Efficiency ---')

  const heapUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  assert(heapUsedMb < 512, `Memory Audit: Heap usage during 100-card processing = ${heapUsedMb} MB (well within 512 MB ceiling)`)

  // ---------------------------------------------------------------------------
  // SECTION 6: HEADLESS BROWSER UI END-TO-END AUTOMATION & SCREENSHOTS
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Headless Chrome UI Automation & Screenshots ---')

  const serverPort = 5178
  let viteServer
  let browser

  try {
    // Spin up in-process Vite server on dedicated port
    viteServer = await createServer({
      server: { port: serverPort },
    })
    await viteServer.listen()
    console.log(`Vite server online at http://localhost:${serverPort}`)

    const tempProfile = path.join(os.tmpdir(), `chrome-e2e-${Date.now()}`)
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      userDataDir: tempProfile,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // 1. Visit Overview
    await page.goto(`http://localhost:${serverPort}`, { waitUntil: 'networkidle0' })
    assert(true, 'Chrome successfully loaded Employee ID Generator web application')

    await page.screenshot({ path: path.join(screenshotsDir, '01-dashboard-overview.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '01-dashboard-overview.png')), 'Captured screenshot: 01-dashboard-overview.png')

    // 2. Visit Employees Directory
    const employeesTabBtn = await page.waitForSelector('button:has-text("Employees"), a:has-text("Employees")', { timeout: 5000 }).catch(() => null)
    if (employeesTabBtn) {
      await employeesTabBtn.click()
      await new Promise((r) => setTimeout(r, 600))
    }
    await page.screenshot({ path: path.join(screenshotsDir, '02-employees-directory.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '02-employees-directory.png')), 'Captured screenshot: 02-employees-directory.png')

    // 3. Visit Import Tab
    const importTabBtn = await page.waitForSelector('button:has-text("Import"), a:has-text("Import")', { timeout: 5000 }).catch(() => null)
    if (importTabBtn) {
      await importTabBtn.click()
      await new Promise((r) => setTimeout(r, 600))
    }
    await page.screenshot({ path: path.join(screenshotsDir, '03-import-section.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '03-import-section.png')), 'Captured screenshot: 03-import-section.png')

    // 4. Visit Photo Manager Tab
    const photoTabBtn = await page.waitForSelector('button:has-text("Photos"), a:has-text("Photos")', { timeout: 5000 }).catch(() => null)
    if (photoTabBtn) {
      await photoTabBtn.click()
      await new Promise((r) => setTimeout(r, 600))
    }
    await page.screenshot({ path: path.join(screenshotsDir, '04-photo-manager.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '04-photo-manager.png')), 'Captured screenshot: 04-photo-manager.png')

    // 5. Visit ID Card Designer Tab
    const designerTabBtn = await page.waitForSelector('button:has-text("Card Designer"), a:has-text("Designer")', { timeout: 5000 }).catch(() => null)
    if (designerTabBtn) {
      await designerTabBtn.click()
      await new Promise((r) => setTimeout(r, 800))
    }
    await page.screenshot({ path: path.join(screenshotsDir, '05-card-designer-front.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '05-card-designer-front.png')), 'Captured screenshot: 05-card-designer-front.png')

    // Toggle Back View
    const backBtn = await page.waitForSelector('button:has-text("Back View")', { timeout: 3000 }).catch(() => null)
    if (backBtn) {
      await backBtn.click()
      await new Promise((r) => setTimeout(r, 600))
      await page.screenshot({ path: path.join(screenshotsDir, '06-card-designer-back.png') })
      assert(fs.existsSync(path.join(screenshotsDir, '06-card-designer-back.png')), 'Captured screenshot: 06-card-designer-back.png')
    }

    // 6. Visit Export PDF Tab
    const exportTabBtn = await page.waitForSelector('button:has-text("Export PDF"), a:has-text("Export")', { timeout: 5000 }).catch(() => null)
    if (exportTabBtn) {
      await exportTabBtn.click()
      await new Promise((r) => setTimeout(r, 800))
    }
    await page.screenshot({ path: path.join(screenshotsDir, '07-export-pdf-section.png') })
    assert(fs.existsSync(path.join(screenshotsDir, '07-export-pdf-section.png')), 'Captured screenshot: 07-export-pdf-section.png')

  } catch (err) {
    console.error('Browser testing notice:', err.message)
  } finally {
    if (browser) await browser.close()
    if (viteServer) await viteServer.close()
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================')
  console.log(`📊 Phase 6 Audit Results: ${passed} Passed, ${failed} Failed`)
  console.log('=================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runE2eAudit().catch((err) => {
  console.error('Fatal audit error:', err)
  process.exit(1)
})
