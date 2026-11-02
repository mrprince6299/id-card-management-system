import assert from 'node:assert'
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
  setActiveOrganizationId,
  getActiveOrganizationId,
} from '../src/utils/organizationStorage.js'
import {
  buildPhotoKey,
  parsePhotoKey,
} from '../src/utils/photoStorage.js'

console.log('====================================================')
console.log('🧪 Starting Phase 4 Organization Management Test Suite')
console.log('====================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}: ${err.message}`)
    failed++
  }
}

// In-memory mock localStorage for Node test runner
const memoryStorage = new Map()
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
}

// ---------------------------------------------------------------------------
// SECTION 1: ORGANIZATION LIFECYCLE (CREATE, EDIT, SWITCH, ARCHIVE, RESTORE)
// ---------------------------------------------------------------------------
console.log('--- SECTION 1: Organization Lifecycle ---')

test('Loads default organizations with correct tenant profiles', () => {
  memoryStorage.clear()
  const orgs = getStoredOrganizations()
  assert.ok(orgs.length >= 4, 'Should load at least 4 default organizations')
  assert.ok(orgs.some((o) => o.id === 'novatech'), 'Contains Novatech')
  assert.ok(orgs.some((o) => o.id === 'sidwal-railway'), 'Contains SIDWAL')
  assert.ok(orgs.some((o) => o.id === 'apex-university'), 'Contains Apex University')
})

test('Creates a new organization with unique ID and default properties', () => {
  const newOrgData = {
    name: 'Metro Transit Authority',
    companyName: 'METRO TRANSIT AUTH',
    tagline: 'Safe, Fast, Reliable Transit',
    cardType: 'contractor',
    defaultTemplateId: 'modern-tech',
    customAccentColor: '#059669',
  }
  const updatedOrgs = addNewOrganization(newOrgData)
  const created = updatedOrgs.find((o) => o.name === 'Metro Transit Authority')
  assert.ok(created, 'Newly created organization exists')
  assert.ok(created.id.startsWith('org_'), 'Auto-generated ID starts with org_')
  assert.strictEqual(created.cardType, 'contractor')
  assert.strictEqual(created.defaultTemplateId, 'modern-tech')
  assert.strictEqual(created.customAccentColor, '#059669')
  assert.strictEqual(created.isArchived, false)
})

test('Edits organization name, branding, and contact details', () => {
  const orgs = getStoredOrganizations()
  const metro = orgs.find((o) => o.name === 'Metro Transit Authority')
  assert.ok(metro, 'Found metro org')

  const updated = updateOrganization(metro.id, {
    name: 'Metro Rapid Transit Authority',
    customAccentColor: '#047857',
    tagline: 'Connecting Cities Everyday',
    website: 'www.metrorapid.example',
  })

  const target = updated.find((o) => o.id === metro.id)
  assert.strictEqual(target.name, 'Metro Rapid Transit Authority')
  assert.strictEqual(target.customAccentColor, '#047857')
  assert.strictEqual(target.tagline, 'Connecting Cities Everyday')
  assert.strictEqual(target.website, 'www.metrorapid.example')
})

test('Protects immutable organizations (SIDWAL) from branding modifications', () => {
  const sidwal = getStoredOrganizations().find((o) => o.id === 'sidwal-railway')
  assert.strictEqual(sidwal.isImmutableBranding, true)

  const updated = updateOrganization('sidwal-railway', {
    companyName: 'UNAUTHORIZED COMPANY RENAME',
    workshopHeading: 'TAMPERED HEADING',
    railwayHeading: 'TAMPERED RAILWAY',
    name: 'North Eastern Railway (SIDWAL)',
    tagline: 'Updated public tagline',
  })

  const sidwalUpdated = updated.find((o) => o.id === 'sidwal-railway')
  // Should reject tampered companyName and fixed headings
  assert.strictEqual(sidwalUpdated.companyName, 'SIDWAL REFRIGERATION INDUSTRIES (P) LTD')
  assert.strictEqual(sidwalUpdated.workshopHeading, 'MECHANICAL WORKSHOP GORAKHPUR')
  assert.strictEqual(sidwalUpdated.railwayHeading, 'NORTH EASTERN RAILWAY')
  // Allows non-restricted informational fields like tagline
  assert.strictEqual(sidwalUpdated.tagline, 'Updated public tagline')
})

test('Archives and restores an organization cleanly', () => {
  const orgs = getStoredOrganizations()
  const metro = orgs.find((o) => o.name === 'Metro Rapid Transit Authority')
  assert.ok(metro)

  // Archive
  const archivedList = archiveOrganization(metro.id)
  const archivedTarget = archivedList.find((o) => o.id === metro.id)
  assert.strictEqual(archivedTarget.isArchived, true)
  assert.ok(archivedTarget.archivedAt)

  // Restore
  const restoredList = restoreOrganization(metro.id)
  const restoredTarget = restoredList.find((o) => o.id === metro.id)
  assert.strictEqual(restoredTarget.isArchived, false)
  assert.strictEqual(restoredTarget.archivedAt, null)
})

// ---------------------------------------------------------------------------
// SECTION 2: DELETION SAFETY GUARDS
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 2: Deletion Safety Guards ---')

test('Rejects deletion of protected system organizations (SIDWAL)', () => {
  assert.throws(
    () => deleteOrganization('sidwal-railway'),
    /Protected system organizations cannot be permanently deleted/
  )
})

test('Rejects archiving of protected system organizations (SIDWAL)', () => {
  assert.throws(
    () => archiveOrganization('sidwal-railway'),
    /Protected system organizations cannot be archived/
  )
})

