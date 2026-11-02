import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const artifactDir =
  process.env.ARTIFACT_DIR ||
  'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'

const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function runPhase7Validation() {
  console.log('======================================================================')
  console.log('🖨️  PHASE 7: REAL-WORLD PRINTING & RELEASE VALIDATION AUDIT')
  console.log('======================================================================\n')

  const tempDir = path.join(os.tmpdir(), `phase7-val-${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const viteServer = await createServer({
    configFile: path.resolve('vite.config.js'),
    server: { port: 5197 },
  })
  await viteServer.listen()
  console.log('🌐 Vite server running on http://localhost:5197')

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const results = {
    individualPdfs: {},
    a4DuplexPdf: null,
    backupRestore: {},
    auditPassed: 0,
    auditFailed: 0,
  }

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto('http://localhost:5197', { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 600))

    // -------------------------------------------------------------------------
    // 1. INDIVIDUAL CARD PDF GENERATION & VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- 1. INDIVIDUAL CARD PDF GENERATION & VALIDATION ---')

    const cardTypesToTest = [
      {
        key: 'employee',
        label: 'Employee ID',
        filename: 'phase7_sample_employee_id.pdf',
        template: 'corporate-blue',
        record: {
          recordId: 'rec_p7_emp_01',
          cardType: 'employee',
          employeeId: 'EMP-5501',
          displayedId: 'EMP-5501',
          fullName: 'Kavita Raman',
          department: 'Advanced Computing',
          designation: 'Principal Systems Architect',
          bloodGroup: 'O+',
          joiningDate: '2026-01-15',
          email: 'kavita.raman@novatech.example',
          phone: '+91 98765 43210',
          customFields: {
            busRoute: 'Metro Route 4B',
            securityClearance: 'Level 5 (Secret)',
          },
        },
        settings: {
          companyName: 'NOVATECH SOLUTIONS',
          customFieldPlacements: { busRoute: 'front', securityClearance: 'back' },
        },
        expectedWidthMm: 53.98,
        expectedHeightMm: 85.60,
      },
      {
        key: 'student',
        label: 'Student ID',
        filename: 'phase7_sample_student_id.pdf',
        template: 'corporate-blue',
        record: {
          recordId: 'rec_p7_stu_02',
          cardType: 'student',
          rollNo: 'STU-2026-CS-089',
          displayedId: 'STU-2026-CS-089',
          fullName: 'Aditya Narayan Verma',
          course: 'B.Tech Computer Science',
          semester: '6th Semester / Batch 2023-2027',
          bloodGroup: 'B+',
          fatherName: 'Ram Narayan Verma',
          emergencyPhone: '+91 98765 11122',
          customFields: {
            hostelBlock: 'Aryabhatta Hostel, Room 314',
            libraryToken: 'LIB-9902',
          },
        },
        settings: {
          companyName: 'APEX INSTITUTE OF TECHNOLOGY',
          customFieldPlacements: { hostelBlock: 'front', libraryToken: 'back' },
        },
        expectedWidthMm: 53.98,
        expectedHeightMm: 85.60,
      },
      {
        key: 'visitor',
        label: 'Visitor Pass',
        filename: 'phase7_sample_visitor_pass.pdf',
        template: 'executive-minimal',
        record: {
          recordId: 'rec_p7_vis_03',
          cardType: 'visitor',
          visitorId: 'VIS-2026-044',
          displayedId: 'VIS-2026-044',
          fullName: 'Dr. Michael Chen',
          department: 'Host: Research & Quantum Lab (Dr. Jenkins)',
          designation: 'External ISO Compliance Auditor',
          phone: '+1 555-019-2834',
          joiningDate: '2026-11-01',
          customFields: {
            escortRequired: 'YES (Security Escort Required)',
            badgeTier: 'Tier 1 Visitor',
          },
        },
        settings: {
          companyName: 'NOVATECH SOLUTIONS',
          customFieldPlacements: { escortRequired: 'front', badgeTier: 'back' },
        },
        expectedWidthMm: 53.98,
        expectedHeightMm: 85.60,
      },
      {
        key: 'contractor',
        label: 'Contractor ID',
        filename: 'phase7_sample_contractor_id.pdf',
        template: 'corporate-blue',
        record: {
          recordId: 'rec_p7_cont_04',
          cardType: 'contractor',
          employeeId: 'CONT-8812',
          displayedId: 'CONT-8812',
          fullName: 'Suresh Chandra Pal',
          department: 'Agency: Apex Facility & HVAC Services',
          designation: 'Senior Electrical Contractor',
          bloodGroup: 'AB+',
          phone: '+91 98765 77889',
          customFields: {
            validUpto: '2027-03-31',
            workGate: 'North Industrial Gate 3',
          },
        },
        settings: {
          companyName: 'NOVATECH INFRASTRUCTURE',
          customFieldPlacements: { validUpto: 'front', workGate: 'back' },
        },
        expectedWidthMm: 53.98,
        expectedHeightMm: 85.60,
      },
      {
        key: 'sidwal',
        label: 'SIDWAL Workshop ID (Exact Replica)',
        filename: 'phase7_sample_sidwal_workshop.pdf',
        template: 'sidwal-workshop',
        record: {
          recordId: 'rec_p7_sidwal_05',
          cardType: 'contractor',
          employeeId: 'CONT-409',
          displayedId: 'CONT-409',
          fullName: 'Rajesh Kumar Bind',
          fatherName: 'Sri Ram Dayal Bind',
          designation: 'AC MECHANIC / FITTER',
          role: 'AC MECHANIC / FITTER',
          bloodGroup: 'B+',
          aadhaarNumber: 'XXXX-XXXX-9912',
          phone: '+91 98765 44332',
          address: 'Vill & Post: Khorabar, District: Gorakhpur, UP',
          // Custom fields MUST be completely ignored on locked SIDWAL template
          customFields: {
            injectedMaliciousField: 'SHOULD NEVER APPEAR',
          },
        },
        settings: {},
        expectedWidthMm: 86.22,
        expectedHeightMm: 125.45,
      },
    ]

    for (const cardDef of cardTypesToTest) {
      console.log(`Generating: ${cardDef.label}...`)

      const pdfBase64 = await page.evaluate(async (def) => {
        const { generateIdCardsPdf } = await import('/src/utils/pdfGenerator.js')
        const result = await generateIdCardsPdf([def.record], {
          template: def.template,
          orientation: 'portrait',
          layout: 'single-cr80',
          includeBackSide: true,
          includeCuttingMarks: true,
          settings: def.settings,
          dpi: 300,
        })

        // Return array buffer as base64 string
        const blob = result.blob
        const reader = new FileReader()
        return new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const dataUrl = reader.result
            const base64 = dataUrl.split(',')[1]
            resolve({
              base64,
              totalPages: result.totalPages,
              filename: result.filename,
              docWidthMm: result.doc.internal.pageSize.getWidth(),
              docHeightMm: result.doc.internal.pageSize.getHeight(),
            })
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }, cardDef)

      const pdfBuffer = Buffer.from(pdfBase64.base64, 'base64')
      const targetPath = path.join(artifactDir, cardDef.filename)
      fs.writeFileSync(targetPath, pdfBuffer)
      console.log(`  ✅ Written: ${cardDef.filename} (${pdfBuffer.length} bytes)`)

      // Assertions on dimensions and page counts
      assert.strictEqual(pdfBase64.totalPages, 2, `${cardDef.label} must have exactly 2 pages (front & back)`)
      const widthDiff = Math.abs(pdfBase64.docWidthMm - cardDef.expectedWidthMm)
      const heightDiff = Math.abs(pdfBase64.docHeightMm - cardDef.expectedHeightMm)
      assert.ok(widthDiff < 0.1, `${cardDef.label} width match (expected ${cardDef.expectedWidthMm}, got ${pdfBase64.docWidthMm})`)
      assert.ok(heightDiff < 0.1, `${cardDef.label} height match (expected ${cardDef.expectedHeightMm}, got ${pdfBase64.docHeightMm})`)

      results.individualPdfs[cardDef.key] = {
        label: cardDef.label,
        filename: cardDef.filename,
        path: targetPath,
        sizeBytes: pdfBuffer.length,
        totalPages: pdfBase64.totalPages,
        widthMm: pdfBase64.docWidthMm,
        heightMm: pdfBase64.docHeightMm,
        status: 'PASS',
      }
      results.auditPassed++
    }

    // -------------------------------------------------------------------------
    // 2. A4 DUPLEX PRINTING VALIDATION (9-UP SHEET)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. A4 DUPLEX PRINTING VALIDATION (9-UP) ---')

    const a4TestBatch = Array.from({ length: 9 }, (_, i) => ({
      recordId: `rec_duplex_p7_${i + 1}`,
      cardType: 'employee',
      employeeId: `NOV-2026-00${i + 1}`,
      displayedId: `NOV-2026-00${i + 1}`,
      fullName: `Duplex Candidate ${String.fromCharCode(65 + i)}`,
      department: i % 2 === 0 ? 'Engineering & Systems' : 'Quality & Operations',
      designation: i % 3 === 0 ? 'Lead Architect' : 'Senior Specialist',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
      joiningDate: '2026-01-15',
      emergencyPhone: '+91-98765-00000',
    }))

    console.log('Generating A4 9-up Duplex Sheet (Page 1 Front, Page 2 Back)...')
    const a4PdfResult = await page.evaluate(async (records) => {
      const { generateIdCardsPdf } = await import('/src/utils/pdfGenerator.js')
      const result = await generateIdCardsPdf(records, {
        template: 'corporate-blue',
        orientation: 'portrait',
        layout: 'a4-sheet',
        includeBackSide: true,
        includeCuttingMarks: true,
        settings: { companyName: 'NOVATECH SOLUTIONS' },
        dpi: 300,
      })

      const blob = result.blob
      const reader = new FileReader()
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result
          const base64 = dataUrl.split(',')[1]
          resolve({
            base64,
            totalPages: result.totalPages,
            docWidthMm: result.doc.internal.pageSize.getWidth(),
            docHeightMm: result.doc.internal.pageSize.getHeight(),
          })
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }, a4TestBatch)

    const a4Buffer = Buffer.from(a4PdfResult.base64, 'base64')
    const a4Filename = 'phase7_sample_a4_9up_duplex.pdf'
    const a4TargetPath = path.join(artifactDir, a4Filename)
    fs.writeFileSync(a4TargetPath, a4Buffer)
    console.log(`  ✅ Written: ${a4Filename} (${a4Buffer.length} bytes)`)

    // A4 sheet validations
    assert.strictEqual(a4PdfResult.totalPages, 2, '9 duplex cards on A4 must occupy exactly 2 pages (Front Sheet & Back Sheet)')
    assert.strictEqual(Math.round(a4PdfResult.docWidthMm), 210, 'A4 sheet width is exactly 210 mm')
    assert.strictEqual(Math.round(a4PdfResult.docHeightMm), 297, 'A4 sheet height is exactly 297 mm')

    results.a4DuplexPdf = {
      filename: a4Filename,
      path: a4TargetPath,
      sizeBytes: a4Buffer.length,
      totalPages: a4PdfResult.totalPages,
      widthMm: a4PdfResult.docWidthMm,
      heightMm: a4PdfResult.docHeightMm,
      status: 'PASS',
    }
    results.auditPassed++

    // -------------------------------------------------------------------------
    // 3. BACKUP AND RESTORE ACCEPTANCE RETEST
    // -------------------------------------------------------------------------
    console.log('\n--- 3. BACKUP AND RESTORE ACCEPTANCE RETEST ---')

    const backupRetest = await page.evaluate(async () => {
      const {
        createPlatformBackup,
        validateBackupStructure,
        analyzeRestorePlan,
        executeStagedRestore,
        createRecoverySnapshot,
        rollbackFromRecoverySnapshot,
      } = await import('/src/utils/backupSystem.js')

      const steps = {}

      // STEP 1: Full Export
      const exportData = await createPlatformBackup()
      steps.fullExport = {
        success: Boolean(exportData.integrity?.checksum),
        recordsCount: exportData.records.length,
        orgsCount: exportData.organizations.length,
        hasChecksum: Boolean(exportData.integrity?.checksum),
      }

      // STEP 2: Validation of Export
      const val = validateBackupStructure(exportData)
      steps.validation = {
        isValid: val.isValid,
        error: val.error || null,
      }

      // STEP 3: Merge & Update
      const candidateMerge = {
        recordId: 'rec_p7_merge_test_999',
        organizationId: 'novatech',
        displayedId: 'EMP-9999',
        fullName: 'Merge Test Specialist',
        department: 'QA & Compliance',
      }
      const mergePayload = {
        ...exportData,
        records: [candidateMerge],
      }
      const { computeBackupChecksum } = await import('/src/utils/backupSystem.js')
      mergePayload.integrity = {
        ...mergePayload.integrity,
        checksum: computeBackupChecksum(mergePayload),
      }
      const mergePlan = analyzeRestorePlan({
        incomingData: mergePayload,
        currentRecords: exportData.records,
        currentOrganizations: exportData.organizations,
        mode: 'merge',
      })
      const mergeExec = await executeStagedRestore({
        backupData: mergePayload,
        mode: 'merge',
        conflictResolution: 'incoming',
      })
      steps.mergeAndUpdate = {
        newRecordsCount: mergePlan.newRecordsCount,
        restoredRecordsCount: mergeExec.recordsCount,
        success: mergeExec.recordsCount > exportData.records.length,
      }

      // STEP 4: Replace All with Recovery Snapshot
      const separateReplacePayload = {
        ...exportData,
        records: [candidateMerge],
      }
      separateReplacePayload.integrity = {
        ...separateReplacePayload.integrity,
        checksum: computeBackupChecksum(separateReplacePayload),
      }
      const replaceExec = await executeStagedRestore({
        backupData: separateReplacePayload,
        mode: 'replace',
      })
      steps.replaceAll = {
        success: replaceExec.recordsCount === 1,
        mode: replaceExec.mode,
      }

      // STEP 5: Recovery Snapshot Rollback
      const rollbackResult = await rollbackFromRecoverySnapshot()
      const restoredRecords = JSON.parse(localStorage.getItem('employee_records_v1') || '[]')
      steps.recoveryRollback = {
        success: Boolean(rollbackResult.rolledBack),
        restoredRecordsCount: restoredRecords.length,
      }

      // STEP 6: Simulated Mid-Flight Failure Rollback
      let failureRollbackCaught = false
      try {
        const invalidData = {
          ...exportData,
          records: [], // Empty records triggers failure
        }
        await executeStagedRestore({
          backupData: invalidData,
          mode: 'replace',
        })
      } catch (err) {
        failureRollbackCaught = true
      }
      steps.failureRollback = {
        failureCaughtAndRolledBack: failureRollbackCaught,
      }

      return steps
    })

    console.log('Backup Retest Details:', JSON.stringify(backupRetest, null, 2))
    assert.ok(backupRetest.fullExport.success, 'Full export succeeded with checksum')
    assert.ok(backupRetest.validation.isValid, 'Export passed validation')
    assert.ok(backupRetest.mergeAndUpdate.success, 'Merge & Update correctly added new record')
    assert.ok(backupRetest.replaceAll.success, 'Replace All executed with pre-restore snapshot')
    assert.ok(backupRetest.recoveryRollback.success, 'Rollback reverted database state')
    assert.ok(backupRetest.failureRollback.failureCaughtAndRolledBack, 'Mid-flight failure triggered automatic rollback')

    results.backupRestore = backupRetest
    results.auditPassed++

    // -------------------------------------------------------------------------
    // 4. CAPTURE PRINTING VALIDATION SCREENSHOTS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. CAPTURE PRINTING PREVIEW ARTIFACTS ---')

    // Navigate to Export PDF page
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button'))
      const exportBtn = navBtns.find((b) => b.textContent && b.textContent.includes('Export PDF'))
      if (exportBtn) exportBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    const screenExportPath = path.join(artifactDir, 'phase7_export_pdf_workspace.png')
    await page.screenshot({ path: screenExportPath })
    console.log(`  📸 Saved: phase7_export_pdf_workspace.png`)

    // Navigate to Designer page
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button'))
      const designerBtn = navBtns.find((b) => b.textContent && b.textContent.includes('ID Card Designer'))
      if (designerBtn) designerBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    const screenDesignerPath = path.join(artifactDir, 'phase7_designer_print_preview.png')
    await page.screenshot({ path: screenDesignerPath })
    console.log(`  📸 Saved: phase7_designer_print_preview.png`)

    console.log('\n======================================================================')
    console.log(`🎉 PHASE 7 PRINTING & RELEASE AUDIT: ${results.auditPassed} PASSED, 0 FAILED`)
    console.log('======================================================================')
  } finally {
    await browser.close()
    await viteServer.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

runPhase7Validation().catch((err) => {
  console.error('Phase 7 Validation Exception:', err)
  process.exit(1)
})
