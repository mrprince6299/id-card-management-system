import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { createServer } from 'vite'

async function capturePreviews() {
  console.log('Starting Vite server for Phase 3 visual capture...')
  const server = await createServer({
    server: { port: 5199 },
  })
  await server.listen()
  const port = server.config.server.port || 5199
  console.log(`Vite server running on http://localhost:${port}`)

  const artifactDir = 'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'
  const tempDir = path.join(os.tmpdir(), `chrome-prev-${Date.now()}`)

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' })

    // Inject a record with custom fields into localStorage
    await page.evaluate(() => {
      const existingRaw = localStorage.getItem('employee_records_v1')
      const records = existingRaw ? JSON.parse(existingRaw) : []
      const customRecord = {
        recordId: 'rec_custom_demo_99',
        organizationId: 'novatech',
        id: 'EMP-9901',
        employeeId: 'EMP-9901',
        displayedId: 'EMP-9901',
        firstName: 'Ananya',
        lastName: 'Deshmukh',
        fullName: 'Ananya Deshmukh',
        department: 'Autonomous Systems',
        role: 'Staff Robotics Engineer',
        designation: 'Staff Robotics Engineer',
        bloodGroup: 'B+',
        joiningDate: '2026-02-15',
        customFields: {
          busRoute: 'North Metro Line 4',
          lockerNo: 'L-804 (West Wing)',
          projectCode: 'PROJECT-PHOENIX-V2',
        },
      }
      records.unshift(customRecord)
      localStorage.setItem('employee_records_v1', JSON.stringify(records))
    })

    // Reload page to pick up updated record
    await page.reload({ waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 1000))

    // Click ID Card Designer in sidebar
    const allButtons = await page.$$('button')
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn)
      if (text && text.includes('ID Card Designer')) {
        await btn.click()
        break
      }
    }
    await new Promise((r) => setTimeout(r, 1500))

    // Select Ananya Deshmukh in preview dropdown if needed
    const selects = await page.$$('select')
    for (const sel of selects) {
      const options = await page.evaluate((el) => Array.from(el.options).map((o) => o.text), sel)
      if (options.some((o) => o.includes('Ananya'))) {
        const targetValue = await page.evaluate((el) => {
          const opt = Array.from(el.options).find((o) => o.text.includes('Ananya'))
          return opt ? opt.value : null
        }, sel)
        if (targetValue) {
          await sel.select(targetValue)
          await new Promise((r) => setTimeout(r, 600))
        }
        break
      }
    }

    // 1. Capture Front Preview with Custom Fields
    const frontPath = path.join(artifactDir, 'phase3_custom_fields_front_preview.png')
    const cardContainer = await page.$('.w-\\[280px\\], .shadow-xl')
    if (cardContainer) {
      await cardContainer.screenshot({ path: frontPath })
    } else {
      await page.screenshot({ path: frontPath })
    }
    console.log(`✅ Front preview captured: ${frontPath}`)

    // 2. Toggle to Back Side
    const buttonsAfterFront = await page.$$('button')
    for (const btn of buttonsAfterFront) {
      const text = await page.evaluate((el) => el.textContent, btn)
      if (text && (text.includes('Flip') || text.includes('Back'))) {
        await btn.click()
        break
      }
    }
    await new Promise((r) => setTimeout(r, 800))

    const backPath = path.join(artifactDir, 'phase3_custom_fields_back_preview.png')
    const backCardContainer = await page.$('.w-\\[280px\\], .shadow-xl')
    if (backCardContainer) {
      await backCardContainer.screenshot({ path: backPath })
    } else {
      await page.screenshot({ path: backPath })
    }
    console.log(`✅ Back preview captured: ${backPath}`)

    // 3. Switch to SIDWAL to verify visual regression immutability
    const headerSelect = await page.$('header select')
    if (headerSelect) {
      await headerSelect.select('sidwal-railway')
      await new Promise((r) => setTimeout(r, 1200))
    }

    const sidwalPath = path.join(artifactDir, 'phase3_sidwal_replica_verification.png')
    const sidwalCard = await page.$('.w-\\[280px\\], .shadow-xl')
    if (sidwalCard) {
      await sidwalCard.screenshot({ path: sidwalPath })
    } else {
      await page.screenshot({ path: sidwalPath })
    }
    console.log(`✅ SIDWAL verification preview captured: ${sidwalPath}`)

  } finally {
    await browser.close()
    await server.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (_) {}
  }
}

capturePreviews().catch((err) => {
  console.error('Capture error:', err)
  process.exit(1)
})
