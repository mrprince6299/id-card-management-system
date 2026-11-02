import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { autoGuessMapping, applyColumnMapping, formatExcelDate } from '../src/utils/importer.js'
import { validateBatch, validateRecord, isRowEmpty, isValidEmail, isValidDate } from '../src/utils/validator.js'
import { computeEmployeeStats } from '../src/utils/storage.js'
import { MOCK_EMPLOYEES } from '../src/data/mockEmployees.js'

function parseFileForTest(filePath) {
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  })

  const rawHeaders = matrix[0].map((h) => String(h).trim()).filter(Boolean)
  const dataRows = matrix.slice(1).filter((row) => {
    return Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  })

  return { headers: rawHeaders, dataRows }
}

async function runTests() {
  console.log('====================================================')
  console.log('🧪 Starting Phase 2 Import & Validation Test Suite')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  // TEST 1: Parse 15-employee CSV
  console.log('--- TEST 1: Sample CSV with >= 10 employees ---')
  const csvPath = path.resolve('tests', 'sample-employees-15.csv')
  const csvData = parseFileForTest(csvPath)
  assert(csvData.dataRows.length === 15, `Parsed exactly 15 employee rows from CSV (found ${csvData.dataRows.length})`)

  const csvMapping = autoGuessMapping(csvData.headers)
  assert(csvMapping.employeeId === 'Employee ID', `Auto-mapped Employee ID column: "${csvMapping.employeeId}"`)
  assert(csvMapping.firstName === 'First Name', `Auto-mapped First Name column: "${csvMapping.firstName}"`)
  assert(csvMapping.department === 'Department', `Auto-mapped Department column: "${csvMapping.department}"`)

  const mappedCsv = applyColumnMapping(csvData.dataRows, csvData.headers, csvMapping)
  const validatedCsv = validateBatch(mappedCsv, MOCK_EMPLOYEES)
  const validCsvCount = validatedCsv.filter((r) => r._validation.isValid).length
  assert(validCsvCount === 15, `All 15 employee records passed validation (${validCsvCount}/15)`)

  // TEST 2: Parse 12-employee XLSX
  console.log('\n--- TEST 2: Sample XLSX File Parsing & Mapping ---')
  const xlsxPath = path.resolve('tests', 'sample-employees-12.xlsx')
  const xlsxData = parseFileForTest(xlsxPath)
  assert(xlsxData.dataRows.length === 12, `Parsed exactly 12 employee rows from XLSX (found ${xlsxData.dataRows.length})`)

  const xlsxMapping = autoGuessMapping(xlsxData.headers)
  assert(xlsxMapping.employeeId === 'Emp ID', `Auto-mapped "Emp ID" alias to employeeId: "${xlsxMapping.employeeId}"`)
  assert(xlsxMapping.designation === 'Job Title', `Auto-mapped "Job Title" alias to designation: "${xlsxMapping.designation}"`)
  assert(xlsxMapping.email === 'Work Email', `Auto-mapped "Work Email" alias to email: "${xlsxMapping.email}"`)
  assert(xlsxMapping.joiningDate === 'Hire Date', `Auto-mapped "Hire Date" alias to joiningDate: "${xlsxMapping.joiningDate}"`)

  const mappedXlsx = applyColumnMapping(xlsxData.dataRows, xlsxData.headers, xlsxMapping)
  const validatedXlsx = validateBatch(mappedXlsx, MOCK_EMPLOYEES)
  const validXlsxCount = validatedXlsx.filter((r) => r._validation.isValid).length
  assert(validXlsxCount === 12, `All 12 XLSX records passed validation (${validXlsxCount}/12)`)

  // TEST 3: Validation Error Detection (Duplicates, Missing Required, Bad Email, Empty Rows, Bad Dates)
  console.log('\n--- TEST 3: Comprehensive Validation Error Detection ---')
  const errPath = path.resolve('tests', 'sample-with-errors.csv')
  const errData = parseFileForTest(errPath)
  const errMapping = autoGuessMapping(errData.headers)
  const mappedErr = applyColumnMapping(errData.dataRows, errData.headers, errMapping)
  const validatedErr = validateBatch(mappedErr, MOCK_EMPLOYEES)

  // 3a. Duplicate ID within file
  const dupFileRow = validatedErr.find((r) => r.firstName === 'Duplicate')
  assert(
    dupFileRow && dupFileRow._validation.errors.some((e) => e.includes('Duplicate Employee ID in import file')),
    'Detected duplicate employeeId within same file (EMP-ERR-01)'
  )

  // 3b. Existing ID warning
  const conflictRow = validatedErr.find((r) => r.employeeId === 'EMP-1001')
  assert(
    conflictRow && conflictRow._validation.warnings.some((w) => w.includes('already exists in directory')),
    'Detected ID collision with existing saved directory record (EMP-1001)'
  )

  // 3c. Missing Employee ID
  const missingIdRow = validatedErr.find((r) => r.firstName === 'Missing' && r.lastName === 'IdUser')
  assert(
    missingIdRow && missingIdRow._validation.errors.some((e) => e.includes('Missing required field: Employee ID')),
    'Detected missing required field: Employee ID'
  )

  // 3d. Missing First Name
  const missingFirstRow = validatedErr.find((r) => r.lastName === 'MissingFirst')
  assert(
    missingFirstRow && missingFirstRow._validation.errors.some((e) => e.includes('Missing required field: First Name')),
    'Detected missing required field: First Name'
  )

  // 3e. Missing Department
  const missingDeptRow = validatedErr.find((r) => r.employeeId === 'EMP-ERR-05')
  assert(
    missingDeptRow && missingDeptRow._validation.errors.some((e) => e.includes('Missing required field: Department')),
    'Detected missing required field: Department'
  )

  // 3f. Missing Designation
  const missingDesigRow = validatedErr.find((r) => r.firstName === 'Missing' && r.department === 'Finance')
  assert(
    missingDesigRow && missingDesigRow._validation.errors.some((e) => e.includes('Missing required field: Designation')),
    'Detected missing required field: Designation'
  )

  // 3g. Invalid Email format
  const badEmailRow = validatedErr.find((r) => r.firstName === 'Bad' && r.lastName === 'EmailUser')
  assert(
    badEmailRow && badEmailRow._validation.errors.some((e) => e.includes('Invalid email format')),
    'Detected invalid email format: "invalid-email-address"'
  )

  // 3h. Invalid Date format
  const badDateRow = validatedErr.find((r) => r.firstName === 'Bad' && r.lastName === 'DateUser')
  assert(
    badDateRow && badDateRow._validation.errors.some((e) => e.includes('Invalid date format')),
    'Detected invalid date format: "invalid-date-string"'
  )

  // 3i. Empty row detection
  assert(isRowEmpty(['', '', '', null, undefined]), 'Empty row utility correctly identifies blank row')
  assert(!isRowEmpty(['EMP-01', 'Jane', 'Doe']), 'Non-empty row correctly identified as populated')

  // TEST 4: Duplicate Resolution Strategy ('skip' vs 'update')
  console.log('\n--- TEST 4: Duplicate Resolution Strategies ---')
  const initialCohort = [
    { id: 'EMP-1001', employeeId: 'EMP-1001', fullName: 'Original Sarah', department: 'Eng', role: 'Arch' },
  ]

  // Test 'skip' strategy
  const incomingDuplicate = [
    { employeeId: 'EMP-1001', firstName: 'New', lastName: 'Sarah', department: 'Eng', designation: 'Updated Arch' },
    { employeeId: 'EMP-9999', firstName: 'Fresh', lastName: 'Employee', department: 'Design', designation: 'Lead' },
  ]

  // Simulation of importEmployees logic
  function simulateImport(existingList, batch, strategy) {
    const list = [...existingList]
    const map = new Map(list.map((e, idx) => [e.employeeId || e.id, idx]))
    let imported = 0
    let skipped = 0
    let dup = 0

    for (const item of batch) {
      const id = item.employeeId || item.id
      if (map.has(id)) {
        dup++
        if (strategy === 'update') {
          list[map.get(id)] = { ...list[map.get(id)], ...item }
          imported++
        } else {
          skipped++
        }
      } else {
        list.push(item)
        map.set(id, list.length - 1)
        imported++
      }
    }
    return { list, imported, skipped, dup }
  }

  const skipResult = simulateImport(initialCohort, incomingDuplicate, 'skip')
  assert(skipResult.imported === 1 && skipResult.skipped === 1, `Safe Skip: imported 1, skipped 1 duplicate without overwrite`)
  assert(skipResult.list[0].fullName === 'Original Sarah', `Original record remains intact under 'skip' strategy`)

  const updateResult = simulateImport(initialCohort, incomingDuplicate, 'update')
  assert(updateResult.imported === 2 && updateResult.dup === 1, `Update Strategy: resolved duplicate by updating record`)
  assert(updateResult.list[0].firstName === 'New', `Record updated with new values under 'update' strategy`)

  // TEST 5: Real-time Statistics Calculation & Persistence Logic
  console.log('\n--- TEST 5: Statistics & Data Aggregation ---')
  const combinedRoster = [...MOCK_EMPLOYEES, ...validatedCsv]
  const stats = computeEmployeeStats(combinedRoster)

  assert(stats.totalEmployees === MOCK_EMPLOYEES.length + 15, `Total employees calculated correctly: ${stats.totalEmployees}`)
  assert(stats.generatedCards === 4, `Generated cards count preserved from active status`)
  assert(stats.pendingGeneration === combinedRoster.length - stats.generatedCards - stats.draftCount, `Pending generation count calculated dynamically`)
  assert(stats.departmentsCount > 5, `Dynamic department count computed from roster: ${stats.departmentsCount}`)

  console.log('\n====================================================')
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err)
  process.exit(1)
})
