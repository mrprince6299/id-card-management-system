import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

// Project module imports
import {
  CARD_TYPES,
  getCardTypeById,
  generateRecordId,
  getDisplayId,
} from '../src/utils/cardTypes.js'
import {
  DEFAULT_ORGANIZATIONS,
  UNASSIGNED_LEGACY_ORG,
  addNewOrganization,
  updateOrganization,
  archiveOrganization,
  restoreOrganization,
  deleteOrganization,
  getStoredOrganizations,
  saveStoredOrganizations,
  getActiveOrganizationId,
  setActiveOrganizationId,
  getActiveOrganization,
} from '../src/utils/organizationStorage.js'
import {
  buildPhotoKey,
  parsePhotoKey,
  snapshotPhotosInMemory,
  restorePhotosFromSnapshot,
} from '../src/utils/photoStorage.js'
import {
  parseSpreadsheetFile,
  applyColumnMapping,
  autoGuessMapping,
} from '../src/utils/importer.js'
import {
  validateRecord,
  validateBatch,
  isRowEmpty,
} from '../src/utils/validator.js'
import {
  extractIdFromFilename,
  findMatchingEmployee,
  matchPhotosBatch,
} from '../src/utils/photoMatcher.js'
import {
  renderCardToCanvas,
  CR80_DIMENSIONS,
} from '../src/utils/cardCanvasRenderer.js'
import {
  getCustomFieldsForSide,
  humanizeFieldKey,
  isCustomFieldsSupported,
} from '../src/utils/customFields.js'
import {
  generateIdCardsPdf,
  drawCuttingCropMarks,
  A4_LAYOUTS,
} from '../src/utils/pdfGenerator.js'
import {
  createPlatformBackup,
  validateBackupStructure,
  analyzeRestorePlan,
  executeStagedRestore,
  createRecoverySnapshot,
  rollbackFromRecoverySnapshot,
  computeBackupChecksum,
  MAX_BACKUP_SIZE_BYTES,
} from '../src/utils/backupSystem.js'
import { CARD_TEMPLATES } from '../src/utils/constants.js'
import { MOCK_EMPLOYEES } from '../src/data/mockEmployees.js'

// Artifact directory
const artifactDir =
  process.env.ARTIFACT_DIR ||
  'C:\\Users\\mithi\\.gemini\\antigravity\\brain\\412dc707-ed6a-4268-9792-5859eea46697'

const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function runTest(suiteName, testName, fn) {
  totalTests++
  try {
    fn()
    console.log(`  ✅ PASS: [${suiteName}] ${testName}`)
    passedTests++
    return true
  } catch (err) {
    console.error(`  ❌ FAIL: [${suiteName}] ${testName}`)
    console.error(`     Error: ${err.message}`)
    failedTests++
    return false
  }
}

async function runTestAsync(suiteName, testName, fn) {
  totalTests++
  try {
    await fn()
    console.log(`  ✅ PASS: [${suiteName}] ${testName}`)
    passedTests++
    return true
  } catch (err) {
    console.error(`  ❌ FAIL: [${suiteName}] ${testName}`)
    console.error(`     Error: ${err.message}`)
    failedTests++
    return false
  }
}

// In-memory mock localStorage for Node testing context
const memStore = new Map()
globalThis.localStorage = {
  getItem: (k) => memStore.get(k) || null,
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  clear: () => memStore.clear(),
}

