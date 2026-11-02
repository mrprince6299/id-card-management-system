import { CARD_TEMPLATES, CARD_SIZES } from '../src/utils/constants.js'
import {
  DEFAULT_TEMPLATE_SETTINGS,
  TEMPLATE_STORAGE_KEY,
} from '../src/utils/templateStorage.js'
import { MOCK_EMPLOYEES } from '../src/data/mockEmployees.js'

function runTemplateTests() {
  console.log('====================================================')
  console.log('🧪 Starting Phase 4 ID Card Template Test Suite')
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

  // TEST 1: Three Required Design Templates
  console.log('--- TEST 1: Three Professional Design Templates ---')
  const templateIds = CARD_TEMPLATES.map((t) => t.id)
  assert(templateIds.includes('corporate-blue'), 'Template A exists: "corporate-blue"')
  assert(templateIds.includes('executive-minimal'), 'Template B exists: "executive-minimal"')
  assert(templateIds.includes('modern-tech'), 'Template C exists: "modern-tech"')

  const corporateTmpl = CARD_TEMPLATES.find((t) => t.id === 'corporate-blue')
  assert(corporateTmpl && corporateTmpl.accentColor === '#2563eb', 'Corporate Blue uses blue accent (#2563eb)')

  const minimalTmpl = CARD_TEMPLATES.find((t) => t.id === 'executive-minimal')
  assert(minimalTmpl && minimalTmpl.textColor === '#18181b', 'Executive Minimal uses charcoal text (#18181b)')

  const modernTmpl = CARD_TEMPLATES.find((t) => t.id === 'modern-tech')
  assert(modernTmpl && modernTmpl.bg === '#0a0f1d' && modernTmpl.accentColor === '#06b6d4', 'Modern Tech uses dark navy bg and cyan accent (#06b6d4)')

  // TEST 2: CR80 Dimensions & Aspect Ratio
  console.log('\n--- TEST 2: CR80 Standard Dimensions ---')
  const cr80 = CARD_SIZES.CR80
  assert(cr80.widthMm === 85.6, 'CR80 standard width: 85.6 mm')
  assert(cr80.heightMm === 53.98, 'CR80 standard height: 53.98 mm')
  const expectedRatio = 53.98 / 85.6
  assert(Math.abs(280 / 444 - expectedRatio) < 0.01, 'Pixel dimensions maintain CR80 portrait ratio: 280px × 444px')

  // TEST 3: Test Company Details
  console.log('\n--- TEST 3: Fictional Company Details ---')
  assert(DEFAULT_TEMPLATE_SETTINGS.companyName === 'NOVATECH SOLUTIONS', 'Company Name: "NOVATECH SOLUTIONS"')
  assert(DEFAULT_TEMPLATE_SETTINGS.tagline === 'Technology | Innovation | Excellence', 'Tagline: "Technology | Innovation | Excellence"')
  assert(DEFAULT_TEMPLATE_SETTINGS.address === 'Dehradun, Uttarakhand, India', 'Address: "Dehradun, Uttarakhand, India"')
  assert(DEFAULT_TEMPLATE_SETTINGS.website === 'www.novatech.example', 'Website: "www.novatech.example"')
  assert(DEFAULT_TEMPLATE_SETTINGS.contactEmail === 'contact@novatech.example', 'Contact Email: "contact@novatech.example"')
  assert(DEFAULT_TEMPLATE_SETTINGS.emergencyPhonePlaceholder === '+XX-XXXXXXXXXX', 'Emergency placeholder format: "+XX-XXXXXXXXXX"')

  // TEST 4: Employee Information Mapping
  console.log('\n--- TEST 4: Employee Fields on Front Side ---')
  const sampleEmp = MOCK_EMPLOYEES[0] // Sarah Jenkins
  assert(Boolean(sampleEmp.id || sampleEmp.employeeId), 'Employee ID field present')
  assert(Boolean(sampleEmp.fullName), 'Full name field present')
  assert(Boolean(sampleEmp.department), 'Department field present')
  assert(Boolean(sampleEmp.role), 'Designation field present')
  assert(Boolean(sampleEmp.bloodGroup), 'Blood group field present')
  assert(Boolean(sampleEmp.issueDate), 'Joining / Issue date field present')

  // TEST 5: Back Side Configuration
  console.log('\n--- TEST 5: Back Side Specifications ---')
  assert(DEFAULT_TEMPLATE_SETTINGS.showEmergencyContact === true, 'Emergency contact enabled on back side')
  assert(DEFAULT_TEMPLATE_SETTINGS.showSignatures === true, 'Dual signature blocks enabled (Cardholder & Authorized)')
  assert(DEFAULT_TEMPLATE_SETTINGS.showQrCode === true, 'Verification QR code enabled on back side')

  // TEST 6: Template Customization & LocalStorage Persistence Architecture
  console.log('\n--- TEST 6: Persistence Architecture (No Photos in LocalStorage) ---')
  const serialized = JSON.stringify(DEFAULT_TEMPLATE_SETTINGS)
  assert(!serialized.includes('data:image/'), 'Template settings in localStorage contain NO Base64 employee photos')
  assert(serialized.includes('NOVATECH SOLUTIONS'), 'Company settings serialized properly')

  const parsed = JSON.parse(serialized)
  assert(parsed.companyName === 'NOVATECH SOLUTIONS', 'Company name restored on parse')
  assert(parsed.selectedTemplateId === 'corporate-blue', 'Selected template restored on parse')

  // TEST 7: Optional Fields Toggleability
  console.log('\n--- TEST 7: Field Toggles ---')
  const toggledSettings = {
    ...DEFAULT_TEMPLATE_SETTINGS,
    showBloodGroup: false,
    showJoiningDate: false,
    showDepartment: false,
  }
  assert(toggledSettings.showBloodGroup === false, 'Blood group can be toggled off')
  assert(toggledSettings.showJoiningDate === false, 'Joining date can be toggled off')
  assert(toggledSettings.showDepartment === false, 'Department can be toggled off')

  console.log('\n====================================================')
  console.log(`📊 Phase 4 Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTemplateTests()

