import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'

async function run() {
  const tempDir = path.join(os.tmpdir(), 'chrome-test-' + Date.now())
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userDataDir: tempDir,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  })
  console.log('Successfully launched Chrome:', await browser.version())
  await browser.close()
}

run().catch(err => {
  console.error('Launch error:', err.message)
  process.exit(1)
})

