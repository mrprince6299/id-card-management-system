import { generateEmployeeQrCode, generateEmployeeBarcode } from './codeGenerators.js'
import { SIDWAL_LOGO_BASE64 } from '../assets/sidwalLogo.js'
import { getCardTypeById, getDisplayId } from './cardTypes.js'
import { getCustomFieldsForSide } from './customFields.js'

/**
 * Bounds-safe text drawing utility with graceful ellipsis truncation.
 * Guarantees text never overflows card boundaries or overlays adjacent elements.
 */
export const drawTruncatedText = (ctx, text, x, y, maxWidth, align = 'right') => {
  const str = String(text || '').trim()
  ctx.textAlign = align
  if (!str) return
  if (ctx.measureText(str).width <= maxWidth) {
    ctx.fillText(str, x, y)
    return
  }
  let truncated = str
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  ctx.fillText(truncated + '...', x, y)
}

/**
 * Physical CR80 Card Dimensions (ISO/IEC 7810 ID-1 standard)
 */
export const CR80_DIMENSIONS = {
  widthMm: 85.6,
  heightMm: 53.98,
  getDimensions: (orientation = 'portrait') => {
    return orientation === 'portrait'
      ? { widthMm: 53.98, heightMm: 85.6 }
      : { widthMm: 85.6, heightMm: 53.98 }
  },
  getCardDimensions: (template = 'corporate-blue', orientation = 'portrait') => {
    if (template === 'sidwal-workshop' || template?.startsWith('sidwal-')) {
      return { widthMm: 86.22, heightMm: 125.45, aspectRatio: 244.4 / 355.6 }
    }
    return orientation === 'portrait'
      ? { widthMm: 53.98, heightMm: 85.6, aspectRatio: 53.98 / 85.6 }
      : { widthMm: 85.6, heightMm: 53.98, aspectRatio: 85.6 / 53.98 }
  },
  getCanvasPixels: (orientation = 'portrait', dpi = 300) => {
    const pxPerMm = dpi / 25.4
    const dims = orientation === 'portrait'
      ? { widthMm: 53.98, heightMm: 85.6 }
      : { widthMm: 85.6, heightMm: 53.98 }
    return {
      width: Math.round(dims.widthMm * pxPerMm),
      height: Math.round(dims.heightMm * pxPerMm),
      dpi,
      pxPerMm,
    }
  },
}

/**
 * Helper to safely load an image URL into an HTMLImageElement.
 */
export const loadImage = (src) => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Render a complete ID card to an HTML Canvas at exact 300 DPI resolution.
 * 
 * @param {Object} employee - Employee data object.
 * @param {Object} options - Rendering configuration.
 * @returns {Promise<HTMLCanvasElement>} Rendered canvas element.
 */
