import { jsPDF } from 'jspdf'
import { renderCardToCanvas, CR80_DIMENSIONS } from './cardCanvasRenderer.js'

/**
 * PDF Sheet Layout Configurations for A4 paper (210 mm × 297 mm)
 */
export const A4_LAYOUTS = {
  portrait: {
    cardsPerSheet: 9,
    cols: 3,
    rows: 3,
    cardWidthMm: 53.98,
    cardHeightMm: 85.6,
    colGapMm: 5,
    rowGapMm: 5,
    marginLeftMm: 19.03, // (210 - (3 * 53.98) - 10) / 2
    marginTopMm: 15.1,   // (297 - (3 * 85.60) - 10) / 2
  },
  landscape: {
    cardsPerSheet: 8,
    cols: 2,
    rows: 4,
    cardWidthMm: 85.6,
    cardHeightMm: 53.98,
    colGapMm: 5,
    rowGapMm: 5,
    marginLeftMm: 16.9,  // (210 - (2 * 85.60) - 5) / 2
    marginTopMm: 33.04,  // (297 - (4 * 53.98) - 15) / 2
  },
}

/**
 * Draw professional L-shaped cutting crop marks around a card bounding box.
 */
export const drawCuttingCropMarks = (doc, x, y, width, height, markLength = 3.5) => {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2) // 0.2 mm fine line

  // Top-Left Corner
  doc.line(x - markLength, y, x, y)
  doc.line(x, y - markLength, x, y)

  // Top-Right Corner
  doc.line(x + width, y, x + width + markLength, y)
  doc.line(x + width, y - markLength, x + width, y)

  // Bottom-Left Corner
  doc.line(x - markLength, y + height, x, y + height)
  doc.line(x, y + height, x, y + height + markLength)

  // Bottom-Right Corner
  doc.line(x + width, y + height, x + width + markLength, y + height)
  doc.line(x + width, y + height, x + width, y + height + markLength)
}

/**
 * Generate a complete, production-ready PDF of employee ID cards.
 * 
 * @param {Array<Object>} employees - List of employee objects.
 * @param {Object} options - Export options.
 * @param {Function} onProgress - Progress reporting callback.
 * @returns {Promise<{ doc: jsPDF, blob: Blob, filename: string, totalPages: number }>}
 */
