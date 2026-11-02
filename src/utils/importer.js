import * as XLSX from 'xlsx'
import { REQUIRED_FIELDS, OPTIONAL_FIELDS } from './validator.js'
import { generateRecordId } from './cardTypes.js'

/**
 * Format Excel date serial number or raw string into YYYY-MM-DD format.
 */
export const formatExcelDate = (val) => {
  if (!val && val !== 0) return ''
  const num =
    typeof val === 'number'
      ? val
      : typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim())
      ? parseFloat(val.trim())
      : NaN

  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Excel date serial number (range between 1927 and 2173)
    const date = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  const dateStr = String(val).trim()
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  return dateStr
}

/**
 * Common column name aliases for auto-matching across different organizations and use cases.
 */
export const ALIAS_MAP = {
  employeeId: ['employeeid', 'employee id', 'emp id', 'empid', 'id', 'badge id', 'staff id', 'worker id', 'identifier', 'code'],
  rollNo: ['rollno', 'roll number', 'roll no', 'registration no', 'reg no', 'student id', 'enrollment no', 'scholar no'],
  visitorId: ['visitorid', 'visitor pass', 'pass id', 'visitor id', 'guest id', 'pass no', 'token no'],
  ticketNo: ['ticketno', 'ticket number', 'ticket no', 'pass code', 'delegate id', 'attendee id'],
  firstName: ['firstname', 'first name', 'first', 'given name', 'fname'],
  lastName: ['lastname', 'last name', 'last', 'surname', 'family name', 'lname'],
  fullName: ['fullname', 'full name', 'name', 'person name', 'employee name', 'student name', 'visitor name'],
  department: ['department', 'dept', 'division', 'unit', 'team', 'department name', 'host department', 'branch', 'faculty'],
  designation: ['designation', 'role', 'title', 'job title', 'position', 'job role', 'trade', 'purpose', 'ticket category'],
  course: ['course', 'program', 'degree', 'curriculum', 'stream', 'class'],
  semester: ['semester', 'sem', 'year', 'batch', 'session', 'academic year'],
  email: ['email', 'email address', 'mail', 'work email', 'e-mail', 'student email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'cell', 'telephone', 'contact', 'contact number'],
  joiningDate: ['joiningdate', 'joining date', 'hire date', 'start date', 'date of joining', 'doj', 'admission date', 'visit date'],
  expiryDate: ['expirydate', 'expiry date', 'valid upto', 'validity', 'valid until', 'valid till', 'end date'],
  bloodGroup: ['bloodgroup', 'blood group', 'blood type', 'blood', 'bg'],
  photoFileName: ['photofilename', 'photo', 'picture', 'image', 'photo file', 'avatar', 'photo url', 'photo name'],
  fatherName: ['fathername', 'father name', 'fathers name', "father's name", 'guardian name', 'parent name', "guardian's name"],
  aadhaarNumber: ['aadhaarnumber', 'aadhaar number', 'aadhaar', 'aadhar', 'aadhar number', 'aadhaar no', 'aadhar no', 'uid', 'uidai', 'national id', 'govt id'],
  address: ['address', 'residence address', 'residential address', 'permanent address', 'home address', 'emp address', 'student address', 'location'],
}

/**
 * Automatically determine the best column mapping from file headers.
 */
export const autoGuessMapping = (headers = []) => {
  const mapping = {}
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    cleaned: String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
  }))

  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

  for (const field of allFields) {
    const targetKey = field.key
    const aliases = ALIAS_MAP[targetKey] || [targetKey.toLowerCase()]

    // Find first header matching any alias
    const match = normalizedHeaders.find((h) =>
      aliases.some((alias) => {
        const cleanedAlias = alias.replace(/[^a-z0-9]/g, '')
        return h.cleaned === cleanedAlias || h.cleaned.includes(cleanedAlias)
      })
    )

    mapping[targetKey] = match ? match.original : ''
  }

  return mapping
}

/**
 * Parse an uploaded spreadsheet file (.xlsx, .xls, .csv).
 * 
 * @param {File|Uint8Array|Buffer} file
 * @returns {Promise<{ filename: string, headers: string[], rawRows: Array<Object>, totalRawCount: number }>}
 */