export const renderCardToCanvas = async (employee, options = {}) => {
  const {
    template = 'corporate-blue',
    orientation = 'portrait',
    side = 'front',
    photoUrl = '',
    settings = {},
    dpi = 300,
  } = options

  // Special exact replica engine for SIDWAL Mechanical Workshop
  if (template === 'sidwal-workshop') {
    return renderSidwalCardToCanvas(employee, options)
  }
  if (template === 'sidwal-modern-corporate') {
    return renderSidwalModernCorporateCardToCanvas(employee, options)
  }
  if (template === 'sidwal-industrial-engineering') {
    return renderSidwalIndustrialEngineeringCardToCanvas(employee, options)
  }
  if (template === 'sidwal-premium-executive') {
    return renderSidwalPremiumExecutiveCardToCanvas(employee, options)
  }
  if (template === 'sidwal-contemporary-official') {
    return renderSidwalContemporaryOfficialCardToCanvas(employee, options)
  }

  const { width, height, pxPerMm } = CR80_DIMENSIONS.getCanvasPixels(orientation, dpi)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const cardConfig = getCardTypeById(employee.cardType)
  const idLabel = cardConfig.idFieldLabel.toUpperCase()
  const empId = getDisplayId(employee) || employee.employeeId || employee.id || 'ID-XXXX'
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee Name'
  const designation = employee.designation || employee.role || 'Staff Member'
  const department = employee.department || 'Operations'
  const bloodGroup = employee.bloodGroup || 'O+'
  const joiningDate = employee.joiningDate || employee.issueDate || '2026-01-15'
  const companyName = settings.companyName || 'NOVATECH SOLUTIONS'
  const tagline = settings.tagline || 'Technology | Innovation | Excellence'
  const address = settings.address || 'Dehradun, Uttarakhand, India'
  const website = settings.website || 'www.novatech.example'
  const contactEmail = settings.contactEmail || 'contact@novatech.example'
  const emergencyPhone = employee.emergencyPhone || settings.emergencyPhonePlaceholder || '+XX-XXXXXXXXXX'

  // Pre-load images (photo, QR code, barcode, logo)
  const [photoImg, qrDataUrl, barcodeDataUrl, logoImg] = await Promise.all([
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
    generateEmployeeQrCode(employee, companyName),
    generateEmployeeBarcode(empId, { background: '#ffffff', lineColor: '#0f172a' }),
    settings.logoUrl ? loadImage(settings.logoUrl) : null,
  ])

  const [qrImg, barcodeImg] = await Promise.all([
    loadImage(qrDataUrl),
    loadImage(barcodeDataUrl),
  ])

  // Determine colors based on template
  const isDark = template === 'modern-tech' || template === 'tech-cyan'
  const isMinimal = template === 'executive-minimal' || template === 'executive-slate'

  // 1. BASE BACKGROUND FILL
  ctx.fillStyle = isDark ? '#0a0f1d' : '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // ==========================================================
  // A. FRONT SIDE RENDERING
  // ==========================================================
  if (side === 'front') {
    if (orientation === 'portrait') {
      // ---------------- PORTRAIT FRONT ----------------
      // Header Band
      const headerHeight = Math.round(height * 0.16)
      if (template === 'corporate-blue') {
        const grad = ctx.createLinearGradient(0, 0, width, headerHeight)
        grad.addColorStop(0, '#0f172a')
        grad.addColorStop(0.5, '#1e3a8a')
        grad.addColorStop(1, '#1e1b4b')
        ctx.fillStyle = grad
      } else if (isMinimal) {
        ctx.fillStyle = '#ffffff'
      } else {
        // Modern Tech
        const grad = ctx.createLinearGradient(0, 0, width, headerHeight)
        grad.addColorStop(0, '#020617')
        grad.addColorStop(0.5, '#083344')
        grad.addColorStop(1, '#020617')
        ctx.fillStyle = grad
      }
      ctx.fillRect(0, 0, width, headerHeight)

      if (isMinimal) {
        ctx.strokeStyle = '#e4e4e7'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, headerHeight)
        ctx.lineTo(width, headerHeight)
        ctx.stroke()
      }

      // Top Lanyard Slot
      ctx.fillStyle = isDark ? '#0f172a' : '#cbd5e1'
      const slotW = Math.round(100 * (dpi / 300))
      const slotH = Math.round(14 * (dpi / 300))
      ctx.beginPath()
      ctx.roundRect((width - slotW) / 2, Math.round(12 * (dpi / 300)), slotW, slotH, slotH / 2)
      ctx.fill()

      // Company Header / Logo
      const logoY = Math.round(headerHeight * 0.58)
      if (logoImg) {
        const lw = Math.min(width * 0.5, 200)
        const lh = (logoImg.height / logoImg.width) * lw
        ctx.drawImage(logoImg, (width - lw) / 2, logoY - lh / 2, lw, lh)
      } else {
        ctx.font = 'bold 22px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = isMinimal ? '#18181b' : '#ffffff'
        ctx.fillText(companyName, width / 2, logoY)

        ctx.font = '11px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#67e8f9' : isMinimal ? '#71717a' : '#93c5fd'
        ctx.fillText(tagline, width / 2, logoY + 18)
      }

      // Photo Frame
      const photoSize = Math.round(width * 0.42)
      const photoX = (width - photoSize) / 2
      const photoY = headerHeight + Math.round(25 * (dpi / 300))
      const centerX = photoX + photoSize / 2
      const centerY = photoY + photoSize / 2
      const radius = photoSize / 2

      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      if (photoImg) {
        ctx.drawImage(photoImg, photoX, photoY, photoSize, photoSize)
      } else {
        // Fallback Initials Placeholder
        ctx.fillStyle = isDark ? '#0f172a' : '#eff6ff'
        ctx.fillRect(photoX, photoY, photoSize, photoSize)
        ctx.font = 'bold 44px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isDark ? '#22d3ee' : '#2563eb'
        const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'ID'
        ctx.fillText(initials, centerX, centerY)
      }
      ctx.restore()

      // Photo Ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.lineWidth = 6
      ctx.strokeStyle = isDark ? '#06b6d4' : isMinimal ? '#3f3f46' : '#2563eb'
      ctx.stroke()

      // Employee Information Text
      const textStartY = photoY + photoSize + Math.round(35 * (dpi / 300))
      ctx.textAlign = 'center'
      ctx.font = 'bold 28px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(fullName, width / 2, textStartY)

      ctx.font = '16px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#22d3ee' : '#64748b'
      ctx.fillText(designation, width / 2, textStartY + 26)

      // Department Badge
      if (settings.showDepartment !== false) {
        ctx.font = 'bold 13px Arial, sans-serif'
        const deptText = department.toUpperCase()
        const textMetrics = ctx.measureText(deptText)
        const badgeW = textMetrics.width + 24
        const badgeH = 24
        const badgeX = (width - badgeW) / 2
        const badgeY = textStartY + 38

        ctx.fillStyle = isDark ? '#164e63' : '#dbeafe'
        ctx.beginPath()
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12)
        ctx.fill()

        ctx.fillStyle = isDark ? '#67e8f9' : '#1e40af'
        ctx.textBaseline = 'middle'
        ctx.fillText(deptText, width / 2, badgeY + badgeH / 2)
        ctx.textBaseline = 'alphabetic'
      }

      // Metadata Table (ID, Blood Group, Joining Date)
      const metaY = textStartY + 90
      ctx.font = '14px Arial, sans-serif'
      ctx.textAlign = 'left'

      // Left labels & right values
      const leftX = Math.round(width * 0.12)
      const rightX = Math.round(width * 0.88)

      let currentMetaY = metaY

      // ID Code
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.fillText(idLabel, leftX, currentMetaY)
      ctx.font = 'bold 15px monospace'
      ctx.textAlign = 'right'
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(empId, rightX, currentMetaY)
      currentMetaY += 24

      // Blood Group
      if (settings.showBloodGroup !== false && bloodGroup) {
        ctx.font = '14px Arial, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
        ctx.fillText('BLOOD GROUP', leftX, currentMetaY)
        ctx.font = 'bold 15px Arial, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillStyle = '#e11d48'
        ctx.fillText(bloodGroup, rightX, currentMetaY)
        currentMetaY += 24
      }

      // Joining Date
      if (settings.showJoiningDate !== false && joiningDate) {
        ctx.font = '14px Arial, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
        ctx.fillText('JOINING DATE', leftX, currentMetaY)
        ctx.font = '14px monospace'
        ctx.textAlign = 'right'
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155'
        ctx.fillText(joiningDate, rightX, currentMetaY)
        currentMetaY += 24
      }

      // Dynamic Custom Fields on Front (omitted for locked SIDWAL)
      const footerY = height - Math.round(110 * (dpi / 300))
      const frontCustomFields = getCustomFieldsForSide(employee, 'front', settings, template)
      for (const field of frontCustomFields) {
        if (currentMetaY >= footerY - 20) break
        ctx.font = '14px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
        drawTruncatedText(ctx, field.label.toUpperCase(), leftX, currentMetaY, (rightX - leftX) * 0.45, 'left')

        ctx.font = 'bold 14px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
        drawTruncatedText(ctx, field.value, rightX, currentMetaY, (rightX - leftX) * 0.52, 'right')
        currentMetaY += 24
      }

      // Bottom Barcode & QR Code
      ctx.fillStyle = isDark ? '#020617' : '#f8fafc'
      ctx.fillRect(0, footerY, width, height - footerY)

      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, footerY)
      ctx.lineTo(width, footerY)
      ctx.stroke()

      // Draw Barcode on left
      if (settings.showBarcode !== false && barcodeImg) {
        const bcW = Math.round(width * 0.58)
        const bcH = Math.round(48 * (dpi / 300))
        ctx.drawImage(barcodeImg, Math.round(width * 0.08), footerY + 16, bcW, bcH)
      }

      // Draw QR Code on right
      if (settings.showQrCode !== false && qrImg) {
        const qrSize = Math.round(68 * (dpi / 300))
        ctx.drawImage(qrImg, width - qrSize - Math.round(width * 0.08), footerY + 10, qrSize, qrSize)
      }

      // Bottom Colored Accent Strip
      ctx.fillStyle = isDark ? '#06b6d4' : isMinimal ? '#18181b' : '#2563eb'
      ctx.fillRect(0, height - Math.round(8 * (dpi / 300)), width, Math.round(8 * (dpi / 300)))
    } else {
      // ---------------- LANDSCAPE FRONT ----------------
      // Left side: Photo & Name | Right side: Company, Meta, Barcode, QR
      const colSplit = Math.round(width * 0.42)

      // Left Column Background
      if (template === 'corporate-blue') {
        const grad = ctx.createLinearGradient(0, 0, colSplit, height)
        grad.addColorStop(0, '#0f172a')
        grad.addColorStop(1, '#1e3a8a')
        ctx.fillStyle = grad
      } else if (isMinimal) {
        ctx.fillStyle = '#f4f4f5'
      } else {
        ctx.fillStyle = '#020617'
      }
      ctx.fillRect(0, 0, colSplit, height)

      // Lanyard Slot at top
      ctx.fillStyle = isDark ? '#0f172a' : '#cbd5e1'
      const slotW = Math.round(80 * (dpi / 300))
      const slotH = Math.round(12 * (dpi / 300))
      ctx.beginPath()
      ctx.roundRect((colSplit - slotW) / 2, 14, slotW, slotH, slotH / 2)
      ctx.fill()

      // Photo inside left column
      const photoSize = Math.round(colSplit * 0.6)
      const photoX = (colSplit - photoSize) / 2
      const photoY = Math.round(height * 0.16)
      const centerX = photoX + photoSize / 2
      const centerY = photoY + photoSize / 2
      const radius = photoSize / 2

      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (photoImg) {
        ctx.drawImage(photoImg, photoX, photoY, photoSize, photoSize)
      } else {
        ctx.fillStyle = isDark ? '#0f172a' : '#e0e7ff'
        ctx.fillRect(photoX, photoY, photoSize, photoSize)
        ctx.font = 'bold 36px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isDark ? '#22d3ee' : '#2563eb'
        ctx.fillText(fullName[0] || 'ID', centerX, centerY)
      }
      ctx.restore()

      // Photo Ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.lineWidth = 4
      ctx.strokeStyle = isDark ? '#06b6d4' : isMinimal ? '#3f3f46' : '#2563eb'
      ctx.stroke()

      // Left Column Text (Name & Role)
      ctx.textAlign = 'center'
      ctx.font = 'bold 22px Arial, sans-serif'
      ctx.fillStyle = isMinimal ? '#18181b' : '#ffffff'
      ctx.fillText(fullName, colSplit / 2, photoY + photoSize + 32)

      ctx.font = '14px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#67e8f9' : isMinimal ? '#71717a' : '#93c5fd'
      ctx.fillText(designation, colSplit / 2, photoY + photoSize + 56)

      // Right Column: Company Header & Metadata
      const rightMargin = colSplit + 35
      ctx.textAlign = 'left'
      ctx.font = 'bold 24px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(companyName, rightMargin, 55)

      ctx.font = '12px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#22d3ee' : '#64748b'
      ctx.fillText(tagline, rightMargin, 75)

      // Right Column Metadata
      let rY = 120
      const labelW = 140
      const drawMetaRow = (label, val, valColor) => {
        ctx.font = '13px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
        ctx.fillText(label, rightMargin, rY)
        ctx.font = 'bold 14px monospace'
        ctx.fillStyle = valColor || (isDark ? '#ffffff' : '#0f172a')
        ctx.fillText(val, rightMargin + labelW, rY)
        rY += 28
      }

      drawMetaRow(`${idLabel}:`, empId)
      if (settings.showDepartment !== false) drawMetaRow('DEPARTMENT:', department)
      if (settings.showBloodGroup !== false && bloodGroup) drawMetaRow('BLOOD GROUP:', bloodGroup, '#e11d48')
      if (settings.showJoiningDate !== false) drawMetaRow('JOINED:', joiningDate)

      // Dynamic Custom Fields in Landscape Front
      for (const field of frontCustomFields) {
        if (rY >= height - 100) break
        drawMetaRow(`${field.label.toUpperCase()}:`, field.value)
      }

      // Right Column Bottom Barcode & QR
      if (barcodeImg) {
        ctx.drawImage(barcodeImg, rightMargin, height - 90, 260, 52)
      }
      if (qrImg) {
        ctx.drawImage(qrImg, width - 110, height - 95, 75, 75)
      }
    }
  }

  // ==========================================================
  // B. BACK SIDE RENDERING
  // ==========================================================
  if (side === 'back') {
    if (orientation === 'portrait') {
      // ---------------- PORTRAIT BACK ----------------
      // Magnetic Stripe simulation
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, Math.round(50 * (dpi / 300)))

      // Title & Terms
      let bY = Math.round(80 * (dpi / 300))
      ctx.textAlign = 'center'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#38bdf8' : '#1e3a8a'
      ctx.fillText(companyName, width / 2, bY)

      bY += 20
      ctx.font = 'bold 12px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.fillText('OFFICIAL IDENTITY CREDENTIAL', width / 2, bY)

      bY += 35
      // Terms box
      ctx.textAlign = 'left'
      ctx.font = '12px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569'
      const termsX = Math.round(width * 0.1)
      const termsW = Math.round(width * 0.8)

      ctx.fillText('1. Property of NOVATECH SOLUTIONS. Non-transferable.', termsX, bY)
      bY += 22
      ctx.fillText('2. Display prominently while on company premises.', termsX, bY)
      bY += 22
      ctx.fillText('3. Surrender immediately upon termination of tenure.', termsX, bY)
      bY += 22
      ctx.font = 'italic 11px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.fillText('If found, please return by post to headquarters address.', termsX, bY)

      // Company Coordinates Box
      bY += 40
      const boxH = Math.round(150 * (dpi / 300))
      ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc'
      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(termsX, bY, termsW, boxH, 8)
      ctx.fill()
      ctx.stroke()

      let coordY = bY + 28
      ctx.font = 'bold 13px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a'
      ctx.fillText(`HQ: ${address}`, termsX + 16, coordY)
      coordY += 24

      ctx.font = '13px monospace'
      ctx.fillStyle = isDark ? '#ffffff' : '#2563eb'
      ctx.fillText(`PORTAL: ${website}`, termsX + 16, coordY)
      coordY += 24

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569'
      ctx.fillText(`EMAIL: ${contactEmail}`, termsX + 16, coordY)
      coordY += 26

      if (settings.showEmergencyContact !== false) {
        ctx.font = 'bold 13px Arial, sans-serif'
        ctx.fillStyle = '#e11d48'
        ctx.fillText(`EMERGENCY: ${emergencyPhone}`, termsX + 16, coordY)
        coordY += 24
      }

      // Dynamic Custom Fields in Portrait Back
      const backCustomFields = getCustomFieldsForSide(employee, 'back', settings, template)
      for (const field of backCustomFields) {
        if (coordY >= bY + boxH - 12) break
        ctx.font = 'bold 12px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a'
        drawTruncatedText(ctx, `${field.label.toUpperCase()}: ${field.value}`, termsX + 16, coordY, termsW - 32, 'left')
        coordY += 22
      }

      // Dual Signature Boxes
      bY += boxH + Math.round(50 * (dpi / 300))
      const sigW = Math.round(termsW * 0.44)

      if (settings.showSignatures !== false) {
        // Bearer Signature
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(termsX, bY)
        ctx.lineTo(termsX + sigW, bY)
        ctx.stroke()

        ctx.font = 'italic 18px "Brush Script MT", cursive, Georgia'
        ctx.fillStyle = isDark ? '#38bdf8' : '#1e3a8a'
        ctx.fillText(fullName.split(' ')[0] || 'Employee', termsX + 10, bY - 8)

        ctx.font = '10px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'
        ctx.fillText('CARDHOLDER SIGNATURE', termsX, bY + 16)

        // Authorized Stamp
        const authX = termsX + termsW - sigW
        ctx.beginPath()
        ctx.moveTo(authX, bY)
        ctx.lineTo(authX + sigW, bY)
        ctx.stroke()

        ctx.font = 'italic 18px Georgia, serif'
        ctx.fillStyle = isDark ? '#38bdf8' : '#1e3a8a'
        ctx.fillText('Novatech HR', authX + 10, bY - 8)

        ctx.font = '10px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'
        ctx.fillText('AUTHORIZED SIGNATORY', authX, bY + 16)
      }

      // Bottom QR verification mark
      if (settings.showQrCode !== false && qrImg) {
        const qrSize = Math.round(90 * (dpi / 300))
        ctx.drawImage(qrImg, (width - qrSize) / 2, height - qrSize - 40, qrSize, qrSize)

        ctx.textAlign = 'center'
        ctx.font = 'bold 11px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#38bdf8' : '#64748b'
        ctx.fillText('DIGITAL AUTHENTICATION KEY • 300 DPI', width / 2, height - 16)
      }

      // Bottom Strip
      ctx.fillStyle = isDark ? '#06b6d4' : isMinimal ? '#18181b' : '#2563eb'
      ctx.fillRect(0, height - Math.round(8 * (dpi / 300)), width, Math.round(8 * (dpi / 300)))
    } else {
      // ---------------- LANDSCAPE BACK ----------------
      // Left 60%: Terms & Contact | Right 40%: Signatures & QR
      ctx.fillStyle = isDark ? '#020617' : '#1e293b'
      ctx.fillRect(0, 0, width, 36)

      ctx.textAlign = 'center'
      ctx.font = 'bold 16px Arial, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(companyName, width / 2, 24)

      const leftW = Math.round(width * 0.55)
      let bY = 70
      ctx.textAlign = 'left'
      ctx.font = '12px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#cbd5e1' : '#334155'
      ctx.fillText('1. Property of NOVATECH SOLUTIONS. Non-transferable.', 35, bY)
      bY += 22
      ctx.fillText('2. Surrender immediately upon cessation of employment.', 35, bY)
      bY += 30

      ctx.font = 'bold 13px Arial, sans-serif'
      ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a'
      ctx.fillText(`HQ: ${address}`, 35, bY)
      bY += 22
      ctx.font = '12px monospace'
      ctx.fillText(`WEB: ${website} | EMAIL: ${contactEmail}`, 35, bY)
      bY += 22
      if (settings.showEmergencyContact !== false) {
        ctx.font = 'bold 13px Arial, sans-serif'
        ctx.fillStyle = '#e11d48'
        ctx.fillText(`EMERGENCY: ${emergencyPhone}`, 35, bY)
        bY += 22
      }

      // Dynamic Custom Fields in Landscape Back
      for (const field of backCustomFields) {
        if (bY >= height - 30) break
        ctx.font = '12px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a'
        drawTruncatedText(ctx, `${field.label.toUpperCase()}: ${field.value}`, 35, bY, leftW - 40, 'left')
        bY += 20
      }

      // Right Column Signatures & QR
      const rightX = leftW + 40
      if (qrImg) {
        ctx.drawImage(qrImg, rightX, 60, 110, 110)
      }
      if (settings.showSignatures !== false) {
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(rightX + 130, 130)
        ctx.lineTo(width - 35, 130)
        ctx.stroke()
        ctx.font = '10px Arial, sans-serif'
        ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'
        ctx.fillText('AUTHORIZED SIGNATORY', rightX + 130, 146)
      }
    }
  }

  return canvas
}