export const generateIdCardsPdf = async (employees = [], options = {}, onProgress = () => {}) => {
  const {
    template = 'corporate-blue',
    orientation = 'portrait', // 'portrait' | 'landscape'
    layout = 'a4-sheet', // 'a4-sheet' | 'single-cr80'
    includeBackSide = false,
    includeCuttingMarks = true,
    photoUrls = {},
    settings = {},
    dpi = 300,
  } = options

  if (employees.length === 0) {
    throw new Error('No employees selected for PDF generation.')
  }

  const companyName = settings.companyName || 'NOVATECH SOLUTIONS'
  const isA4 = layout === 'a4-sheet'
  const isSidwal = template === 'sidwal-workshop' || template?.startsWith('sidwal-')
  const sidwalDims = { widthMm: 86.22, heightMm: 125.45 }
  const a4Config = A4_LAYOUTS[orientation]
  const cr80Dims = isSidwal ? sidwalDims : CR80_DIMENSIONS.getDimensions(orientation)

  // 1. Initialize jsPDF document
  const doc = isA4
    ? new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    : new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [cr80Dims.widthMm, cr80Dims.heightMm],
      })

  let isFirstPage = true
  const totalEmployees = employees.length
  let processedItems = 0
  const totalWorkUnits = includeBackSide ? totalEmployees * 2 : totalEmployees

  // =========================================================
  // MODE A: A4 PRINT SHEETS
  // =========================================================
  if (isA4) {
    const { cardsPerSheet, cols, rows, cardWidthMm, cardHeightMm, colGapMm, rowGapMm, marginLeftMm, marginTopMm } = a4Config
    const chunks = []

    // Break employees into chunks equal to sheet capacity
    for (let i = 0; i < employees.length; i += cardsPerSheet) {
      chunks.push(employees.slice(i, i + cardsPerSheet))
    }

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const sheetEmployees = chunks[chunkIdx]

      // --- SHEET FRONT PAGE ---
      if (!isFirstPage) {
        doc.addPage('a4', 'portrait')
      }
      isFirstPage = false

      // Draw Top Sheet Header Legend
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(
        `${companyName.toUpperCase()} • ID CARD PRINT SHEET • PAGE ${doc.internal.pages.length - 1} • 300 DPI (CR80 ${orientation.toUpperCase()})`,
        marginLeftMm,
        marginTopMm - 5
      )

      // Render Front of each card on this sheet
      for (let idx = 0; idx < sheetEmployees.length; idx++) {
        const emp = sheetEmployees[idx]
        const col = idx % cols
        const row = Math.floor(idx / cols)

        const x = marginLeftMm + col * (cardWidthMm + colGapMm)
        const y = marginTopMm + row * (cardHeightMm + rowGapMm)

        onProgress(
          ++processedItems,
          totalWorkUnits,
          `Rendering Front: ${emp.fullName || emp.id} (Card ${idx + 1}/${sheetEmployees.length} on Sheet ${chunkIdx + 1})`
        )

        // Yield to event loop to keep UI smooth
        await new Promise((r) => setTimeout(r, 0))

        const empPhoto = photoUrls[emp.employeeId || emp.id]?.url || emp.avatarUrl || ''
        const canvas = await renderCardToCanvas(emp, {
          template,
          orientation,
          side: 'front',
          photoUrl: empPhoto,
          settings,
          dpi,
        })

        const actualCardHeightMm = isSidwal ? Math.round((cardWidthMm / (244.4 / 355.6)) * 100) / 100 : cardHeightMm
        const actualY = isSidwal ? y + (cardHeightMm - actualCardHeightMm) / 2 : y

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        doc.addImage(imgData, 'JPEG', x, actualY, cardWidthMm, actualCardHeightMm, undefined, 'FAST')

        if (includeCuttingMarks) {
          drawCuttingCropMarks(doc, x, actualY, cardWidthMm, actualCardHeightMm)
        }
      }

      // --- SHEET BACK PAGE (If double-sided export selected) ---
      if (includeBackSide) {
        doc.addPage('a4', 'portrait')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(
          `${companyName.toUpperCase()} • ID CARD BACK-SIDE SHEET (DUPLEX ALIGNED) • PAGE ${doc.internal.pages.length - 1}`,
          marginLeftMm,
          marginTopMm - 5
        )

        for (let idx = 0; idx < sheetEmployees.length; idx++) {
          const emp = sheetEmployees[idx]
          const originalCol = idx % cols
          const row = Math.floor(idx / cols)

          // DUPLEX HORIZONTAL MIRROR: In double-sided printing (flip on long edge),
          // column 0 of Front matches column (cols - 1) of Back!
          const mirroredCol = cols - 1 - originalCol

          const x = marginLeftMm + mirroredCol * (cardWidthMm + colGapMm)
          const y = marginTopMm + row * (cardHeightMm + rowGapMm)

          onProgress(
            ++processedItems,
            totalWorkUnits,
            `Rendering Back: ${emp.fullName || emp.id} (Card ${idx + 1}/${sheetEmployees.length} on Sheet ${chunkIdx + 1})`
          )

          await new Promise((r) => setTimeout(r, 0))

          const canvas = await renderCardToCanvas(emp, {
            template,
            orientation,
            side: 'back',
            settings,
            dpi,
          })

          const actualCardHeightMm = isSidwal ? Math.round((cardWidthMm / (244.4 / 355.6)) * 100) / 100 : cardHeightMm
          const actualY = isSidwal ? y + (cardHeightMm - actualCardHeightMm) / 2 : y

          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          doc.addImage(imgData, 'JPEG', x, actualY, cardWidthMm, actualCardHeightMm, undefined, 'FAST')

          if (includeCuttingMarks) {
            drawCuttingCropMarks(doc, x, actualY, cardWidthMm, actualCardHeightMm)
          }
        }
      }
    }
  }

  // =========================================================
  // MODE B: INDIVIDUAL CR80 PAGES (1 Card per page, exact CR80 size)
  // =========================================================
  if (!isA4) {
    const { widthMm, heightMm } = cr80Dims

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      const empPhoto = photoUrls[emp.employeeId || emp.id]?.url || emp.avatarUrl || ''

      // Front Page
      if (!isFirstPage) {
        doc.addPage([widthMm, heightMm], orientation)
      }
      isFirstPage = false

      onProgress(
        ++processedItems,
        totalWorkUnits,
        `Rendering Front: ${emp.fullName || emp.id} (${i + 1}/${totalEmployees})`
      )
      await new Promise((r) => setTimeout(r, 0))

      const frontCanvas = await renderCardToCanvas(emp, {
        template,
        orientation,
        side: 'front',
        photoUrl: empPhoto,
        settings,
        dpi,
      })
      const frontData = frontCanvas.toDataURL('image/jpeg', 0.95)
      doc.addImage(frontData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')

      // Back Page (if selected)
      if (includeBackSide) {
        doc.addPage([widthMm, heightMm], orientation)

        onProgress(
          ++processedItems,
          totalWorkUnits,
          `Rendering Back: ${emp.fullName || emp.id} (${i + 1}/${totalEmployees})`
        )
        await new Promise((r) => setTimeout(r, 0))

        const backCanvas = await renderCardToCanvas(emp, {
          template,
          orientation,
          side: 'back',
          settings,
          dpi,
        })
        const backData = backCanvas.toDataURL('image/jpeg', 0.95)
        doc.addImage(backData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')
      }
    }
  }

  // Meaningful filename generator
  const dateStr = new Date().toISOString().split('T')[0]
  const filename =
    employees.length === 1
      ? `${employees[0].employeeId || employees[0].id || 'EMP'}_${(employees[0].fullName || 'Employee').replace(/\s+/g, '_')}_${template}_CR80.pdf`
      : `${companyName.replace(/\s+/g, '_')}_ID_Cards_${employees.length}Emps_${layout.toUpperCase()}_${dateStr}.pdf`

  const blob = doc.output('blob')
  const totalPages = doc.internal.pages.length - 1

  return {
    doc,
    blob,
    filename,
    totalPages,
    fileSize: blob.size,
  }
}
