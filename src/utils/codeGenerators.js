import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

/**
 * Generate a high-resolution QR code data URL.
 * Encodes standard employee identification payload.
 * 
 * @param {Object} employee - Employee record.
 * @param {string} companyName - Company name.
 * @returns {Promise<string>} Base64 data URL of generated QR code.
 */
export const generateEmployeeQrCode = async (employee, companyName = 'NOVATECH SOLUTIONS') => {
  const empId = employee.employeeId || employee.id || 'EMP-XXXX'
  const payload = JSON.stringify({
    id: empId,
    name: employee.fullName || 'Employee',
    dept: employee.department || 'General',
    role: employee.role || employee.designation || 'Staff',
    org: companyName,
    validUntil: employee.expiryDate || '2028-01-15',
    note: 'Static identification payload. Does not claim cryptographic verification.',
  })

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
    return dataUrl
  } catch (err) {
    console.warn('QR code generation failed, fallback to ID only:', err)
    return await QRCode.toDataURL(empId, { width: 256, margin: 1 })
  }
}

/**
 * Generate a Code 128 barcode data URL for an Employee ID.
 * 
 * @param {string} employeeId - Employee ID code.
 * @param {Object} options - Customization options.
 * @returns {string} Base64 PNG data URL of generated barcode.
 */
export const generateEmployeeBarcode = (employeeId, options = {}) => {
  const cleanId = String(employeeId || 'EMP-XXXX').trim()

  if (typeof document === 'undefined') {
    // Non-browser fallback
    return ''
  }

  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, cleanId, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      font: 'monospace',
      height: 40,
      width: 1.6,
      margin: 4,
      background: options.background || '#ffffff',
      lineColor: options.lineColor || '#0f172a',
      textMargin: 2,
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.warn(`Barcode generation failed for "${cleanId}":`, err)
    return ''
  }
}