/**
 * Render exact replica of SIDWAL Mechanical Workshop ID card at 300 DPI.
 * Preserves exact measured reference PDF boundary (86.22 mm x 125.45 mm, aspect ratio 244.4 / 355.6).
 */
export async function renderSidwalCardToCanvas(employee, options = {}) {
  const {
    side = 'front',
    photoUrl = '',
    dpi = 300,
  } = options

  const pxPerMm = dpi / 25.4
  const widthMm = 86.22
  const heightMm = 125.45
  const width = Math.round(widthMm * pxPerMm)
  const height = Math.round(heightMm * pxPerMm)
  const scale = width / 637

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const empId = employee.employeeId || employee.id || ''
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || ''
  const designation = employee.designation || employee.role || ''
  const fatherName = employee.fatherName || employee.father_name || ''
  const bloodGroup = employee.bloodGroup || ''
  const aadhaar = employee.aadhaarNumber || employee.aadhaar || employee.aadhar || ''
  const phone = employee.phone || ''
  const empAddress = employee.address || ''

  const [sidwalLogoImg, photoImg] = await Promise.all([
    loadImage(SIDWAL_LOGO_BASE64),
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
  ])

  // 1. Base Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 2. Outer Card Border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(2, Math.round(2 * scale))
  const cornerRadius = Math.round(20 * scale)
  ctx.beginPath()
  ctx.roundRect(1, 1, width - 2, height - 2, cornerRadius)
  ctx.stroke()

  if (side === 'front') {
    // ---------------- FRONT SIDE ----------------
    // Top Logo
    if (sidwalLogoImg) {
      const logoW = Math.round(width * 0.44)
      const logoH = Math.round(logoW * (104 / 400))
      const logoX = (width - logoW) / 2
      const logoY = Math.round(height * 0.04)
      ctx.drawImage(sidwalLogoImg, logoX, logoY, logoW, logoH)
    }

    // Headings
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1e293b'
    ctx.font = `bold ${Math.round(20 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('MECHANICAL WORKSHOP GORAKHPUR', width / 2, Math.round(height * 0.185))

    ctx.fillStyle = '#0d2b59'
    ctx.font = `900 ${Math.round(23 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('NORTH EASTERN RAILWAY', width / 2, Math.round(height * 0.225))

    ctx.fillStyle = '#334155'
    ctx.font = `bold ${Math.round(17 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('SIDWAL REFRIGERATION INDUSTRIES(P) LTD', width / 2, Math.round(height * 0.265))

    // Red horizontal accent divider
    ctx.fillStyle = '#e30613'
    const redBarY = Math.round(height * 0.295)
    ctx.fillRect(0, redBarY, width, Math.max(3, Math.round(4.5 * scale)))

    // Photo Box (scaled exactly to reference bounds)
    const photoW = Math.round(width * 0.34)
    const photoH = Math.round(height * 0.25)
    const photoX = (width - photoW) / 2
    const photoY = redBarY + Math.round(14 * scale)

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.strokeRect(photoX, photoY, photoW, photoH)
    } else {
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(photoX, photoY, photoW, photoH)
      ctx.setLineDash([])
    }

    // Section Heading (Cleanly below photo)
    ctx.fillStyle = '#e30613'
    ctx.font = `bold ${Math.round(20 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    const idCardTitleY = photoY + photoH + Math.round(26 * scale)
    ctx.fillText('I D E N T I T Y   C A R D', width / 2, idCardTitleY)

    // Dynamic Fields Table
    ctx.textAlign = 'left'
    const labelX = Math.round(width * 0.12)
    const colonX = Math.round(width * 0.42)
    const valX = Math.round(width * 0.45)
    const lineStep = Math.round(height * 0.048)
    let curY = idCardTitleY + Math.round(28 * scale)

    const drawRow = (label, value) => {
      ctx.fillStyle = '#0d2b59'
      ctx.font = `bold ${Math.round(18 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, labelX, curY)
      ctx.fillText(':', colonX, curY)
      ctx.fillStyle = '#000000'
      ctx.fillText(value || '', valX, curY)
      curY += lineStep
    }

    drawRow('ID NO.', empId)
    drawRow('NAME', fullName)
    drawRow('FATHER NAME', fatherName)
    drawRow('DESIGNATION', designation)

    // Footer & Signatures
    const footerY = Math.round(height * 0.885)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, footerY, width, height - footerY)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const sigLineY = Math.round(height * 0.925)
    const sigTextY = Math.round(height * 0.955)

    // Left Signature
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.10, sigLineY)
    ctx.lineTo(width * 0.43, sigLineY)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#475569'
    ctx.font = `bold ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('CARD HOLDER SIGN', width * 0.265, sigTextY)

    // Right Signature
    ctx.beginPath()
    ctx.moveTo(width * 0.57, sigLineY)
    ctx.lineTo(width * 0.90, sigLineY)
    ctx.stroke()
    ctx.fillText('CONTRACTOR SIGN', width * 0.735, sigTextY)
  } else {
    // ---------------- BACK SIDE ----------------
    // Top Navy Header Bar
    const headerH = Math.round(height * 0.125)
    ctx.fillStyle = '#0d2b59'
    ctx.fillRect(0, 0, width, headerH)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(21 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('C A R D H O L D E R   D E T A I L S', width / 2, headerH / 2)
    ctx.textBaseline = 'alphabetic'

    // Red horizontal accent strip
    ctx.fillStyle = '#e30613'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Dynamic Personal Details
    ctx.textAlign = 'left'
    const labelX = Math.round(width * 0.08)
    const valX = Math.round(width * 0.46)
    let curY = Math.round(height * 0.28)
    const lineStep = Math.round(height * 0.075)

    const drawBackRow = (label, value) => {
      ctx.fillStyle = '#0d2b59'
      ctx.font = `bold ${Math.round(18 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, labelX, curY)
      ctx.fillStyle = '#000000'
      ctx.fillText(value || '', valX, curY)
      curY += lineStep
    }

    drawBackRow('BLOOD GROUP :', bloodGroup)
    drawBackRow('AADHAAR NO. :', aadhaar)
    drawBackRow('MOBILE NO. :', phone)

    // Address row with clean wrapping
    ctx.fillStyle = '#0d2b59'
    ctx.font = `bold ${Math.round(18 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('ADDRESS :', labelX, curY)
    ctx.fillStyle = '#000000'

    if (empAddress) {
      const words = empAddress.split(' ')
      let currentLine = ''
      const maxW = width * 0.50
      const lineHeight = Math.round(22 * scale)
      let addrY = curY
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(currentLine, valX, addrY)
          currentLine = word
          addrY += lineHeight
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, valX, addrY)
      }
    }

    // Bottom Right Signatory
    const sigLineY = Math.round(height * 0.885)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.48, sigLineY)
    ctx.lineTo(width * 0.92, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    const sigCenterX = width * 0.70
    ctx.fillStyle = '#0d2b59'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('AUTHORIZED SIGNATORY', sigCenterX, sigLineY + Math.round(24 * scale))

    ctx.fillStyle = '#64748b'
    ctx.font = `italic ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('Name & Designation', sigCenterX, sigLineY + Math.round(42 * scale))
  }

  return canvas
}

/**
 * Render SIDWAL Design 1: Modern Corporate
 */
export const renderSidwalModernCorporateCardToCanvas = async (employee, options = {}) => {
  const {
    side = 'front',
    photoUrl = '',
    dpi = 300,
  } = options

  const pxPerMm = dpi / 25.4
  const widthMm = 86.22
  const heightMm = 125.45
  const width = Math.round(widthMm * pxPerMm)
  const height = Math.round(heightMm * pxPerMm)
  const scale = width / 637

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const empId = employee.employeeId || employee.id || ''
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || ''
  const designation = employee.designation || employee.role || ''
  const fatherName = employee.fatherName || employee.father_name || ''
  const bloodGroup = employee.bloodGroup || ''
  const aadhaar = employee.aadhaarNumber || employee.aadhaar || employee.aadhar || ''
  const phone = employee.phone || ''
  const empAddress = employee.address || ''

  const [sidwalLogoImg, photoImg] = await Promise.all([
    loadImage(SIDWAL_LOGO_BASE64),
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
  ])

  // Base background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Outer Border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(2, Math.round(2 * scale))
  const cornerRadius = Math.round(16 * scale)
  ctx.beginPath()
  ctx.roundRect(1, 1, width - 2, height - 2, cornerRadius)
  ctx.stroke()

  if (side === 'front') {
    // ---------------- FRONT SIDE: MODERN CORPORATE ----------------
    // Navy Header Bar
    const headerH = Math.round(height * 0.17)
    ctx.fillStyle = '#0d2b59'
    ctx.fillRect(0, 0, width, headerH)

    // White badge for logo
    if (sidwalLogoImg) {
      const plateW = Math.round(width * 0.46)
      const plateH = Math.round(height * 0.046)
      const plateX = (width - plateW) / 2
      const plateY = Math.round(height * 0.02)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(plateX, plateY, plateW, plateH, Math.round(8 * scale))
      ctx.fill()

      const logoW = Math.round(plateW * 0.85)
      const logoH = Math.round(logoW * (104 / 400))
      const logoX = plateX + (plateW - logoW) / 2
      const logoY = plateY + (plateH - logoH) / 2
      ctx.drawImage(sidwalLogoImg, logoX, logoY, logoW, logoH)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#cbd5e1'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('MECHANICAL WORKSHOP GORAKHPUR', width / 2, Math.round(height * 0.095))

    ctx.fillStyle = '#ffffff'
    ctx.font = `900 ${Math.round(21 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('NORTH EASTERN RAILWAY', width / 2, Math.round(height * 0.125))

    ctx.fillStyle = '#e2e8f0'
    ctx.font = `600 ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('SIDWAL REFRIGERATION INDUSTRIES (P) LTD', width / 2, Math.round(height * 0.152))

    // Scarlet Red divider
    ctx.fillStyle = '#e30613'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Photo Box
    const photoW = Math.round(width * 0.35)
    const photoH = Math.round(height * 0.24)
    const photoX = (width - photoW) / 2
    const photoY = headerH + Math.round(22 * scale)

    if (photoImg) {
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoW, photoH, Math.round(12 * scale))
      ctx.clip()
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH)
      ctx.restore()

      ctx.strokeStyle = '#0d2b59'
      ctx.lineWidth = Math.max(2, Math.round(2.5 * scale))
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoW, photoH, Math.round(12 * scale))
      ctx.stroke()
    } else {
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoW, photoH, Math.round(12 * scale))
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Title Badge
    const titleBadgeY = photoY + photoH + Math.round(24 * scale)
    const badgeW = Math.round(width * 0.44)
    const badgeH = Math.round(height * 0.034)
    const badgeX = (width - badgeW) / 2
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.roundRect(badgeX, titleBadgeY - Math.round(badgeH * 0.65), badgeW, badgeH, Math.round(badgeH / 2))
    ctx.fill()
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#0d2b59'
    ctx.font = `900 ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('IDENTITY CARD', width / 2, titleBadgeY)

    // Corporate Structured Card for Fields
    const cardX = Math.round(width * 0.06)
    const cardW = width - (cardX * 2)
    const cardY = titleBadgeY + Math.round(20 * scale)
    const cardH = Math.round(height * 0.22)

    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, Math.round(14 * scale))
    ctx.fill()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = 'left'
    const labelX = cardX + Math.round(cardW * 0.06)
    const colonX = cardX + Math.round(cardW * 0.40)
    const valX = cardX + Math.round(cardW * 0.44)
    const lineStep = Math.round(cardH * 0.23)
    let curY = cardY + Math.round(cardH * 0.23)

    const drawRow = (label, value) => {
      ctx.fillStyle = '#0d2b59'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, labelX, curY)
      ctx.fillText(':', colonX, curY)
      ctx.fillStyle = '#020617'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(value || '', valX, curY)
      curY += lineStep
    }

    drawRow('ID NO.', empId)
    drawRow('NAME', fullName)
    drawRow('FATHER NAME', fatherName)
    drawRow('DESIGNATION', designation)

    // Footer Signatures
    const footerY = Math.round(height * 0.885)
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, footerY, width, height - footerY)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const sigLineY = Math.round(height * 0.925)
    const sigTextY = Math.round(height * 0.955)

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.10, sigLineY)
    ctx.lineTo(width * 0.43, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#475569'
    ctx.font = `bold ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('CARD HOLDER SIGN', width * 0.265, sigTextY)

    ctx.beginPath()
    ctx.moveTo(width * 0.57, sigLineY)
    ctx.lineTo(width * 0.90, sigLineY)
    ctx.stroke()
    ctx.fillText('CONTRACTOR SIGN', width * 0.735, sigTextY)
  } else {
    // ---------------- BACK SIDE: MODERN CORPORATE ----------------
    const headerH = Math.round(height * 0.125)
    ctx.fillStyle = '#0d2b59'
    ctx.fillRect(0, 0, width, headerH)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(20 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CARDHOLDER DETAILS', width / 2, headerH / 2)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#e30613'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Rounded Info Cards
    const boxX = Math.round(width * 0.06)
    const boxW = width - (boxX * 2)
    let curY = Math.round(height * 0.18)
    const boxH = Math.round(height * 0.08)
    const gap = Math.round(height * 0.02)

    const drawBox = (label, value, isPill = false) => {
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.roundRect(boxX, curY, boxW, boxH, Math.round(10 * scale))
      ctx.fill()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.textAlign = 'left'
      ctx.fillStyle = '#0d2b59'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, boxX + Math.round(16 * scale), curY + Math.round(boxH * 0.58))

      ctx.textAlign = 'right'
      if (isPill && value) {
        const pillW = Math.round(boxW * 0.22)
        const pillH = Math.round(boxH * 0.60)
        const pillX = boxX + boxW - pillW - Math.round(12 * scale)
        const pillY = curY + (boxH - pillH) / 2
        ctx.fillStyle = '#fee2e2'
        ctx.beginPath()
        ctx.roundRect(pillX, pillY, pillW, pillH, Math.round(6 * scale))
        ctx.fill()
        ctx.strokeStyle = '#fca5a5'
        ctx.stroke()
        ctx.fillStyle = '#b91c1c'
        ctx.font = `900 ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(value, pillX + pillW / 2, pillY + Math.round(pillH * 0.68))
      } else {
        ctx.fillStyle = '#0f172a'
        ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
        ctx.fillText(value || '', boxX + boxW - Math.round(16 * scale), curY + Math.round(boxH * 0.58))
      }

      curY += boxH + gap
    }

    drawBox('BLOOD GROUP :', bloodGroup, true)
    drawBox('AADHAAR NO. :', aadhaar)
    drawBox('MOBILE NO. :', phone)

    // Address Box (Taller for multi-line)
    const addrBoxH = Math.round(height * 0.16)
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.roundRect(boxX, curY, boxW, addrBoxH, Math.round(10 * scale))
    ctx.fill()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#0d2b59'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('ADDRESS :', boxX + Math.round(16 * scale), curY + Math.round(28 * scale))

    ctx.fillStyle = '#1e293b'
    ctx.font = `600 ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    if (empAddress) {
      const words = empAddress.split(' ')
      let currentLine = ''
      const maxW = boxW - Math.round(32 * scale)
      const lineHeight = Math.round(22 * scale)
      let lineY = curY + Math.round(52 * scale)
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(currentLine, boxX + Math.round(16 * scale), lineY)
          currentLine = word
          lineY += lineHeight
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, boxX + Math.round(16 * scale), lineY)
      }
    }

    // Signatory
    const sigLineY = Math.round(height * 0.885)
    ctx.strokeStyle = '#0d2b59'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(width * 0.48, sigLineY)
    ctx.lineTo(width * 0.92, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    const sigCenterX = width * 0.70
    ctx.fillStyle = '#0d2b59'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('AUTHORIZED SIGNATORY', sigCenterX, sigLineY + Math.round(24 * scale))

    ctx.fillStyle = '#64748b'
    ctx.font = `italic ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('Name & Designation', sigCenterX, sigLineY + Math.round(42 * scale))
  }

  return canvas
}

/**
 * Render SIDWAL Design 2: Industrial Engineering
 */
export const renderSidwalIndustrialEngineeringCardToCanvas = async (employee, options = {}) => {
  const {
    side = 'front',
    photoUrl = '',
    dpi = 300,
  } = options

  const pxPerMm = dpi / 25.4
  const widthMm = 86.22
  const heightMm = 125.45
  const width = Math.round(widthMm * pxPerMm)
  const height = Math.round(heightMm * pxPerMm)
  const scale = width / 637

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const empId = employee.employeeId || employee.id || ''
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || ''
  const designation = employee.designation || employee.role || ''
  const fatherName = employee.fatherName || employee.father_name || ''
  const bloodGroup = employee.bloodGroup || ''
  const aadhaar = employee.aadhaarNumber || employee.aadhaar || employee.aadhar || ''
  const phone = employee.phone || ''
  const empAddress = employee.address || ''

  const [sidwalLogoImg, photoImg] = await Promise.all([
    loadImage(SIDWAL_LOGO_BASE64),
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
  ])

  // Base Technical Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, width, height)

  // Technical Outer Border
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = Math.max(3, Math.round(3 * scale))
  ctx.strokeRect(1, 1, width - 2, height - 2)

  if (side === 'front') {
    // ---------------- FRONT SIDE: INDUSTRIAL ENGINEERING ----------------
    // Charcoal Header
    const headerH = Math.round(height * 0.17)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, width, headerH)

    if (sidwalLogoImg) {
      const plateW = Math.round(width * 0.44)
      const plateH = Math.round(height * 0.046)
      const plateX = (width - plateW) / 2
      const plateY = Math.round(height * 0.02)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(plateX, plateY, plateW, plateH)
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1
      ctx.strokeRect(plateX, plateY, plateW, plateH)

      const logoW = Math.round(plateW * 0.85)
      const logoH = Math.round(logoW * (104 / 400))
      const logoX = plateX + (plateW - logoW) / 2
      const logoY = plateY + (plateH - logoH) / 2
      ctx.drawImage(sidwalLogoImg, logoX, logoY, logoW, logoH)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#cbd5e1'
    ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('MECHANICAL WORKSHOP GORAKHPUR', width / 2, Math.round(height * 0.095))

    ctx.fillStyle = '#ffffff'
    ctx.font = `900 ${Math.round(21 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('NORTH EASTERN RAILWAY', width / 2, Math.round(height * 0.125))

    ctx.fillStyle = '#fbbf24'
    ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('SIDWAL REFRIGERATION INDUSTRIES (P) LTD', width / 2, Math.round(height * 0.152))

    // Safety Red divider
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Viewfinder Photo Frame
    const photoW = Math.round(width * 0.35)
    const photoH = Math.round(height * 0.24)
    const photoX = (width - photoW) / 2
    const photoY = headerH + Math.round(20 * scale)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(photoX - 4, photoY - 4, photoW + 8, photoH + 8)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.strokeRect(photoX - 4, photoY - 4, photoW + 8, photoH + 8)

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH)
    } else {
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(photoX, photoY, photoW, photoH)
      ctx.setLineDash([])
    }

    // Title
    const titleY = photoY + photoH + Math.round(26 * scale)
    ctx.fillStyle = '#dc2626'
    ctx.font = `bold ${Math.round(16 * scale)}px "Courier New", Courier, monospace`
    ctx.textAlign = 'center'
    ctx.fillText('[ IDENTITY CARD // TECH-OPS ]', width / 2, titleY)

    // Industrial Spec Grid
    const gridX = Math.round(width * 0.06)
    const gridW = width - (gridX * 2)
    const gridY = titleY + Math.round(16 * scale)
    const gridH = Math.round(height * 0.23)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(gridX, gridY, gridW, gridH)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.strokeRect(gridX, gridY, gridW, gridH)

    ctx.textAlign = 'left'
    const labelX = gridX + Math.round(gridW * 0.06)
    const colonX = gridX + Math.round(gridW * 0.40)
    const valX = gridX + Math.round(gridW * 0.44)
    const lineStep = Math.round(gridH * 0.25)
    let curY = gridY + Math.round(gridH * 0.21)

    const drawSpecRow = (label, value) => {
      ctx.fillStyle = '#64748b'
      ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
      ctx.fillText(label, labelX, curY)
      ctx.fillText(':', colonX, curY)
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px "Courier New", Courier, monospace`
      ctx.fillText(value || '', valX, curY)

      // Sub-line separator
      if (curY < gridY + gridH - Math.round(10 * scale)) {
        ctx.strokeStyle = '#f1f5f9'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(gridX, curY + Math.round(8 * scale))
        ctx.lineTo(gridX + gridW, curY + Math.round(8 * scale))
        ctx.stroke()
      }
      curY += lineStep
    }

    drawSpecRow('ID NO.', empId)
    drawSpecRow('NAME', fullName)
    drawSpecRow('FATHER NAME', fatherName)
    drawSpecRow('DESIGNATION', designation)

    // Technical Footer
    const footerY = Math.round(height * 0.885)
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, footerY, width, height - footerY)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const sigLineY = Math.round(height * 0.925)
    const sigTextY = Math.round(height * 0.955)

    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(width * 0.10, sigLineY)
    ctx.lineTo(width * 0.43, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#334155'
    ctx.font = `bold ${Math.round(13 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('CARD HOLDER SIGN', width * 0.265, sigTextY)

    ctx.beginPath()
    ctx.moveTo(width * 0.57, sigLineY)
    ctx.lineTo(width * 0.90, sigLineY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillText('CONTRACTOR SIGN', width * 0.735, sigTextY)
  } else {
    // ---------------- BACK SIDE: INDUSTRIAL ENGINEERING ----------------
    const headerH = Math.round(height * 0.125)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, width, headerH)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(19 * scale)}px "Courier New", Courier, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CARDHOLDER DETAILS // RECORD', width / 2, headerH / 2)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#dc2626'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Technical spec readouts
    const boxX = Math.round(width * 0.06)
    const boxW = width - (boxX * 2)
    let curY = Math.round(height * 0.18)
    const boxH = Math.round(height * 0.08)
    const gap = Math.round(height * 0.02)

    const drawSpecBox = (label, value) => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(boxX, curY, boxW, boxH)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.strokeRect(boxX, curY, boxW, boxH)

      ctx.textAlign = 'left'
      ctx.fillStyle = '#64748b'
      ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
      ctx.fillText(label, boxX + Math.round(16 * scale), curY + Math.round(boxH * 0.58))

      ctx.textAlign = 'right'
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px "Courier New", Courier, monospace`
      ctx.fillText(value || '', boxX + boxW - Math.round(16 * scale), curY + Math.round(boxH * 0.58))

      curY += boxH + gap
    }

    drawSpecBox('BLOOD GROUP :', bloodGroup)
    drawSpecBox('AADHAAR NO. :', aadhaar)
    drawSpecBox('MOBILE NO. :', phone)

    // Address Spec Box
    const addrBoxH = Math.round(height * 0.16)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(boxX, curY, boxW, addrBoxH)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.strokeRect(boxX, curY, boxW, addrBoxH)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('ADDRESS :', boxX + Math.round(16 * scale), curY + Math.round(28 * scale))

    ctx.fillStyle = '#1e293b'
    ctx.font = `bold ${Math.round(14 * scale)}px "Courier New", Courier, monospace`
    if (empAddress) {
      const words = empAddress.split(' ')
      let currentLine = ''
      const maxW = boxW - Math.round(32 * scale)
      const lineHeight = Math.round(22 * scale)
      let lineY = curY + Math.round(52 * scale)
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(currentLine, boxX + Math.round(16 * scale), lineY)
          currentLine = word
          lineY += lineHeight
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, boxX + Math.round(16 * scale), lineY)
      }
    }

    // Technical Signatory
    const sigLineY = Math.round(height * 0.885)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(width * 0.48, sigLineY)
    ctx.lineTo(width * 0.92, sigLineY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.textAlign = 'center'
    const sigCenterX = width * 0.70
    ctx.fillStyle = '#1e293b'
    ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('AUTHORIZED SIGNATORY', sigCenterX, sigLineY + Math.round(24 * scale))

    ctx.fillStyle = '#64748b'
    ctx.font = `${Math.round(13 * scale)}px "Courier New", Courier, monospace`
    ctx.fillText('Name & Designation', sigCenterX, sigLineY + Math.round(42 * scale))
  }

  return canvas
}

/**
 * Render SIDWAL Design 3: Premium Executive
 */
export const renderSidwalPremiumExecutiveCardToCanvas = async (employee, options = {}) => {
  const {
    side = 'front',
    photoUrl = '',
    dpi = 300,
  } = options

  const pxPerMm = dpi / 25.4
  const widthMm = 86.22
  const heightMm = 125.45
  const width = Math.round(widthMm * pxPerMm)
  const height = Math.round(heightMm * pxPerMm)
  const scale = width / 637

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const empId = employee.employeeId || employee.id || ''
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || ''
  const designation = employee.designation || employee.role || ''
  const fatherName = employee.fatherName || employee.father_name || ''
  const bloodGroup = employee.bloodGroup || ''
  const aadhaar = employee.aadhaarNumber || employee.aadhaar || employee.aadhar || ''
  const phone = employee.phone || ''
  const empAddress = employee.address || ''

  const [sidwalLogoImg, photoImg] = await Promise.all([
    loadImage(SIDWAL_LOGO_BASE64),
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
  ])

  // Pure White Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Outer Border
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = Math.max(1.5, Math.round(1.5 * scale))
  ctx.strokeRect(1, 1, width - 2, height - 2)

  if (side === 'front') {
    // ---------------- FRONT SIDE: PREMIUM EXECUTIVE ----------------
    // Top Logo flanked by thin hairline rules
    const logoY = Math.round(height * 0.035)
    if (sidwalLogoImg) {
      const logoW = Math.round(width * 0.38)
      const logoH = Math.round(logoW * (104 / 400))
      const logoX = (width - logoW) / 2
      ctx.drawImage(sidwalLogoImg, logoX, logoY, logoW, logoH)

      // Hairlines flanking logo
      const ruleY = logoY + logoH / 2
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(width * 0.08, ruleY)
      ctx.lineTo(logoX - Math.round(12 * scale), ruleY)
      ctx.moveTo(logoX + logoW + Math.round(12 * scale), ruleY)
      ctx.lineTo(width * 0.92, ruleY)
      ctx.stroke()
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#091b36'
    ctx.font = `bold ${Math.round(21 * scale)}px "Times New Roman", Times, serif`
    ctx.fillText('NORTH EASTERN RAILWAY', width / 2, Math.round(height * 0.125))

    ctx.fillStyle = '#475569'
    ctx.font = `bold ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('MECHANICAL WORKSHOP GORAKHPUR', width / 2, Math.round(height * 0.150))

    ctx.fillStyle = '#b91c1c'
    ctx.font = `bold ${Math.round(14 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('SIDWAL REFRIGERATION INDUSTRIES (P) LTD', width / 2, Math.round(height * 0.174))

    // Fine crimson pinstripe
    ctx.fillStyle = '#b91c1c'
    const pinstripeW = Math.round(width * 0.35)
    ctx.fillRect((width - pinstripeW) / 2, Math.round(height * 0.188), pinstripeW, Math.max(2, Math.round(2 * scale)))

    // Executive Portrait Frame
    const photoW = Math.round(width * 0.35)
    const photoH = Math.round(height * 0.24)
    const photoX = (width - photoW) / 2
    const photoY = Math.round(height * 0.215)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(photoX - 3, photoY - 3, photoW + 6, photoH + 6)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.strokeRect(photoX - 3, photoY - 3, photoW + 6, photoH + 6)

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH)
    } else {
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.strokeRect(photoX, photoY, photoW, photoH)
    }

    // Title
    const titleY = photoY + photoH + Math.round(24 * scale)
    ctx.fillStyle = '#64748b'
    ctx.font = `bold ${Math.round(14 * scale)}px "Times New Roman", Times, serif`
    ctx.textAlign = 'center'
    ctx.fillText('I D E N T I T Y   C R E D E N T I A L', width / 2, titleY)

    // Typographic Fields
    ctx.textAlign = 'left'
    const labelX = Math.round(width * 0.12)
    const colonX = Math.round(width * 0.42)
    const valX = Math.round(width * 0.46)
    const lineStep = Math.round(height * 0.050)
    let curY = titleY + Math.round(30 * scale)

    const drawExecRow = (label, value) => {
      ctx.fillStyle = '#091b36'
      ctx.font = `bold ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, labelX, curY)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(':', colonX, curY)
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(value || '', valX, curY)
      curY += lineStep
    }

    drawExecRow('ID NO.', empId)
    drawExecRow('NAME', fullName)
    drawExecRow('FATHER NAME', fatherName)
    drawExecRow('DESIGNATION', designation)

    // Minimal Signatures
    const footerY = Math.round(height * 0.885)
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, footerY, width, height - footerY)
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const sigLineY = Math.round(height * 0.925)
    const sigTextY = Math.round(height * 0.955)

    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.10, sigLineY)
    ctx.lineTo(width * 0.43, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#64748b'
    ctx.font = `bold ${Math.round(12 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('CARD HOLDER SIGN', width * 0.265, sigTextY)

    ctx.beginPath()
    ctx.moveTo(width * 0.57, sigLineY)
    ctx.lineTo(width * 0.90, sigLineY)
    ctx.stroke()
    ctx.fillText('CONTRACTOR SIGN', width * 0.735, sigTextY)
  } else {
    // ---------------- BACK SIDE: PREMIUM EXECUTIVE ----------------
    const headerH = Math.round(height * 0.125)
    ctx.fillStyle = '#091b36'
    ctx.fillRect(0, 0, width, headerH)

    ctx.fillStyle = '#f8fafc'
    ctx.font = `bold ${Math.round(19 * scale)}px "Times New Roman", Times, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('C A R D H O L D E R   D E T A I L S', width / 2, headerH / 2)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#b91c1c'
    ctx.fillRect(0, headerH, width, Math.max(2, Math.round(2.5 * scale)))

    // Minimalist Tabular Rows
    ctx.textAlign = 'left'
    const labelX = Math.round(width * 0.10)
    const colonX = Math.round(width * 0.44)
    const valX = Math.round(width * 0.48)
    let curY = Math.round(height * 0.22)
    const lineStep = Math.round(height * 0.075)

    const drawExecBackRow = (label, value) => {
      ctx.fillStyle = '#091b36'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, labelX, curY)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(':', colonX, curY)
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(value || '', valX, curY)

      ctx.strokeStyle = '#f1f5f9'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(labelX, curY + Math.round(12 * scale))
      ctx.lineTo(width * 0.92, curY + Math.round(12 * scale))
      ctx.stroke()

      curY += lineStep
    }

    drawExecBackRow('BLOOD GROUP', bloodGroup)
    drawExecBackRow('AADHAAR NO.', aadhaar)
    drawExecBackRow('MOBILE NO.', phone)

    // Address
    ctx.fillStyle = '#091b36'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('ADDRESS', labelX, curY)
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(':', colonX, curY)

    ctx.fillStyle = '#334155'
    ctx.font = `600 ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    if (empAddress) {
      const words = empAddress.split(' ')
      let currentLine = ''
      const maxW = width * 0.44
      const lineHeight = Math.round(22 * scale)
      let lineY = curY
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(currentLine, valX, lineY)
          currentLine = word
          lineY += lineHeight
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, valX, lineY)
      }
    }

    // Executive Signatory
    const sigLineY = Math.round(height * 0.885)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.52, sigLineY)
    ctx.lineTo(width * 0.92, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    const sigCenterX = width * 0.72
    ctx.fillStyle = '#091b36'
    ctx.font = `bold ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('AUTHORIZED SIGNATORY', sigCenterX, sigLineY + Math.round(24 * scale))

    ctx.fillStyle = '#64748b'
    ctx.font = `italic ${Math.round(13 * scale)}px "Times New Roman", Times, serif`
    ctx.fillText('Name & Designation', sigCenterX, sigLineY + Math.round(42 * scale))
  }

  return canvas
}

/**
 * Render SIDWAL Design 4: Contemporary Official
 */
export const renderSidwalContemporaryOfficialCardToCanvas = async (employee, options = {}) => {
  const {
    side = 'front',
    photoUrl = '',
    dpi = 300,
  } = options

  const pxPerMm = dpi / 25.4
  const widthMm = 86.22
  const heightMm = 125.45
  const width = Math.round(widthMm * pxPerMm)
  const height = Math.round(heightMm * pxPerMm)
  const scale = width / 637

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const empId = employee.employeeId || employee.id || ''
  const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || ''
  const designation = employee.designation || employee.role || ''
  const fatherName = employee.fatherName || employee.father_name || ''
  const bloodGroup = employee.bloodGroup || ''
  const aadhaar = employee.aadhaarNumber || employee.aadhaar || employee.aadhar || ''
  const phone = employee.phone || ''
  const empAddress = employee.address || ''

  const [sidwalLogoImg, photoImg] = await Promise.all([
    loadImage(SIDWAL_LOGO_BASE64),
    photoUrl ? loadImage(photoUrl) : (employee.avatarUrl ? loadImage(employee.avatarUrl) : null),
  ])

  // Pure White Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Outer Border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(2, Math.round(2 * scale))
  const cornerRadius = Math.round(12 * scale)
  ctx.beginPath()
  ctx.roundRect(1, 1, width - 2, height - 2, cornerRadius)
  ctx.stroke()

  if (side === 'front') {
    // ---------------- FRONT SIDE: CONTEMPORARY OFFICIAL ----------------
    // Royal Navy Banner
    const headerH = Math.round(height * 0.17)
    ctx.fillStyle = '#0a326a'
    ctx.fillRect(0, 0, width, headerH)

    if (sidwalLogoImg) {
      const plateW = Math.round(width * 0.44)
      const plateH = Math.round(height * 0.046)
      const plateX = (width - plateW) / 2
      const plateY = Math.round(height * 0.02)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(plateX, plateY, plateW, plateH, Math.round(6 * scale))
      ctx.fill()

      const logoW = Math.round(plateW * 0.85)
      const logoH = Math.round(logoW * (104 / 400))
      const logoX = plateX + (plateW - logoW) / 2
      const logoY = plateY + (plateH - logoH) / 2
      ctx.drawImage(sidwalLogoImg, logoX, logoY, logoW, logoH)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = `900 ${Math.round(21 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('NORTH EASTERN RAILWAY', width / 2, Math.round(height * 0.098))

    ctx.fillStyle = '#bfdbfe'
    ctx.font = `bold ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('MECHANICAL WORKSHOP GORAKHPUR', width / 2, Math.round(height * 0.126))

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(14 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('SIDWAL REFRIGERATION INDUSTRIES (P) LTD', width / 2, Math.round(height * 0.152))

    // Signal Red Divider
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Center Photo Frame
    const photoW = Math.round(width * 0.35)
    const photoH = Math.round(height * 0.24)
    const photoX = (width - photoW) / 2
    const photoY = headerH + Math.round(20 * scale)

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH)
      ctx.strokeStyle = '#0a326a'
      ctx.lineWidth = Math.max(2, Math.round(2 * scale))
      ctx.strokeRect(photoX, photoY, photoW, photoH)
    } else {
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(photoX, photoY, photoW, photoH)
      ctx.setLineDash([])
    }

    // Title
    const titleY = photoY + photoH + Math.round(26 * scale)
    ctx.fillStyle = '#0a326a'
    ctx.font = `900 ${Math.round(17 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('OFFICIAL IDENTITY CARD', width / 2, titleY)

    // Banded Institutional Table
    const tableX = Math.round(width * 0.06)
    const tableW = width - (tableX * 2)
    const tableY = titleY + Math.round(18 * scale)
    const rowH = Math.round(height * 0.052)

    const drawBandedRow = (label, value, isAlt = false, rowIndex = 0) => {
      const rY = tableY + (rowIndex * rowH)
      ctx.fillStyle = isAlt ? '#f8fafc' : '#ffffff'
      ctx.fillRect(tableX, rY, tableW, rowH)
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.strokeRect(tableX, rY, tableW, rowH)

      ctx.textAlign = 'left'
      ctx.fillStyle = '#0a326a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, tableX + Math.round(14 * scale), rY + Math.round(rowH * 0.65))

      ctx.fillText(':', tableX + Math.round(tableW * 0.38), rY + Math.round(rowH * 0.65))

      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(value || '', tableX + Math.round(tableW * 0.42), rY + Math.round(rowH * 0.65))
    }

    drawBandedRow('ID NO.', empId, true, 0)
    drawBandedRow('NAME', fullName, false, 1)
    drawBandedRow('FATHER NAME', fatherName, true, 2)
    drawBandedRow('DESIGNATION', designation, false, 3)

    // Footer Signatures
    const footerY = Math.round(height * 0.885)
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, footerY, width, height - footerY)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const sigLineY = Math.round(height * 0.925)
    const sigTextY = Math.round(height * 0.955)

    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width * 0.10, sigLineY)
    ctx.lineTo(width * 0.43, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#334155'
    ctx.font = `bold ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('CARD HOLDER SIGN', width * 0.265, sigTextY)

    ctx.beginPath()
    ctx.moveTo(width * 0.57, sigLineY)
    ctx.lineTo(width * 0.90, sigLineY)
    ctx.stroke()
    ctx.fillText('CONTRACTOR SIGN', width * 0.735, sigTextY)
  } else {
    // ---------------- BACK SIDE: CONTEMPORARY OFFICIAL ----------------
    const headerH = Math.round(height * 0.125)
    ctx.fillStyle = '#0a326a'
    ctx.fillRect(0, 0, width, headerH)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(20 * scale)}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CARDHOLDER DETAILS', width / 2, headerH / 2)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#e11d48'
    ctx.fillRect(0, headerH, width, Math.max(3, Math.round(4.5 * scale)))

    // Banded Information Cards
    const boxX = Math.round(width * 0.06)
    const boxW = width - (boxX * 2)
    let curY = Math.round(height * 0.18)
    const boxH = Math.round(height * 0.08)
    const gap = Math.round(height * 0.02)

    const drawOfficialBox = (label, value, isAlt = false) => {
      ctx.fillStyle = isAlt ? '#f8fafc' : '#ffffff'
      ctx.beginPath()
      ctx.roundRect(boxX, curY, boxW, boxH, Math.round(8 * scale))
      ctx.fill()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.textAlign = 'left'
      ctx.fillStyle = '#0a326a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(label, boxX + Math.round(14 * scale), curY + Math.round(boxH * 0.58))

      ctx.textAlign = 'right'
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
      ctx.fillText(value || '', boxX + boxW - Math.round(14 * scale), curY + Math.round(boxH * 0.58))

      curY += boxH + gap
    }

    drawOfficialBox('BLOOD GROUP :', bloodGroup, true)
    drawOfficialBox('AADHAAR NO. :', aadhaar, false)
    drawOfficialBox('MOBILE NO. :', phone, true)

    // Address Box
    const addrBoxH = Math.round(height * 0.16)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(boxX, curY, boxW, addrBoxH, Math.round(8 * scale))
    ctx.fill()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#0a326a'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('ADDRESS :', boxX + Math.round(14 * scale), curY + Math.round(28 * scale))

    ctx.fillStyle = '#1e293b'
    ctx.font = `600 ${Math.round(15 * scale)}px Arial, Helvetica, sans-serif`
    if (empAddress) {
      const words = empAddress.split(' ')
      let currentLine = ''
      const maxW = boxW - Math.round(28 * scale)
      const lineHeight = Math.round(22 * scale)
      let lineY = curY + Math.round(52 * scale)
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(currentLine, boxX + Math.round(14 * scale), lineY)
          currentLine = word
          lineY += lineHeight
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, boxX + Math.round(14 * scale), lineY)
      }
    }

    // Official Signatory
    const sigLineY = Math.round(height * 0.885)
    ctx.strokeStyle = '#0a326a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(width * 0.48, sigLineY)
    ctx.lineTo(width * 0.92, sigLineY)
    ctx.stroke()

    ctx.textAlign = 'center'
    const sigCenterX = width * 0.70
    ctx.fillStyle = '#0a326a'
    ctx.font = `bold ${Math.round(16 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('AUTHORIZED SIGNATORY', sigCenterX, sigLineY + Math.round(24 * scale))

    ctx.fillStyle = '#64748b'
    ctx.font = `italic ${Math.round(13 * scale)}px Arial, Helvetica, sans-serif`
    ctx.fillText('Name & Designation', sigCenterX, sigLineY + Math.round(42 * scale))
  }

  return canvas
}