export const parseSpreadsheetFile = async (file) => {
  let data
  if (typeof file?.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer()
    data = new Uint8Array(ab)
  } else if (typeof FileReader !== 'undefined' && file instanceof Blob) {
    data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(new Uint8Array(e.target.result))
      reader.onerror = () => reject(new Error('Failed to read the file from storage.'))
      reader.readAsArrayBuffer(file)
    })
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    data = new Uint8Array(file)
  } else {
    throw new Error('Unsupported file input type.')
  }

  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: false,
    raw: false,
  })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('No worksheets found in this workbook.')
  }

  const worksheet = workbook.Sheets[firstSheetName]

  // Parse sheet to array of arrays (header: 1)
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (!matrix || matrix.length === 0) {
    throw new Error('Spreadsheet appears to be completely empty.')
  }

  // Row 0 is the headers
  const rawHeaders = matrix[0].map((h) => String(h).trim()).filter(Boolean)
  if (rawHeaders.length === 0) {
    throw new Error('Unable to detect column headers in the first row.')
  }

  // Data rows (from index 1 onward), strictly skipping empty rows
  const dataRows = matrix.slice(1).filter((row) => {
    return Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  })

  return {
    filename: file?.name || 'spreadsheet.xlsx',
    fileSize: file?.size || data.byteLength || 0,
    headers: rawHeaders,
    rawRows: dataRows,
    totalRawCount: dataRows.length,
  }
}

/**
 * Map raw row arrays to standardized, generalized records based on user's column mapping.
 * Avoids creating empty records from blank spreadsheet rows.
 * 
 * @param {Array<Array>} rawRows - Array of raw rows.
 * @param {Array<string>} headers - Header column names.
 * @param {Object} mapping - Field key to header name mapping.
 * @param {Object} options - Configuration options { cardType, customFieldKeys }.
 * @returns {Array<Object>} Normalized record array.
 */
export const applyColumnMapping = (rawRows = [], headers = [], mapping = {}, options = {}) => {
  const cardType = options.cardType || 'employee'
  const headerIndexMap = {}
  headers.forEach((h, idx) => {
    headerIndexMap[h] = idx
  })

  // Filter out any empty rows before mapping
  const nonEmptyRows = rawRows.filter((row) => {
    return Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  })

  return nonEmptyRows.map((row, idx) => {
    const getVal = (fieldKey) => {
      const headerName = mapping[fieldKey]
      if (!headerName || headerIndexMap[headerName] === undefined) return ''
      const cellVal = row[headerIndexMap[headerName]]
      return cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : ''
    }

    const empId = getVal('employeeId')
    const rollNo = getVal('rollNo')
    const visitorId = getVal('visitorId')
    const ticketNo = getVal('ticketNo')
    const firstName = getVal('firstName')
    const lastName = getVal('lastName')
    const explicitFullName = getVal('fullName')
    const department = getVal('department')
    const designation = getVal('designation')
    const course = getVal('course')
    const semester = getVal('semester')
    const email = getVal('email')
    const phone = getVal('phone')
    const rawJoiningDate = getVal('joiningDate')
    const joiningDate = formatExcelDate(rawJoiningDate)
    const expiryDate = getVal('expiryDate')
    const bloodGroup = getVal('bloodGroup')
    const photoFileName = getVal('photoFileName')
    const fatherName = getVal('fatherName')
    const aadhaarNumber = getVal('aadhaarNumber')
    const address = getVal('address')

    // Determine primary display identifier
    const displayedId = empId || rollNo || visitorId || ticketNo || ''
    const generatedInternalId = generateRecordId('rec')

    // Construct full name
    const computedName = explicitFullName || `${firstName} ${lastName}`.trim() || displayedId

    // Extract any custom fields that were mapped
    const customFields = {}
    if (options.customFieldKeys && Array.isArray(options.customFieldKeys)) {
      for (const customKey of options.customFieldKeys) {
        customFields[customKey] = getVal(customKey)
      }
    }

    return {
      _id: `row-${idx}-${Date.now()}`,
      recordId: generatedInternalId, // Internal unique identifier
      id: empId || displayedId, // Preserve exact empId for backward-compatibility
      employeeId: empId, // Preserve empty string if empId is missing so validation can detect it
      displayedId,
      cardType,
      firstName,
      lastName,
      fullName: computedName,
      department,
      designation,
      role: designation, // Backward-compatibility
      course: course || department,
      semester: semester || designation,
      email,
      phone,
      joiningDate,
      issueDate: joiningDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || (joiningDate ? `${parseInt(joiningDate.slice(0, 4) || '2026', 10) + 2}${joiningDate.slice(4)}` : '2028-01-01'),
      bloodGroup,
      photoFileName,
      fatherName,
      aadhaarNumber,
      address,
      customFields,
      status: 'Pending',
      avatarUrl: photoFileName && photoFileName.startsWith('http')
        ? photoFileName
        : `https://images.unsplash.com/photo-${1500000000000 + (idx % 20) * 10000}?w=200&auto=format&fit=crop&q=80`,
      location: address ? address.split(',')[0] : 'HQ Campus',
    }
  })
}
