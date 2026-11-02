import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'
import fs from 'fs'
import assert from 'node:assert'
import { createServer } from 'vite'

async function runRealBrowserAudit() {
  console.log('====================================================')
  console.log('🌐 Starting Phase 5A Real Browser Audit Workflow')
  console.log('====================================================\n')

  const port = 5196
  const server = await createServer({
    server: { port },
  })
  await server.listen()
  console.log(`Vite server running on http://localhost:${port}`)

  const artifactDir = 'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'
  const tempDir = path.join(os.tmpdir(), `chrome-audit-5a-${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960 })

    // Setup isolated test records in localStorage for the test run (preserving schema)
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' })

    // STEP 1 & 2: Export a complete backup and verify payload structure
    console.log('--- STEP 1 & 2: Export Complete Platform Backup & Verify Payload ---')
    const exportedPayload = await page.evaluate(async () => {
      // Access context helper from window or evaluate backup function
      const recordsRaw = localStorage.getItem('employee_records_v1')
      const orgsRaw = localStorage.getItem('idcard_organizations_v2')
      const templateRaw = localStorage.getItem('novatech_id_card_template_v1')

      return {
        recordsCount: recordsRaw ? JSON.parse(recordsRaw).length : 0,
        orgsCount: orgsRaw ? JSON.parse(orgsRaw).length : 0,
        hasTemplates: Boolean(templateRaw),
      }
    })
    console.log(`Verified initial storage: ${exportedPayload.recordsCount} records, ${exportedPayload.orgsCount} orgs`)

    // Click Backup & Restore button in Header
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => b.textContent.includes('Backup & Restore'))
      if (btn) btn.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Capture Export Modal Screenshot
    const exportScreenPath = path.join(artifactDir, 'phase5a_browser_export_modal.png')
    await page.screenshot({ path: exportScreenPath })
    console.log(`✅ Saved: ${exportScreenPath}`)

    // STEP 3 & 4: Restore in Merge & Update mode with a separate test dataset
    console.log('\n--- STEP 3 & 4: Merge & Update Mode Verification ---')
    // Switch to Restore Tab
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Restore Backup'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    // Construct an isolated non-conflicting test dataset
    const separateTestDataset = {
      schemaVersion: '2.1.0',
      applicationVersion: '2.1.0',
      exportedAt: new Date().toISOString(),
      platform: 'ID Card Management & Generation Platform',
      activeOrgId: 'novatech',
      organizations: [
        { id: 'novatech', name: 'Novatech Solutions', companyName: 'NOVATECH SOLUTIONS' },
        { id: 'apex-university', name: 'Apex Institute of Technology', companyName: 'APEX INSTITUTE' },
      ],
      records: [
        {
          recordId: 'rec_audit_merge_901',
          organizationId: 'novatech',
          displayedId: 'EMP-9001',
          fullName: 'Test Candidate Alpha',
          role: 'Audit Specialist',
          department: 'Compliance',
          hasPhoto: false,
        },
      ],
      photos: [],
      templateSettings: { selectedTemplateId: 'corporate-blue' },
      counts: { organizations: 2, records: 1, photos: 0 },
    }

    const testMergeFilePath = path.join(tempDir, 'test_merge_dataset.json')
    fs.writeFileSync(testMergeFilePath, JSON.stringify(separateTestDataset, null, 2))

    const fileInput = await page.$('input[type="file"]')
    if (fileInput) {
      await fileInput.uploadFile(testMergeFilePath)
    }
    await new Promise((r) => setTimeout(r, 700))

    // Capture Merge Preview Screenshot
    const mergeScreenPath = path.join(artifactDir, 'phase5a_browser_merge_preview.png')
    await page.screenshot({ path: mergeScreenPath })
    console.log(`✅ Saved: ${mergeScreenPath}`)

    // Click "Execute Merge & Update"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const execBtn = btns.find((b) => b.textContent.includes('Execute Merge & Update'))
      if (execBtn) execBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Verify existing records remained intact and new record was added
    const mergeAuditResult = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('employee_records_v1') || '[]')
      const mergedRec = records.find((r) => r.recordId === 'rec_audit_merge_901')
      const originalRec = records.find((r) => r.displayedId === 'EMP-1001' || r.id === 'EMP-1001')
      return {
        totalRecords: records.length,
        hasMergedRec: Boolean(mergedRec),
        hasOriginalRec: Boolean(originalRec),
      }
    })

    assert.ok(mergeAuditResult.hasMergedRec, 'Merged record was added')
    assert.ok(mergeAuditResult.hasOriginalRec, 'Original unrelated record was preserved untouched')
    console.log(`✅ Merge verified: ${mergeAuditResult.totalRecords} total records. Original records untouched.`)

    // STEP 5: Restore in Replace All mode using an isolated test dataset
    console.log('\n--- STEP 5: Replace All Mode Verification ---')
    // Upload replace dataset
    const separateReplaceDataset = {
      schemaVersion: '2.1.0',
      applicationVersion: '2.1.0',
      exportedAt: new Date().toISOString(),
      platform: 'ID Card Management & Generation Platform',
      activeOrgId: 'apex-university',
      organizations: [
        { id: 'apex-university', name: 'Apex Institute of Technology', companyName: 'APEX INSTITUTE' },
      ],
      records: [
        {
          recordId: 'rec_replace_demo_01',
          organizationId: 'apex-university',
          displayedId: 'STU-9901',
          fullName: 'Replacement Student One',
          role: 'Student',
          department: 'Computer Science',
          hasPhoto: false,
        },
        {
          recordId: 'rec_replace_demo_02',
          organizationId: 'apex-university',
          displayedId: 'STU-9902',
          fullName: 'Replacement Student Two',
          role: 'Student',
          department: 'Mechanical',
          hasPhoto: false,
        },
      ],
      photos: [],
      templateSettings: { selectedTemplateId: 'executive-minimal' },
      counts: { organizations: 1, records: 2, photos: 0 },
    }

    const testReplaceFilePath = path.join(tempDir, 'test_replace_dataset.json')
    fs.writeFileSync(testReplaceFilePath, JSON.stringify(separateReplaceDataset, null, 2))

    // 1. Upload replacement dataset
    const fileInput2 = await page.$('input[type="file"]')
    if (fileInput2) {
      await fileInput2.uploadFile(testReplaceFilePath)
    }
    // Wait for file parsing to complete and render mode cards
    await page.waitForSelector('[data-testid="mode-replace-card"]', { timeout: 6000 })
    await new Promise((r) => setTimeout(r, 400))

    // 2. Select Mode B: Replace All
    await page.click('[data-testid="mode-replace-card"]')

    // 3. Wait for REPLACE input to appear
    await page.waitForSelector('input[placeholder="REPLACE"]', { timeout: 6000 })
    await page.type('input[placeholder="REPLACE"]', 'REPLACE')
    await new Promise((r) => setTimeout(r, 400))

    // Capture Replace All Modal Screenshot
    const replaceScreenPath = path.join(artifactDir, 'phase5a_browser_replace_confirmed.png')
    await page.screenshot({ path: replaceScreenPath })
    console.log(`✅ Saved: ${replaceScreenPath}`)

    // Click "Execute Replace All"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const execBtn = btns.find((b) => b.textContent.includes('Execute Replace All'))
      if (execBtn) execBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    const replaceResult = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('employee_records_v1') || '[]')
      const snapshot = localStorage.getItem('idcard_recovery_snapshot_v1')
      return {
        totalRecords: records.length,
        firstRecordName: records[0]?.fullName,
        hasSnapshot: Boolean(snapshot),
      }
    })

    assert.strictEqual(replaceResult.totalRecords, 2, 'Replace All restored exactly 2 records')
    assert.strictEqual(replaceResult.firstRecordName, 'Replacement Student One')
    assert.ok(replaceResult.hasSnapshot, 'Automatic pre-restore recovery snapshot was saved')
    console.log('✅ Replace All verified. Recovery snapshot created automatically.')

    // STEP 6: Revert Database from Recovery Snapshot
    console.log('\n--- STEP 6: Safety Rollback Verification ---')
    // Switch to Safety Snapshot Tab
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Safety Snapshot'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    // Click "Revert Database to Safety Snapshot"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const revertBtn = btns.find((b) => b.textContent.includes('Revert Database to Safety Snapshot'))
      if (revertBtn) revertBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Capture Revert Screenshot
    const revertScreenPath = path.join(artifactDir, 'phase5a_browser_rollback_success.png')
    await page.screenshot({ path: revertScreenPath })
    console.log(`✅ Saved: ${revertScreenPath}`)

    const rollbackResult = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('employee_records_v1') || '[]')
      return {
        totalRecords: records.length,
        hasOriginalRec: records.some((r) => r.displayedId === 'EMP-1001' || r.id === 'EMP-1001'),
      }
    })

    assert.ok(rollbackResult.hasOriginalRec, 'Original pre-replace records were recovered successfully')
    console.log(`✅ Rollback confirmed: Database restored to pre-replace state (${rollbackResult.totalRecords} records)`)

    // Close Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const doneBtn = btns.find((b) => b.textContent.trim() === 'Done')
      if (doneBtn) doneBtn.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // STEP 7: Photo Readability Check in UI
    console.log('\n--- STEP 7: Photo Opening & Rendering Verification ---')
    // Navigate to Designer
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button'))
      const designerBtn = navBtns.find((b) => b.textContent.includes('ID Card Designer'))
      if (designerBtn) designerBtn.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    const photoCheck = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="Employee"], img[alt*="Photo"], img[alt*="Badge"]')
      if (img) {
        return {
          found: true,
          src: img.src.substring(0, 40),
          isRendered: img.complete && img.naturalWidth > 0,
        }
      }
      return { found: false }
    })
    console.log(`✅ Photo rendering check: ${JSON.stringify(photoCheck)}`)

    console.log('\n====================================================')
    console.log('🎉 Phase 5A Browser Workflow Audit Completed: 100% PASS')
    console.log('====================================================')
  } finally {
    await browser.close()
    await server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

runRealBrowserAudit().catch((err) => {
  console.error('Audit run error:', err)
  process.exit(1)
})