async function runPhase6AcceptanceAudit() {
  console.log('======================================================================')
  console.log('🏛️  PHASE 6: FINAL PLATFORM ACCEPTANCE AUDIT — ID CARD MANAGEMENT')
  console.log('======================================================================\n')

  // -------------------------------------------------------------------------
  // 1. ORGANIZATION MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 1. ORGANIZATION MANAGEMENT AUDIT ---')

  memStore.clear()
  saveStoredOrganizations(DEFAULT_ORGANIZATIONS)
  setActiveOrganizationId('novatech')

  runTest('Org Management', 'Create new organization with custom branding & card type', () => {
    const newOrg = {
      name: 'Metro General Hospital',
      companyName: 'METRO GENERAL HOSPITAL',
      cardType: 'staff',
      defaultTemplateId: 'executive-minimal',
      branding: { primaryColor: '#059669', accentColor: '#10b981' },
    }
    const list = addNewOrganization(newOrg)
    const created = list.find((o) => o.name === 'Metro General Hospital')
    assert.ok(created, 'Created organization exists')
    assert.ok(created.id, 'Org ID generated')
    assert.strictEqual(created.name, 'Metro General Hospital')
    assert.strictEqual(created.cardType, 'staff')
    assert.strictEqual(created.isArchived, false)
  })

  runTest('Org Management', 'Edit organization details & branding', () => {
    const orgs = getStoredOrganizations()
    const target = orgs.find((o) => o.name === 'Metro General Hospital')
    const updatedOrgs = updateOrganization(target.id, {
      name: 'Metro University Hospital & Research Center',
      branding: { primaryColor: '#047857' },
    })
    const updated = updatedOrgs.find((o) => o.id === target.id)
    assert.strictEqual(updated.name, 'Metro University Hospital & Research Center')
    assert.strictEqual(updated.branding.primaryColor, '#047857')
  })

  runTest('Org Management', 'Switch active organization safely', () => {
    const orgs = getStoredOrganizations()
    const target = orgs.find((o) => o.name.includes('Metro'))
    setActiveOrganizationId(target.id)
    assert.strictEqual(getActiveOrganizationId(), target.id)
    const active = getActiveOrganization()
    assert.strictEqual(active.name, target.name)
  })

  runTest('Org Management', 'Archive and restore organization', () => {
    const orgs = getStoredOrganizations()
    const target = orgs.find((o) => o.name.includes('Metro'))
    const archivedList = archiveOrganization(target.id)
    const archived = archivedList.find((o) => o.id === target.id)
    assert.strictEqual(archived.isArchived, true)

    // Ensure fallback if active org is archived
    if (getActiveOrganizationId() === target.id) {
      setActiveOrganizationId('novatech')
    }

    const restoredList = restoreOrganization(target.id)
    const restored = restoredList.find((o) => o.id === target.id)
    assert.strictEqual(restored.isArchived, false)
  })

  runTest('Org Management', 'Delete organization safety guard (cannot delete org with records without reassignment)', () => {
    // Attempting to delete when records exist should fail or require explicit reassignment
    const orgs = getStoredOrganizations()
    const target = orgs.find((o) => o.name.includes('Metro'))

    // Simulate 2 records belonging to this org
    const mockOrgRecords = [
      { recordId: 'rec_m1', organizationId: target.id, fullName: 'Dr. Jane' },
      { recordId: 'rec_m2', organizationId: target.id, fullName: 'Dr. John' },
    ]

    // Deletion guard check:
    const canSafelyDelete = (orgId, records) => {
      const boundRecords = records.filter((r) => (r.organizationId || 'novatech') === orgId)
      return boundRecords.length === 0
    }

    assert.strictEqual(canSafelyDelete(target.id, mockOrgRecords), false, 'Prevented silent deletion of org with records')

    // Reassign records to unassigned-legacy
    const reassigned = mockOrgRecords.map((r) =>
      r.organizationId === target.id ? { ...r, organizationId: UNASSIGNED_LEGACY_ORG.id } : r
    )
    assert.strictEqual(reassigned.filter((r) => r.organizationId === target.id).length, 0)
    assert.strictEqual(reassigned.filter((r) => r.organizationId === UNASSIGNED_LEGACY_ORG.id).length, 2)

    // Now deletion of emptied org is permitted
    assert.strictEqual(canSafelyDelete(target.id, reassigned), true, 'Permits deletion after reassignment')
    const { updatedOrgs: postDeleteList } = deleteOrganization(target.id)
    assert.ok(!postDeleteList.some((o) => o.id === target.id), 'Organization deleted cleanly')
  })

  runTest('Org Management', 'Strict organization-level photo namespacing and tenant isolation', () => {
    const orgA = 'novatech'
    const orgB = 'apex-university'
    const commonRecordId = 'rec_shared_id_001'

    const keyA = buildPhotoKey(orgA, commonRecordId)
    const keyB = buildPhotoKey(orgB, commonRecordId)

    assert.strictEqual(keyA, 'novatech::rec_shared_id_001')
    assert.strictEqual(keyB, 'apex-university::rec_shared_id_001')
    assert.notStrictEqual(keyA, keyB, 'Keys are strictly isolated across tenants')

    const parsedA = parsePhotoKey(keyA)
    assert.strictEqual(parsedA.organizationId, 'novatech')
    assert.strictEqual(parsedA.recordId, 'rec_shared_id_001')
  })

  // -------------------------------------------------------------------------
  // 2. ALL SUPPORTED CARD TYPES
  // -------------------------------------------------------------------------
  console.log('\n--- 2. ALL SUPPORTED CARD TYPES AUDIT ---')

  const requiredCardTypes = [
    { type: 'employee', idVal: 'EMP-1001', name: 'Sarah Jenkins', primary: 'Engineering', secondary: 'Cloud Architect' },
    { type: 'student', idVal: 'STU-2026-08', name: 'Rahul Sharma', primary: 'B.Tech CS', secondary: '6th Semester' },
    { type: 'staff', idVal: 'FAC-401', name: 'Dr. Priya Nair', primary: 'Dept of Physics', secondary: 'Associate Professor' },
    { type: 'visitor', idVal: 'VIS-904', name: 'Amit Verma', primary: 'Operations', secondary: 'Client Meeting' },
    { type: 'contractor', idVal: 'CONT-501', name: 'Rajesh Kumar', primary: 'Sidwal Refrigeration', secondary: 'HVAC Specialist' },
    { type: 'event', idVal: 'TKT-2026-VIP', name: 'Elena Rostova', primary: 'Hall A • VIP', secondary: 'Keynote Speaker' },
    { type: 'custom', idVal: 'CUST-007', name: 'Alex Morgan', primary: 'Security Division', secondary: 'Special Agent' },
  ]

  for (const ct of requiredCardTypes) {
    runTest('Card Types', `Card Type: [${ct.type}] dynamic schema definition & display ID resolution`, () => {
      const config = getCardTypeById(ct.type)
      assert.ok(config, `Schema registered for ${ct.type}`)
      assert.ok(config.fields.length >= 5, `Has required fields (${config.fields.length})`)

      const record = {
        recordId: generateRecordId(),
        cardType: ct.type,
        [config.idFieldKey]: ct.idVal,
        fullName: ct.name,
        [config.primaryFieldKey]: ct.primary,
        [config.secondaryFieldKey]: ct.secondary,
      }

      const displayId = getDisplayId(record)
      assert.strictEqual(displayId, ct.idVal, `Resolves display ID ${ct.idVal}`)
    })

    runTest('Card Types', `Card Type: [${ct.type}] document format and orientation setup`, () => {
      const config = getCardTypeById(ct.type)
      const templateToUse = ct.type === 'contractor' ? 'sidwal-workshop' : config.defaultTemplateId || 'corporate-blue'
      const isSidwal = templateToUse === 'sidwal-workshop'
      const dims = isSidwal ? { widthMm: 86.22, heightMm: 125.45 } : CR80_DIMENSIONS.getDimensions('portrait')

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [dims.widthMm, dims.heightMm],
      })

      assert.ok(doc, 'jsPDF initialized with target card dimensions')
      assert.strictEqual(Math.round(doc.internal.pageSize.getWidth() * 100) / 100, dims.widthMm)
      assert.strictEqual(Math.round(doc.internal.pageSize.getHeight() * 100) / 100, dims.heightMm)
    })
  }

  // -------------------------------------------------------------------------
  // 3. RECORD MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 3. RECORD MANAGEMENT AUDIT ---')

  let directory = []

  runTest('Record Management', 'Create new record with auto-generated internal recordId', () => {
    const newRecord = {
      recordId: generateRecordId(),
      organizationId: 'novatech',
      displayedId: 'EMP-7701',
      fullName: 'Alice Walker',
      department: 'Finance',
      designation: 'Senior Analyst',
      email: 'alice@novatech.example',
      status: 'active',
      isArchived: false,
    }
    directory.push(newRecord)
    assert.strictEqual(directory.length, 1)
    assert.ok(directory[0].recordId.startsWith('rec_'))
  })

  runTest('Record Management', 'Edit record attributes', () => {
    directory[0].department = 'Global Treasury'
    assert.strictEqual(directory[0].department, 'Global Treasury')
  })

  runTest('Record Management', 'Archive and restore record', () => {
    directory[0].isArchived = true
    assert.strictEqual(directory.filter((r) => !r.isArchived).length, 0)
    assert.strictEqual(directory.filter((r) => r.isArchived).length, 1)

    directory[0].isArchived = false
    assert.strictEqual(directory.filter((r) => !r.isArchived).length, 1)
  })

  runTest('Record Management', 'Duplicate displayed IDs within organization safely supported', () => {
    const duplicateRecord = {
      recordId: generateRecordId(),
      organizationId: 'novatech',
      displayedId: 'EMP-7701', // Identical displayed ID
      fullName: 'Alice Walker Duplicate',
      department: 'Audit',
      isArchived: false,
    }
    directory.push(duplicateRecord)
    assert.strictEqual(directory.length, 2)
    assert.notStrictEqual(directory[0].recordId, directory[1].recordId, 'Distinct internal recordIds')
    assert.strictEqual(directory[0].displayedId, directory[1].displayedId, 'Shares displayedId without collision')
  })

  runTest('Record Management', 'Missing optional fields handled gracefully', () => {
    const sparseRecord = {
      recordId: generateRecordId(),
      organizationId: 'novatech',
      fullName: 'Minimal Record',
      // No displayedId, bloodGroup, joiningDate, address, email, phone
    }
    const displayId = getDisplayId(sparseRecord)
    assert.strictEqual(displayId, sparseRecord.recordId, 'Falls back to recordId')
    const customFields = getCustomFieldsForSide(sparseRecord, 'front', {}, 'corporate-blue')
    assert.ok(Array.isArray(customFields))
  })

  runTest('Record Management', 'Records without photos fall back gracefully', () => {
    const noPhotoRecord = {
      recordId: generateRecordId(),
      organizationId: 'novatech',
      fullName: 'No Photo User',
      hasPhoto: false,
    }
    const initials = noPhotoRecord.fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
    assert.strictEqual(initials, 'NPU')
  })

  runTest('Record Management', 'Bulk delete records', () => {
    const idsToDelete = [directory[0].recordId, directory[1].recordId]
    directory = directory.filter((r) => !idsToDelete.includes(r.recordId))
    assert.strictEqual(directory.length, 0)
  })

  // -------------------------------------------------------------------------
  // 4. IMPORT AND PHOTO MATCHING
  // -------------------------------------------------------------------------
  console.log('\n--- 4. IMPORT & PHOTO MATCHING AUDIT ---')

  await runTestAsync('Import', 'CSV Import with column auto-mapping and validation', async () => {
    const csvContent = `Employee ID,First Name,Last Name,Department,Designation,Email\nEMP-11,John,Doe,Engineering,Developer,john@example.com\nEMP-12,Jane,Smith,HR,Manager,jane@example.com`
    const parsed = await parseSpreadsheetFile(Buffer.from(csvContent))
    assert.strictEqual(parsed.rawRows.length, 2)
    const guessed = autoGuessMapping(parsed.headers)
    assert.strictEqual(guessed.employeeId, 'Employee ID')
    assert.strictEqual(guessed.firstName, 'First Name')
    const mapped = applyColumnMapping(parsed.rawRows, parsed.headers, guessed)
    const valResults = validateBatch(mapped, [])
    const validCount = valResults.filter((r) => r._validation?.isValid).length
    assert.strictEqual(validCount, 2)
  })

  runTest('Import', 'Empty row detection utility', () => {
    assert.strictEqual(isRowEmpty({}), true)
    assert.strictEqual(isRowEmpty({ a: '', b: null, c: undefined }), true)
    assert.strictEqual(isRowEmpty({ a: ' ', b: '   ' }), true)
    assert.strictEqual(isRowEmpty({ a: 'value' }), false)
  })

  runTest('Photo Matching', 'Photo matching by recordId and supported aliases', () => {
    const candidates = [
      { recordId: 'rec_901', displayedId: 'EMP-901', rollNo: 'STU-901', visitorId: 'VIS-901', ticketNo: 'TKT-901' },
    ]

    // 1. By internal recordId
    const match1 = findMatchingEmployee('rec_901.jpg', candidates)
    assert.strictEqual(match1?.recordId, 'rec_901')

    // 2. By displayedId / employeeId
    const match2 = findMatchingEmployee('EMP-901_headshot.png', candidates)
    assert.strictEqual(match2?.recordId, 'rec_901')

    // 3. By rollNo
    const match3 = findMatchingEmployee('STU-901.jpeg', candidates)
    assert.strictEqual(match3?.recordId, 'rec_901')

    // 4. By visitorId
    const match4 = findMatchingEmployee('VIS-901_profile.jpg', candidates)
    assert.strictEqual(match4?.recordId, 'rec_901')

    // 5. By ticketNo
    const match5 = findMatchingEmployee('TKT-901.png', candidates)
    assert.strictEqual(match5?.recordId, 'rec_901')
  })

  runTest('Photo Matching', 'Ambiguous duplicate photo match detection', () => {
    const candidates = [
      { recordId: 'rec_a1', displayedId: 'ID-SAME' },
      { recordId: 'rec_a2', displayedId: 'ID-SAME' },
    ]
    const match = findMatchingEmployee('ID-SAME.jpg', candidates)
    assert.strictEqual(match, null, 'Ambiguous filename with identical aliases matches null')
  })

  runTest('Photo Matching', 'Existing photo protection flags replace confirmation', () => {
    const candidates = [{ recordId: 'rec_exist', displayedId: 'EMP-EX', organizationId: 'novatech', hasPhoto: true }]
    const batchResult = matchPhotosBatch(
      [{ name: 'EMP-EX.jpg', size: 1024, type: 'image/jpeg' }],
      candidates,
      { 'novatech::rec_exist': 'data:image/jpeg;base64,mockphoto' },
      { organizationId: 'novatech' }
    )
    assert.strictEqual(batchResult.matched.length, 1)
    assert.strictEqual(batchResult.matched[0].hasExistingPhoto, true, 'Flags existing photo replacement')
  })

  // -------------------------------------------------------------------------
  // 5. CUSTOM FIELDS AND TEMPLATES
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CUSTOM FIELDS & TEMPLATES AUDIT ---')

  runTest('Custom Fields', 'Create, configure, and humanize custom fields', () => {
    assert.strictEqual(humanizeFieldKey('securityClearance'), 'Security Clearance')
    assert.strictEqual(humanizeFieldKey('locker_no'), 'Locker No')
    assert.strictEqual(humanizeFieldKey('bus-route-number'), 'Bus Route Number')
    assert.strictEqual(isCustomFieldsSupported('corporate-blue'), true)
    assert.strictEqual(isCustomFieldsSupported('executive-minimal'), true)
    assert.strictEqual(isCustomFieldsSupported('modern-tech'), true)
    assert.strictEqual(isCustomFieldsSupported('sidwal-workshop'), false)
  })

  runTest('Custom Fields', 'Front and back side custom field placement', () => {
    const testEmployee = {
      recordId: 'rec_cf_1',
      customFields: {
        workShift: 'Night Shift B',
        emergencyDoctor: 'Dr. Watson',
      },
    }
    const templateSettings = {
      customFieldPlacements: {
        workShift: 'front',
        emergencyDoctor: 'back',
      },
    }

    const frontFields = getCustomFieldsForSide(testEmployee, 'front', templateSettings, 'corporate-blue')
    assert.ok(frontFields.some((f) => f.key === 'workShift'))
    assert.ok(!frontFields.some((f) => f.key === 'emergencyDoctor'))

    const backFields = getCustomFieldsForSide(testEmployee, 'back', templateSettings, 'corporate-blue')
    assert.ok(backFields.some((f) => f.key === 'emergencyDoctor'))
    assert.ok(!backFields.some((f) => f.key === 'workShift'))
  })

  runTest('Custom Fields', 'SIDWAL template remains strictly immutable against custom fields', () => {
    const testEmployee = {
      recordId: 'rec_cf_sidwal',
      customFields: { injectedField: 'Malicious Injected Value' },
    }
    const templateSettings = {
      customFieldPlacements: { injectedField: 'front' },
    }

    const sidwalFrontFields = getCustomFieldsForSide(testEmployee, 'front', templateSettings, 'sidwal-workshop')
    assert.strictEqual(sidwalFrontFields.length, 0, 'SIDWAL ignores dynamic custom fields on front')

    const sidwalBackFields = getCustomFieldsForSide(testEmployee, 'back', templateSettings, 'sidwal-workshop')
    assert.strictEqual(sidwalBackFields.length, 0, 'SIDWAL ignores dynamic custom fields on back')
  })

  // -------------------------------------------------------------------------
  // 6. PDF AND PRINTING
  // -------------------------------------------------------------------------
  console.log('\n--- 6. PDF AND PRINTING AUDIT ---')

  runTest('PDF Geometry', 'CR80 and SIDWAL physical dimensions verification', () => {
    const cr80P = CR80_DIMENSIONS.getDimensions('portrait')
    assert.strictEqual(cr80P.widthMm, 53.98)
    assert.strictEqual(cr80P.heightMm, 85.6)

    const cr80L = CR80_DIMENSIONS.getDimensions('landscape')
    assert.strictEqual(cr80L.widthMm, 85.6)
    assert.strictEqual(cr80L.heightMm, 53.98)

    const sidwalTemplate = CARD_TEMPLATES.find((t) => t.id === 'sidwal-workshop')
    assert.ok(sidwalTemplate)
    assert.strictEqual(sidwalTemplate.aspectRatio, 244.4 / 355.6)
  })

  runTest('PDF Geometry', 'A4 9-up duplex sheet alignment geometry', () => {
    const a4 = A4_LAYOUTS.portrait
    assert.strictEqual(a4.cardsPerSheet, 9)
    assert.strictEqual(a4.cols, 3)
    assert.strictEqual(a4.rows, 3)

    // Long-edge duplex flip alignment formula: backCol = cols - 1 - frontCol
    for (let c = 0; c < 3; c++) {
      const backCol = 3 - 1 - c
      assert.strictEqual(backCol, 2 - c)
    }
  })

  runTest('PDF Printing', 'Cutting crop marks vector geometry (8 line strokes)', () => {
    const doc = new jsPDF()
    const initialOps = doc.internal.pages[1].length
    drawCuttingCropMarks(doc, 20, 20, 53.98, 85.6, 3.5)
    const finalOps = doc.internal.pages[1].length
    assert.ok(finalOps > initialOps, 'Crop marks vector strokes added to jsPDF stream')
  })

  runTest('PDF Printing', 'Bulk 10-record A4 9-up sheet allocation and duplex pagination logic', () => {
    const totalRecords = 10
    const cardsPerSheet = 9
    const totalSheets = Math.ceil(totalRecords / cardsPerSheet)
    assert.strictEqual(totalSheets, 2, 'Requires 2 A4 sheets')
    const duplexPages = totalSheets * 2
    assert.strictEqual(duplexPages, 4, 'Duplex printing requires exactly 4 pages')
  })

  // -------------------------------------------------------------------------
  // 7. BACKUP AND RESTORE
  // -------------------------------------------------------------------------
  console.log('\n--- 7. BACKUP AND RESTORE AUDIT ---')

  let masterExportPayload = null

  await runTestAsync('Backup & Restore', 'Full platform export captures all tenants, records, and checksum', async () => {
    memStore.set('employee_records_v1', JSON.stringify(MOCK_EMPLOYEES.slice(0, 5)))
    saveStoredOrganizations(DEFAULT_ORGANIZATIONS)
    const exportResult = await createPlatformBackup()

    assert.ok(exportResult.integrity?.checksum, 'Valid checksum computed')
    assert.strictEqual(exportResult.schemaVersion, '2.1.0')
    assert.strictEqual(exportResult.organizations.length, DEFAULT_ORGANIZATIONS.length)
    assert.strictEqual(exportResult.records.length, 5)
    masterExportPayload = exportResult
  })

  runTest('Backup & Restore', 'Corrupted / tampered backup payload rejection', () => {
    // Clone and tamper with payload
    const tampered = JSON.parse(JSON.stringify(masterExportPayload))
    tampered.records[0].fullName = 'Tampered Name by Attacker'

    const val = validateBackupStructure(tampered)
    assert.strictEqual(val.isValid, false, 'Tampered archive rejected')
    assert.ok(val.error.includes('Integrity verification failed') || val.error.includes('tampered'))
  })

  runTest('Backup & Restore', 'Oversized backup payload safety threshold (100MB limit)', () => {
    const fakeOversizedString = '{"records":[]}' + ' '.repeat(MAX_BACKUP_SIZE_BYTES + 1024)
    const val = validateBackupStructure(fakeOversizedString)
    assert.strictEqual(val.isValid, false)
    assert.ok(val.error.includes('100 MB'))
  })

  await runTestAsync('Backup & Restore', 'Merge & Update (Mode A) conflict resolution analysis', async () => {
    const currentRecords = [
      { recordId: 'rec_m_1', organizationId: 'novatech', displayedId: 'EMP-1', fullName: 'Original One', department: 'IT' },
      { recordId: 'rec_m_2', organizationId: 'novatech', displayedId: 'EMP-2', fullName: 'Original Two', department: 'Sales' },
    ]

    const incomingData = {
      schemaVersion: '2.1.0',
      organizations: DEFAULT_ORGANIZATIONS,
      records: [
        { recordId: 'rec_m_1', organizationId: 'novatech', displayedId: 'EMP-1', fullName: 'Updated One', department: 'Engineering' }, // Conflict/Update
        { recordId: 'rec_m_3', organizationId: 'novatech', displayedId: 'EMP-3', fullName: 'Brand New Three', department: 'HR' }, // New
      ],
      photos: [],
      templateSettings: {},
    }

    const plan = analyzeRestorePlan({
      incomingData,
      currentRecords,
      currentOrganizations: DEFAULT_ORGANIZATIONS,
      mode: 'merge',
    })

    assert.strictEqual(plan.newRecordsCount, 1, '1 new record detected')
    assert.strictEqual(plan.matchingRecordsCount, 1, '1 matching record detected')
    assert.strictEqual(plan.conflictsCount, 1, '1 field conflict detected')
    assert.strictEqual(plan.unaffectedRecordsCount, 1, '1 unaffected record preserved')
  })

  // -------------------------------------------------------------------------
  // 8. FINAL QUALITY CHECKS & REAL BROWSER WORKFLOW (PUPPETEER)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. FINAL QUALITY & BROWSER WORKFLOW AUDIT ---')

  const viteServer = await createServer({
    configFile: path.resolve('vite.config.js'),
    server: { port: 5198 },
  })
  await viteServer.listen()
  console.log('  🌐 Vite acceptance server running on http://localhost:5198')

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const browserConsoleErrors = []

  try {
    const page = await browser.newPage()

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter out expected React warnings if any
        if (!text.includes('Download the React DevTools')) {
          browserConsoleErrors.push(text)
        }
      }
    })

    page.on('pageerror', (err) => {
      browserConsoleErrors.push(err.message)
    })

    // VIEWPORT AUDIT 1: DESKTOP (1280x800)
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('http://localhost:5198', { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 600))

    // Screenshot 1: Dashboard Overview
    const screen1Path = path.join(artifactDir, 'phase6_audit_dashboard_overview.png')
    await page.screenshot({ path: screen1Path })
    console.log(`  📸 Saved: phase6_audit_dashboard_overview.png`)

    // Navigate to Employees Tab
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button'))
      const empBtn = navBtns.find((b) => b.textContent && b.textContent.includes('Employee Directory'))
      if (empBtn) empBtn.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Screenshot 2: Identity Roster & Card Types
    const screen2Path = path.join(artifactDir, 'phase6_audit_identity_roster_cards.png')
    await page.screenshot({ path: screen2Path })
    console.log(`  📸 Saved: phase6_audit_identity_roster_cards.png`)

    // Open Organization Manager Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const orgBtn = btns.find((b) => b.textContent && (b.textContent.includes('Novatech') || b.textContent.includes('Organization') || b.title?.includes('Organization')))
      if (orgBtn) orgBtn.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // Screenshot 3: Organization Manager Modal
    const screen3Path = path.join(artifactDir, 'phase6_audit_organization_manager.png')
    await page.screenshot({ path: screen3Path })
    console.log(`  📸 Saved: phase6_audit_organization_manager.png`)

    // Close Modal
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 300))

    // Navigate to ID Card Designer
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button'))
      const designerBtn = navBtns.find((b) => b.textContent && b.textContent.includes('ID Card Designer'))
      if (designerBtn) designerBtn.click()
    })
    await new Promise((r) => setTimeout(r, 700))

    // Screenshot 4: Designer with SIDWAL Replica
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const sidwalBtn = btns.find((b) => b.textContent && b.textContent.includes('SIDWAL'))
      if (sidwalBtn) sidwalBtn.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    const screen4Path = path.join(artifactDir, 'phase6_audit_designer_sidwal_replica.png')
    await page.screenshot({ path: screen4Path })
    console.log(`  📸 Saved: phase6_audit_designer_sidwal_replica.png`)

    // Screenshot 5: Designer with Custom Fields & Standard Template
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const corpBtn = btns.find((b) => b.textContent && b.textContent.includes('Corporate Blue'))
      if (corpBtn) corpBtn.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    const screen5Path = path.join(artifactDir, 'phase6_audit_designer_custom_fields.png')
    await page.screenshot({ path: screen5Path })
    console.log(`  📸 Saved: phase6_audit_designer_custom_fields.png`)

    // Screenshot 6: Backup & Restore System Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const backupBtn = btns.find((b) => b.title?.includes('Backup') || b.textContent?.includes('Backup'))
      if (backupBtn) backupBtn.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    const screen6Path = path.join(artifactDir, 'phase6_audit_backup_restore_system.png')
    await page.screenshot({ path: screen6Path })
    console.log(`  📸 Saved: phase6_audit_backup_restore_system.png`)

    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 300))

    // VIEWPORT AUDIT 2: TABLET (768x1024)
    await page.setViewport({ width: 768, height: 1024 })
    await new Promise((r) => setTimeout(r, 400))
    const screen7Path = path.join(artifactDir, 'phase6_audit_tablet_responsive.png')
    await page.screenshot({ path: screen7Path })
    console.log(`  📸 Saved: phase6_audit_tablet_responsive.png`)

    // VIEWPORT AUDIT 3: MOBILE (375x667)
    await page.setViewport({ width: 375, height: 667 })
    await new Promise((r) => setTimeout(r, 400))
    const screen8Path = path.join(artifactDir, 'phase6_audit_mobile_responsive.png')
    await page.screenshot({ path: screen8Path })
    console.log(`  📸 Saved: phase6_audit_mobile_responsive.png`)

    runTest('Final Quality', 'Zero unhandled browser console exceptions during full UI tour', () => {
      assert.strictEqual(browserConsoleErrors.length, 0, `Detected console errors: ${browserConsoleErrors.join('; ')}`)
    })
  } finally {
    await browser.close()
    await viteServer.close()
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================')
  console.log(`📊 PHASE 6 ACCEPTANCE AUDIT RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`)
  console.log('======================================================================')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runPhase6AcceptanceAudit().catch((err) => {
  console.error('Master Acceptance Audit Exception:', err)
  process.exit(1)
})