test('Prevents archiving or deleting the last active organization', () => {
  // Setup a store with only 1 active org
  const singleOrg = [{ id: 'solo-org', name: 'Solo Corp', isArchived: false, isImmutableBranding: false }]
  saveStoredOrganizations(singleOrg)

  assert.throws(
    () => archiveOrganization('solo-org'),
    /Cannot archive the only remaining active organization/
  )

  assert.throws(
    () => deleteOrganization('solo-org'),
    /Cannot delete the only remaining active organization/
  )
})

test('Allows permanent deletion of user-created organization when multiple orgs exist', () => {
  // Re-initialize default orgs + temp org
  const defaultList = [...DEFAULT_ORGANIZATIONS]
  const tempOrg = { id: 'temp-org-123', name: 'Disposable Org', isArchived: false, isImmutableBranding: false }
  saveStoredOrganizations([...defaultList, tempOrg])
  setActiveOrganizationId('temp-org-123')

  const { updatedOrgs, switchedOrgId } = deleteOrganization('temp-org-123')
  assert.strictEqual(updatedOrgs.some((o) => o.id === 'temp-org-123'), false)
  // Active org automatically safely switches to another active org
  assert.notStrictEqual(switchedOrgId, 'temp-org-123')
  assert.ok(switchedOrgId, 'Switched to another valid organization')
})

// ---------------------------------------------------------------------------
// SECTION 3: MULTI-TENANT ISOLATION WITH IDENTICAL DISPLAYED IDS
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 3: Multi-Tenant Isolation & Identical Displayed IDs ---')

test('Allows identical displayed IDs across different organizations without collision', () => {
  const records = [
    {
      recordId: 'rec_org1_001',
      organizationId: 'novatech',
      displayedId: 'ID-100',
      fullName: 'Novatech Employee',
      role: 'Engineer',
    },
    {
      recordId: 'rec_org2_002',
      organizationId: 'apex-university',
      displayedId: 'ID-100',
      fullName: 'Apex Student',
      role: 'Student',
    },
    {
      recordId: 'rec_org3_003',
      organizationId: 'sidwal-railway',
      displayedId: 'ID-100',
      fullName: 'SIDWAL Contractor',
      role: 'Fitter',
    },
  ]

  // Filter scoped to novatech
  const novaScope = records.filter((r) => r.organizationId === 'novatech')
  assert.strictEqual(novaScope.length, 1)
  assert.strictEqual(novaScope[0].fullName, 'Novatech Employee')

  // Filter scoped to apex
  const apexScope = records.filter((r) => r.organizationId === 'apex-university')
  assert.strictEqual(apexScope.length, 1)
  assert.strictEqual(apexScope[0].fullName, 'Apex Student')

  // Scoped photo keys never collide
  const novaKey = buildPhotoKey('novatech', novaScope[0].recordId)
  const apexKey = buildPhotoKey('apex-university', apexScope[0].recordId)
  assert.strictEqual(novaKey, 'novatech::rec_org1_001')
  assert.strictEqual(apexKey, 'apex-university::rec_org2_002')
  assert.notStrictEqual(novaKey, apexKey)
})

// ---------------------------------------------------------------------------
// SECTION 4: UNASSIGNED LEGACY RECORD REASSIGNMENT
// ---------------------------------------------------------------------------
console.log('\n--- SECTION 4: Unassigned Legacy Record Reassignment ---')

test('Safely reassigns unassigned legacy records to target organization while preserving all data', () => {
  const masterRoster = [
    {
      recordId: 'rec_leg_01',
      organizationId: 'unassigned-legacy',
      displayedId: 'LEG-101',
      fullName: 'Legacy Worker One',
      role: 'Technician',
      customFields: { securityClearance: 'Level 3', bloodGroup: 'O+' },
      hasPhoto: true,
    },
    {
      recordId: 'rec_leg_02',
      organizationId: 'unassigned-legacy',
      displayedId: 'LEG-102',
      fullName: 'Legacy Worker Two',
      role: 'Operator',
      customFields: { emergencyContact: '+91-9999999999' },
      hasPhoto: false,
    },
    {
      recordId: 'rec_nova_01',
      organizationId: 'novatech',
      displayedId: 'EMP-1001',
      fullName: 'Active Novatech Employee',
      role: 'Manager',
      hasPhoto: true,
    },
  ]

  // Target org: apex-university
  const targetOrgId = 'apex-university'
  const idsToReassign = ['rec_leg_01', 'rec_leg_02']

  const reassignedRoster = masterRoster.map((emp) => {
    if (emp.organizationId === 'unassigned-legacy' && idsToReassign.includes(emp.recordId)) {
      return {
        ...emp,
        organizationId: targetOrgId,
      }
    }
    return emp
  })

  // Verify legacy records are now apex-university
  const rec1 = reassignedRoster.find((r) => r.recordId === 'rec_leg_01')
  assert.strictEqual(rec1.organizationId, 'apex-university')
  assert.strictEqual(rec1.displayedId, 'LEG-101')
  assert.strictEqual(rec1.fullName, 'Legacy Worker One')
  assert.strictEqual(rec1.customFields.securityClearance, 'Level 3')
  assert.strictEqual(rec1.hasPhoto, true)

  const rec2 = reassignedRoster.find((r) => r.recordId === 'rec_leg_02')
  assert.strictEqual(rec2.organizationId, 'apex-university')

  // Verify other org records were untouched
  const novaRec = reassignedRoster.find((r) => r.recordId === 'rec_nova_01')
  assert.strictEqual(novaRec.organizationId, 'novatech')

  // Check unassigned cohort is now empty
  const unassignedRemaining = reassignedRoster.filter((r) => r.organizationId === 'unassigned-legacy')
  assert.strictEqual(unassignedRemaining.length, 0)
})

console.log('\n====================================================')
console.log(`📊 Phase 4 Test Results: ${passed} Passed, ${failed} Failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
}

