import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { createServer } from 'vite'

async function captureBackupWorkflows() {
  console.log('Starting Vite server on port 5197 for Phase 5 visual capture...')
  const server = await createServer({
    server: { port: 5197 },
  })
  await server.listen()
  const port = server.config.server.port || 5197
  console.log(`Vite server running on http://localhost:${port}`)

  const artifactDir = 'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'
  const tempDir = path.join(os.tmpdir(), `chrome-phase5-${Date.now()}`)

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960 })

    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' })

    // Inject initial snapshot info so Recovery tab shows active snapshot
    await page.evaluate(() => {
      localStorage.setItem(
        'idcard_recovery_snapshot_v1',
        JSON.stringify({
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          records: [{ recordId: 'snap_01' }, { recordId: 'snap_02' }],
          organizations: [{ id: 'novatech' }, { id: 'sidwal-railway' }],
          activeOrgId: 'novatech',
        })
      )
    })

    // Reload to refresh context
    await page.reload({ waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 800))

    // 1. Click "Backup & Restore" button in Header
    console.log('Opening Backup & Disaster Recovery Modal...')
    const backupBtnFound = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => b.textContent.includes('Backup & Restore') || b.textContent.includes('Backup'))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })

    if (!backupBtnFound) {
      throw new Error('Backup & Restore button not found in Header!')
    }

    await new Promise((r) => setTimeout(r, 600))

    // SCREENSHOT 1: Backup Export Tab
    const exportPath = path.join(artifactDir, 'phase5_backup_export_modal.png')
    await page.screenshot({ path: exportPath })
    console.log(`Saved screenshot 1: ${exportPath}`)

    // 2. Switch to "Restore Backup" Tab
    console.log('Switching to Restore Backup Tab...')
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Restore Backup'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    // Create a mock backup file on disk and upload it via file input
    const sampleBackupData = {
      schemaVersion: '2.1.0',
      applicationVersion: '2.1.0',
      exportedAt: new Date().toISOString(),
      platform: 'ID Card Management & Generation Platform',
      activeOrgId: 'novatech',
      organizations: [
        { id: 'novatech', name: 'Novatech Solutions' },
        { id: 'apex-university', name: 'Apex Institute of Technology' },
      ],
      records: [
        // Matching record with differing role (conflict)
        {
          recordId: 'rec_novatech_01',
          displayedId: 'EMP-1001',
          fullName: 'Aarav Sharma',
          department: 'Engineering',
          role: 'Principal Systems Architect',
          organizationId: 'novatech',
        },
        // Brand new record
        {
          recordId: 'rec_new_candidate_01',
          displayedId: 'EMP-3001',
          fullName: 'Kavita Raman',
          department: 'Cybersecurity',
          role: 'Security Operations Lead',
          organizationId: 'novatech',
        },
      ],
      photos: [],
      templateSettings: { selectedTemplateId: 'corporate-blue' },
      counts: { organizations: 2, records: 2, photos: 0 },
    }

    const tempJsonPath = path.join(tempDir, 'sample_restore_archive.json')
    fs.writeFileSync(tempJsonPath, JSON.stringify(sampleBackupData, null, 2))

    const fileInput = await page.$('input[type="file"]')
    if (fileInput) {
      await fileInput.uploadFile(tempJsonPath)
    }

    await new Promise((r) => setTimeout(r, 700))

    // SCREENSHOT 2: Restore Preview & Conflict Analysis Plan (Mode A: Merge & Update)
    const previewPath = path.join(artifactDir, 'phase5_restore_preview_plan.png')
    await page.screenshot({ path: previewPath })
    console.log(`Saved screenshot 2: ${previewPath}`)

    // 3. Select Mode B: Replace All
    console.log('Selecting Mode B: Replace All...')
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'))
      const replaceCard = cards.find((c) => c.textContent.includes('Mode B: Replace All'))
      if (replaceCard) replaceCard.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // SCREENSHOT 3: Replace All Destructive Warning & Confirmation Input
    const replacePath = path.join(artifactDir, 'phase5_replace_all_safety_warning.png')
    await page.screenshot({ path: replacePath })
    console.log(`Saved screenshot 3: ${replacePath}`)

    // 4. Switch to Safety Snapshot & Rollback Tab
    console.log('Switching to Safety Snapshot & Rollback Tab...')
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Safety Snapshot'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // SCREENSHOT 4: Safety Snapshot & Rollback Tab
    const snapshotPath = path.join(artifactDir, 'phase5_safety_snapshot_rollback.png')
    await page.screenshot({ path: snapshotPath })
    console.log(`Saved screenshot 4: ${snapshotPath}`)

    console.log('✅ All Phase 5 workflow screenshots captured successfully!')
  } finally {
    await browser.close()
    await server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

captureBackupWorkflows().catch((err) => {
  console.error('Workflow capture error:', err)
  process.exit(1)
})

