import fs from 'node:fs'
import path from 'node:path'
import { jsPDF } from 'jspdf'
import { getCustomFieldsForSide } from '../src/utils/customFields.js'
import { CR80_DIMENSIONS } from '../src/utils/cardCanvasRenderer.js'

async function generateSamplePdf() {
  console.log('Generating Phase 3 Sample PDF with custom fields...')

  const artifactDir = 'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'

  // Sample record with diverse custom fields
  const sampleEmployee = {
    recordId: 'rec_sample_custom_01',
    organizationId: 'novatech',
    displayedId: 'EMP-3042',
    employeeId: 'EMP-3042',
    fullName: 'Ananya Deshmukh',
    department: 'Autonomous Systems',
    designation: 'Staff Robotics Engineer',
    bloodGroup: 'B+',
    joiningDate: '2026-02-15',
    customFields: {
      busRoute: 'North Metro Line 4',
      lockerNo: 'L-804 (West Wing)',
      projectCode: 'PROJECT-PHOENIX-V2',
      securityClearance: 'Level 4 (High Clearance)',
    },
  }

  const settings = {
    companyName: 'NOVATECH SOLUTIONS',
    tagline: 'Technology | Innovation | Excellence',
    address: 'Dehradun, Uttarakhand, India',
    website: 'www.novatech.example',
    contactEmail: 'security@novatech.example',
    emergencyPhonePlaceholder: '+91-98765-43210',
    customFieldPlacements: {
      busRoute: 'front',
      lockerNo: 'front',
      projectCode: 'back',
      securityClearance: 'back',
    },
  }

  const frontFields = getCustomFieldsForSide(sampleEmployee, 'front', settings, 'corporate-blue')
  const backFields = getCustomFieldsForSide(sampleEmployee, 'back', settings, 'corporate-blue')

  console.log('Resolved Front Custom Fields:', frontFields)
  console.log('Resolved Back Custom Fields:', backFields)

  // CR80 Portrait: 53.98 x 85.60 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [53.98, 85.60],
  })

  // Page 1: Front
  doc.setFillColor(15, 23, 42) // Dark Navy
  doc.rect(0, 0, 53.98, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('NOVATECH SOLUTIONS', 53.98 / 2, 7, { align: 'center' })
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Technology | Innovation | Excellence', 53.98 / 2, 11, { align: 'center' })

  // Photo placeholder circle
  doc.setFillColor(230, 240, 255)
  doc.circle(53.98 / 2, 27, 8, 'F')
  doc.setTextColor(37, 99, 235)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('AD', 53.98 / 2, 29.5, { align: 'center' })

  // Name & Title
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8.5)
  doc.text(sampleEmployee.fullName, 53.98 / 2, 40, { align: 'center' })
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text(sampleEmployee.designation, 53.98 / 2, 43.5, { align: 'center' })

  // Department Badge
  doc.setFillColor(219, 234, 254)
  doc.roundedRect(53.98 / 2 - 14, 45.5, 28, 4.5, 2, 2, 'F')
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.text(sampleEmployee.department.toUpperCase(), 53.98 / 2, 48.5, { align: 'center' })

  // Standard Metadata Rows
  let y = 54
  const lX = 5
  const rX = 48.98

  const drawRow = (label, val, isMono = false, isBold = false) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(148, 163, 184)
    doc.text(label.toUpperCase(), lX, y)
    doc.setFont(isMono ? 'courier' : 'helvetica', isBold ? 'bold' : 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(String(val), rX, y, { align: 'right' })
    y += 3.5
  }

  drawRow('ID NO:', sampleEmployee.displayedId, true, true)
  drawRow('BLOOD GROUP:', sampleEmployee.bloodGroup, false, true)
  drawRow('JOINED:', sampleEmployee.joiningDate, true)

  // Custom Fields on Front
  for (const f of frontFields) {
    drawRow(`${f.label}:`, f.value, false, true)
  }

  // Bottom Accent Bar
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 84, 53.98, 1.6, 'F')

  // Page 2: Back
  doc.addPage([53.98, 85.60], 'portrait')

  // Top Magnetic Stripe
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 53.98, 8, 'F')

  doc.setTextColor(30, 58, 138)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('OFFICIAL CREDENTIAL', 53.98 / 2, 13, { align: 'center' })

  // Terms
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(4.8)
  doc.setFont('helvetica', 'normal')
  doc.text('1. Property of NOVATECH SOLUTIONS. Non-transferable.', 5, 17.5)
  doc.text('2. Must be displayed on premises. Return upon cessation.', 5, 20.5)

  // Coordinates Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(4, 23, 45.98, 30, 2, 2, 'FD')

  let bY = 27
  const drawBackMeta = (lbl, val) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.2)
    doc.setTextColor(71, 85, 105)
    doc.text(lbl, 6, bY)
    doc.setFont('courier', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(val, 48, bY, { align: 'right' })
    bY += 3.8
  }

  drawBackMeta('HQ:', 'Dehradun, India')
  drawBackMeta('NET:', 'www.novatech.example')
  drawBackMeta('EMERGENCY:', '+91-98765-43210')

  // Custom Fields on Back
  for (const f of backFields) {
    drawBackMeta(`${f.label.toUpperCase()}:`, f.value)
  }

  // Signatures
  doc.setDrawColor(148, 163, 184)
  doc.line(6, 62, 22, 62)
  doc.line(32, 62, 48, 62)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.5)
  doc.setTextColor(148, 163, 184)
  doc.text('BEARER SIGNATURE', 14, 65, { align: 'center' })
  doc.text('AUTHORIZED SIGNATORY', 40, 65, { align: 'center' })

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 84, 53.98, 1.6, 'F')

  const pdfOutput = doc.output('arraybuffer')
  const targetPath = path.join(artifactDir, 'phase3_custom_fields_sample.pdf')
  fs.writeFileSync(targetPath, Buffer.from(pdfOutput))
  console.log(`✅ Sample PDF saved to: ${targetPath}`)
}

generateSamplePdf().catch((err) => {
  console.error('Failed to generate sample PDF:', err)
  process.exit(1)
})

