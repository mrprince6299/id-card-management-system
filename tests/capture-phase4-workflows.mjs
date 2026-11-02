import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { createServer } from 'vite'

async function captureWorkflows() {
  console.log('Starting Vite server on port 5198 for Phase 4 visual capture...')
  const server = await createServer({
    server: { port: 5198 },
  })
  await server.listen()
  const port = server.config.server.port || 5198
  console.log(`Vite server running on http://localhost:${port}`)

  const artifactDir = 'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'
  const tempDir = path.join(os.tmpdir(), `chrome-phase4-${Date.now()}`)

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

    // Inject unassigned legacy records into localStorage so Tab 3 has records to display
    await page.evaluate(() => {
      const recordsRaw = localStorage.getItem('employee_records_v1')
      const records = recordsRaw ? JSON.parse(recordsRaw) : []
      const legacySample1 = {
        recordId: 'rec_unassigned_demo_01',
        organizationId: 'unassigned-legacy',
        displayedId: 'LEG-5001',
        employeeId: 'LEG-5001',
        id: 'LEG-5001',
        fullName: 'Vikramaditya Sengupta',
        role: 'Senior Plant Inspector',
        department: 'Operations',
        hasPhoto: true,
      }
      const legacySample2 = {
        recordId: 'rec_unassigned_demo_02',
        organizationId: 'unassigned-legacy',
        displayedId: 'LEG-5002',
        employeeId: 'LEG-5002',
        id: 'LEG-5002',
        fullName: 'Meenakshi Sundaram',
        role: 'Safety Officer',
        department: 'Quality Assurance',
        hasPhoto: false,
      }
      records.unshift(legacySample1, legacySample2)
      localStorage.setItem('employee_records_v1', JSON.stringify(records))
    })

    // Reload to refresh context
    await page.reload({ waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 800))

    // 1. Click "Manage" button in Header
    console.log('Opening Organization Manager Modal...')
    const manageBtnFound = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => b.textContent.includes('Manage'))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })

    if (!manageBtnFound) {
      throw new Error('Manage button not found in Header!')
    }

    await new Promise((r) => setTimeout(r, 600))

    // SCREENSHOT 1: Organization Manager List View
    const listPath = path.join(artifactDir, 'phase4_organizations_manager_list.png')
    await page.screenshot({ path: listPath })
    console.log(`Saved screenshot 1: ${listPath}`)

    // 2. Click "New Organization" Tab or Edit button
    console.log('Switching to Create/Edit Organization Tab...')
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('New Organization') || b.textContent.includes('Edit Organization'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // SCREENSHOT 2: Create / Edit Form with Live Card Preview
    const formPath = path.join(artifactDir, 'phase4_create_edit_organization_form.png')
    await page.screenshot({ path: formPath })
    console.log(`Saved screenshot 2: ${formPath}`)

    // 3. Switch to "Unassigned Records" Tab
    console.log('Switching to Unassigned Records Tab...')
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Unassigned Records'))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // SCREENSHOT 3: Unassigned Records & Reassignment Interface
    const unassignedPath = path.join(artifactDir, 'phase4_unassigned_records_reassignment.png')
    await page.screenshot({ path: unassignedPath })
    console.log(`Saved screenshot 3: ${unassignedPath}`)

    // 4. Test Deletion Safety Modal: Switch back to list, click delete on custom-org
    console.log('Testing Deletion Safety Modal...')
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'))
      const tab = tabBtns.find((b) => b.textContent.includes('Organizations ('))
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    await page.evaluate(() => {
      // Find delete button on an organization
      const deleteBtns = Array.from(document.querySelectorAll('button[title*="delete organization" i]'))
      if (deleteBtns.length > 0) {
        deleteBtns[0].click()
      }
    })
    await new Promise((r) => setTimeout(r, 500))

    // SCREENSHOT 4: Deletion Safety Modal
    const deletePath = path.join(artifactDir, 'phase4_deletion_safety_modal.png')
    await page.screenshot({ path: deletePath })
    console.log(`Saved screenshot 4: ${deletePath}`)

    console.log('✅ All Phase 4 workflow screenshots captured successfully!')
  } finally {
    await browser.close()
    await server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

captureWorkflows().catch((err) => {
  console.error('Workflow capture error:', err)
  process.exit(1)
})

