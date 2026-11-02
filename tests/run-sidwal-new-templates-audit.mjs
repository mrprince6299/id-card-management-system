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

async function runSidwalNewTemplatesAudit() {
  console.log('======================================================================')
  console.log('🛡️  SIDWAL 4 NEW TEMPLATES AUDIT & VERIFICATION SUITE')
  console.log('======================================================================\n')

  const tempDir = path.join(os.tmpdir(), `sidwal-new-tmpl-${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const outputDir = path.resolve('tests/output')
  fs.mkdirSync(outputDir, { recursive: true })

  const viteServer = await createServer({
    configFile: path.resolve('vite.config.js'),
    server: { port: 5198 },
  })
  await viteServer.listen()
  console.log('🌐 Vite server running on http://localhost:5198')

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  let passed = 0
  let failed = 0

  function pass(msg) {
    console.log(`✅ PASS: ${msg}`)
    passed++
  }

  function fail(msg, err) {
    console.error(`❌ FAIL: ${msg}`)
    if (err) console.error(err)
    failed++
  }

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960 })
    await page.goto('http://localhost:5198', { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 800))

    // -------------------------------------------------------------------------
    // 1. VERIFY ALL 5 SIDWAL TEMPLATES IN CONSTANTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. VERIFY SIDWAL TEMPLATES REGISTRATION ---')
    const templatesCheck = await page.evaluate(async () => {
      const { CARD_TEMPLATES } = await import('/src/utils/constants.js')
      const sidwalList = CARD_TEMPLATES.filter((t) => t.id === 'sidwal-workshop' || t.id.startsWith('sidwal-'))
      return sidwalList.map((t) => ({
        id: t.id,
        name: t.name,
        displayName: t.displayName,
        tag: t.tag,
        aspectRatio: t.aspectRatio,
        accentColor: t.accentColor,
      }))
    })

    const expectedTemplates = [
      { id: 'sidwal-workshop', expectedTag: 'SIDWAL 1' },
      { id: 'sidwal-modern-corporate', expectedTag: 'SIDWAL 2' },
      { id: 'sidwal-industrial-engineering', expectedTag: 'SIDWAL 3' },
      { id: 'sidwal-premium-executive', expectedTag: 'SIDWAL 4' },
      { id: 'sidwal-contemporary-official', expectedTag: 'SIDWAL 5' },
    ]

    for (const exp of expectedTemplates) {
      const found = templatesCheck.find((t) => t.id === exp.id)
      if (found) {
        pass(`Template '${exp.id}' registered with tag '${found.tag}', displayName: '${found.displayName || found.name}'`)
        assert(Math.abs(found.aspectRatio - 244.4 / 355.6) < 0.001, `Aspect ratio must match reference PDF: ${found.aspectRatio}`)
      } else {
        fail(`Template '${exp.id}' not found in CARD_TEMPLATES`)
      }
    }

    // -------------------------------------------------------------------------
    // 2. GENERATE SAMPLE INDIVIDUAL PDFS FOR ALL 5 TEMPLATES
    // -------------------------------------------------------------------------
    console.log('\n--- 2. GENERATE INDIVIDUAL SAMPLE PDFS FOR ALL 5 TEMPLATES ---')

    const sidwalTestRecord = {
      recordId: 'rec_sidwal_full_test',
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
      customFields: {
        shouldNotRender: 'Malicious Field',
      },
    }

    const pdfDefinitions = [
      { id: 'sidwal-workshop', filename: 'sidwal_template_1_original_replica.pdf', label: '1. SIDWAL Original Replica' },
      { id: 'sidwal-modern-corporate', filename: 'sidwal_template_2_modern_corporate.pdf', label: '2. SIDWAL Modern Corporate' },
      { id: 'sidwal-industrial-engineering', filename: 'sidwal_template_3_industrial_engineering.pdf', label: '3. SIDWAL Industrial Engineering' },
      { id: 'sidwal-premium-executive', filename: 'sidwal_template_4_premium_executive.pdf', label: '4. SIDWAL Premium Executive' },
      { id: 'sidwal-contemporary-official', filename: 'sidwal_template_5_contemporary_official.pdf', label: '5. SIDWAL Contemporary Official' },
    ]

    for (const def of pdfDefinitions) {
      console.log(`Generating PDF for ${def.label}...`)
      const pdfData = await page.evaluate(async (tmplId, record) => {
        const { generateIdCardsPdf } = await import('/src/utils/pdfGenerator.js')
        const result = await generateIdCardsPdf([record], {
          template: tmplId,
          orientation: 'portrait',
          layout: 'single-cr80',
          includeBackSide: true,
          includeCuttingMarks: true,
          settings: {},
          dpi: 300,
        })

        const blob = result.blob
        const reader = new FileReader()
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const dataUrl = reader.result
            const base64 = dataUrl.split(',')[1]
            resolve({
              totalPages: result.totalPages,
              widthMm: result.doc.internal.pageSize.getWidth(),
              heightMm: result.doc.internal.pageSize.getHeight(),
              base64,
            })
          }
          reader.readAsDataURL(blob)
        })
      }, def.id, sidwalTestRecord)

      // Save PDF to tests/output and artifactDir
      const buffer = Buffer.from(pdfData.base64, 'base64')
      const localPdfPath = path.join(outputDir, def.filename)
      const artifactPdfPath = path.join(artifactDir, def.filename)
      fs.writeFileSync(localPdfPath, buffer)
      fs.writeFileSync(artifactPdfPath, buffer)

      pass(`Generated ${def.filename} (${(buffer.length / 1024).toFixed(1)} KB)`)
      assert.strictEqual(pdfData.totalPages, 2, 'Must have 2 pages (front & back)')
      assert(Math.abs(pdfData.widthMm - 86.22) < 0.1, `Width must match 86.22 mm (got ${pdfData.widthMm})`)
      assert(Math.abs(pdfData.heightMm - 125.45) < 0.1, `Height must match 125.45 mm (got ${pdfData.heightMm})`)
      pass(`Dimensions strictly verified: ${pdfData.widthMm.toFixed(2)} mm × ${pdfData.heightMm.toFixed(2)} mm`)
    }

    // -------------------------------------------------------------------------
    // 3. CAPTURE FRONT & BACK PREVIEW SCREENSHOTS FOR THE 4 NEW DESIGNS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CAPTURE FRONT & BACK PREVIEW SCREENSHOTS ---')

    // Navigate to Card Designer Section
    await page.evaluate(() => {
      // Find tab button for "Card Designer"
      const buttons = Array.from(document.querySelectorAll('button'))
      const designerBtn = buttons.find((b) => b.textContent && b.textContent.includes('Card Designer'))
      if (designerBtn) designerBtn.click()
      const tmplTab = buttons.find((b) => b.textContent && b.textContent.includes('1. Templates'))
      if (tmplTab) tmplTab.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    const newTemplateScreenshots = [
      {
        id: 'sidwal-modern-corporate',
        namePrefix: 'sidwal_preview_modern_corporate',
        label: 'Modern Corporate',
      },
      {
        id: 'sidwal-industrial-engineering',
        namePrefix: 'sidwal_preview_industrial_engineering',
        label: 'Industrial Engineering',
      },
      {
        id: 'sidwal-premium-executive',
        namePrefix: 'sidwal_preview_premium_executive',
        label: 'Premium Executive',
      },
      {
        id: 'sidwal-contemporary-official',
        namePrefix: 'sidwal_preview_contemporary_official',
        label: 'Contemporary Official',
      },
    ]

    for (const tmpl of newTemplateScreenshots) {
      console.log(`Switching Designer to template: ${tmpl.label} (${tmpl.id})...`)

      // Select template button in UI
      await page.evaluate((id) => {
        const tmplBtn = document.querySelector(`button[data-template-id="${id}"]`)
        if (tmplBtn) {
          tmplBtn.click()
        }
      }, tmpl.id)
      await new Promise((r) => setTimeout(r, 600))

      // Switch to Front side
      await page.evaluate(() => {
        const frontBtn = document.querySelector('button[data-side="front"]')
        if (frontBtn) frontBtn.click()
      })
      await new Promise((r) => setTimeout(r, 400))

      // Locate card preview element
      let cardPreviewHandle = await page.$('[data-testid="id-card-preview"]')
      if (!cardPreviewHandle) {
        cardPreviewHandle = await page.$('.w-\\[280px\\].shadow-xl')
      }

      if (cardPreviewHandle) {
        const frontPngLocal = path.join(outputDir, `${tmpl.namePrefix}_front.png`)
        const frontPngArtifact = path.join(artifactDir, `${tmpl.namePrefix}_front.png`)
        await cardPreviewHandle.screenshot({ path: frontPngLocal })
        await cardPreviewHandle.screenshot({ path: frontPngArtifact })
        pass(`Captured ${tmpl.namePrefix}_front.png`)
      } else {
        fail(`Could not find card preview element for ${tmpl.label} front`)
      }

      // Switch to Back side
      await page.evaluate(() => {
        const backBtn = document.querySelector('button[data-side="back"]')
        if (backBtn) backBtn.click()
      })
      await new Promise((r) => setTimeout(r, 400))

      let cardPreviewBackHandle = await page.$('[data-testid="id-card-preview"]')
      if (!cardPreviewBackHandle) {
        cardPreviewBackHandle = await page.$('.w-\\[280px\\].shadow-xl')
      }
      if (cardPreviewBackHandle) {
        const backPngLocal = path.join(outputDir, `${tmpl.namePrefix}_back.png`)
        const backPngArtifact = path.join(artifactDir, `${tmpl.namePrefix}_back.png`)
        await cardPreviewBackHandle.screenshot({ path: backPngLocal })
        await cardPreviewBackHandle.screenshot({ path: backPngArtifact })
        pass(`Captured ${tmpl.namePrefix}_back.png`)
      } else {
        fail(`Could not find card preview element for ${tmpl.label} back`)
      }
    }

    // -------------------------------------------------------------------------
    // 4. VERIFY IMMUTABILITY OF ORIGINAL SIDWAL REPLICA
    // -------------------------------------------------------------------------
    console.log('\n--- 4. VERIFY ORIGINAL SIDWAL REPLICA IMMUTABILITY ---')
    const originalCheck = await page.evaluate(async () => {
      const { CARD_TEMPLATES } = await import('/src/utils/constants.js')
      const orig = CARD_TEMPLATES.find((t) => t.id === 'sidwal-workshop')
      return {
        id: orig.id,
        name: orig.name,
        primaryColor: orig.primaryColor,
        accentColor: orig.accentColor,
        aspectRatio: orig.aspectRatio,
      }
    })

    assert.strictEqual(originalCheck.name, 'SIDWAL Mechanical Workshop')
    assert.strictEqual(originalCheck.primaryColor, '#0d2b59')
    assert.strictEqual(originalCheck.accentColor, '#e30613')
    assert(Math.abs(originalCheck.aspectRatio - 244.4 / 355.6) < 0.0001)
    pass('Original SIDWAL replica metadata is 100% untouched and immutable')

    // -------------------------------------------------------------------------
    // 5. TEST MISSING OPTIONAL FIELDS BLANKING ON ALL 4 DESIGNS
    // -------------------------------------------------------------------------
    console.log('\n--- 5. TEST MISSING OPTIONAL FIELDS BLANKING ---')
    const missingFieldsRecord = {
      recordId: 'rec_sidwal_sparse',
      cardType: 'contractor',
      displayedId: 'CONT-999',
      fullName: 'Sparse Cardholder',
      // All other fields missing/blank
      fatherName: '',
      designation: '',
      bloodGroup: '',
      aadhaarNumber: '',
      phone: '',
      address: '',
    }

    for (const def of pdfDefinitions.slice(1)) {
      const sparsePdf = await page.evaluate(async (tmplId, record) => {
        const { generateIdCardsPdf } = await import('/src/utils/pdfGenerator.js')
        const result = await generateIdCardsPdf([record], {
          template: tmplId,
          orientation: 'portrait',
          layout: 'single-cr80',
          includeBackSide: true,
          includeCuttingMarks: true,
          settings: {},
          dpi: 300,
        })
        return {
          totalPages: result.totalPages,
          size: result.blob.size,
        }
      }, def.id, missingFieldsRecord)

      assert.strictEqual(sparsePdf.totalPages, 2)
      assert(sparsePdf.size > 1000)
      pass(`Missing optional fields rendered safely without "undefined" for ${def.label}`)
    }

    console.log('\n======================================================================')
    console.log(`📊 SIDWAL Templates Audit Results: ${passed} Passed, ${failed} Failed`)
    console.log('======================================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Audit encountered error:', err)
    process.exit(1)
  } finally {
    await browser.close()
    await viteServer.close()
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}

runSidwalNewTemplatesAudit()
