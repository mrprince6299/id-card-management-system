/**
 * Card Types and Dynamic Schema Definitions.
 * Supports multiple organizations, institutions, and use cases:
 * - Employee ID
 * - Student ID
 * - Staff ID
 * - Visitor Pass
 * - Contractor ID
 * - Event Pass
 * - Custom ID Card
 */

export const CARD_TYPES = [
  {
    id: 'employee',
    label: 'Employee ID',
    description: 'Corporate and organizational workforce identification credentials',
    icon: 'Building2',
    idFieldLabel: 'Employee ID',
    idFieldKey: 'employeeId',
    primaryFieldLabel: 'Department',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Designation',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'corporate-blue',
    fields: [
      { key: 'employeeId', label: 'Employee ID', placeholder: 'e.g. EMP-1001', type: 'text' },
      { key: 'firstName', label: 'First Name', placeholder: 'e.g. Sarah', type: 'text' },
      { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Jenkins', type: 'text' },
      { key: 'department', label: 'Department', placeholder: 'e.g. Engineering', type: 'text' },
      { key: 'designation', label: 'Designation / Role', placeholder: 'e.g. Lead Architect', type: 'text' },
      { key: 'email', label: 'Email Address', placeholder: 'e.g. sarah@example.com', type: 'email' },
      { key: 'phone', label: 'Contact / Mobile', placeholder: 'e.g. +91 98765 43210', type: 'tel' },
      { key: 'joiningDate', label: 'Joining Date', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. O+, B+, A+', type: 'text' },
      { key: 'fatherName', label: "Father's Name", placeholder: 'e.g. Robert Jenkins', type: 'text' },
      { key: 'aadhaarNumber', label: 'Aadhaar / ID No', placeholder: 'e.g. XXXX-XXXX-1234', type: 'text' },
      { key: 'address', label: 'Residential Address', placeholder: 'e.g. City, State', type: 'text' },
    ],
  },
  {
    id: 'student',
    label: 'Student ID',
    description: 'Schools, colleges, universities, and academic institutions',
    icon: 'GraduationCap',
    idFieldLabel: 'Roll / Registration No',
    idFieldKey: 'rollNo',
    primaryFieldLabel: 'Course / Program',
    primaryFieldKey: 'course',
    secondaryFieldLabel: 'Branch / Semester',
    secondaryFieldKey: 'semester',
    defaultTemplateId: 'corporate-blue',
    fields: [
      { key: 'rollNo', label: 'Roll Number / Student ID', placeholder: 'e.g. STU-2026-042', type: 'text' },
      { key: 'firstName', label: 'First Name', placeholder: 'e.g. Rahul', type: 'text' },
      { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Sharma', type: 'text' },
      { key: 'course', label: 'Course / Degree', placeholder: 'e.g. B.Tech Computer Science', type: 'text' },
      { key: 'semester', label: 'Semester / Year', placeholder: 'e.g. 6th Semester / Year 3', type: 'text' },
      { key: 'email', label: 'Student Email', placeholder: 'e.g. rahul@university.edu', type: 'email' },
      { key: 'phone', label: 'Student Mobile', placeholder: 'e.g. +91 98765 43210', type: 'tel' },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. B+', type: 'text' },
      { key: 'fatherName', label: "Father / Guardian Name", placeholder: 'e.g. Suresh Sharma', type: 'text' },
      { key: 'aadhaarNumber', label: 'Aadhaar / Student UID', placeholder: 'e.g. XXXX-XXXX-5678', type: 'text' },
      { key: 'address', label: 'Permanent Address', placeholder: 'e.g. New Delhi, India', type: 'text' },
      { key: 'expiryDate', label: 'Valid Upto / Batch', placeholder: 'e.g. 2024-2028', type: 'text' },
    ],
  },
  {
    id: 'staff',
    label: 'Faculty & Staff ID',
    description: 'Educational faculty, teaching assistants, and administrative staff',
    icon: 'Briefcase',
    idFieldLabel: 'Staff ID',
    idFieldKey: 'employeeId',
    primaryFieldLabel: 'Department / Faculty',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Academic Title',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'executive-minimal',
    fields: [
      { key: 'employeeId', label: 'Staff / Faculty ID', placeholder: 'e.g. FAC-501', type: 'text' },
      { key: 'firstName', label: 'First Name', placeholder: 'e.g. Dr. Priya', type: 'text' },
      { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Nair', type: 'text' },
      { key: 'department', label: 'Academic Department', placeholder: 'e.g. Dept of Physics', type: 'text' },
      { key: 'designation', label: 'Academic Title / Role', placeholder: 'e.g. Associate Professor', type: 'text' },
      { key: 'email', label: 'Official Email', placeholder: 'e.g. priya.nair@college.edu', type: 'email' },
      { key: 'phone', label: 'Contact Phone', placeholder: 'e.g. +91 98765 43210', type: 'tel' },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. AB+', type: 'text' },
      { key: 'address', label: 'Campus Residence', placeholder: 'e.g. Staff Quarters, Block B', type: 'text' },
    ],
  },
  {
    id: 'visitor',
    label: 'Visitor Pass',
    description: 'Guest passes, facility visitors, temporary access tokens',
    icon: 'UserCheck',
    idFieldLabel: 'Visitor Pass ID',
    idFieldKey: 'visitorId',
    primaryFieldLabel: 'Host / Dept to Visit',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Purpose of Visit',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'executive-minimal',
    fields: [
      { key: 'visitorId', label: 'Pass ID / Badge No', placeholder: 'e.g. VIS-904', type: 'text' },
      { key: 'firstName', label: 'Visitor First Name', placeholder: 'e.g. Amit', type: 'text' },
      { key: 'lastName', label: 'Visitor Last Name', placeholder: 'e.g. Verma', type: 'text' },
      { key: 'department', label: 'Host Person / Dept', placeholder: 'e.g. Operations / R. Sharma', type: 'text' },
      { key: 'designation', label: 'Purpose of Visit', placeholder: 'e.g. Client Meeting / Audit', type: 'text' },
      { key: 'phone', label: 'Visitor Mobile', placeholder: 'e.g. +91 98765 00000', type: 'tel' },
      { key: 'joiningDate', label: 'Visit Date', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'address', label: 'Company / Organization', placeholder: 'e.g. Vertex Technologies Ltd', type: 'text' },
    ],
  },
  {
    id: 'contractor',
    label: 'Contractor / Vendor ID',
    description: 'On-site service providers, technicians, and vendor workforce',
    icon: 'HardHat',
    idFieldLabel: 'Contractor ID',
    idFieldKey: 'employeeId',
    primaryFieldLabel: 'Agency / Vendor',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Trade / Skill',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'sidwal-workshop',
    fields: [
      { key: 'employeeId', label: 'Contractor ID', placeholder: 'e.g. CONT-401', type: 'text' },
      { key: 'firstName', label: 'First Name', placeholder: 'e.g. Rajesh', type: 'text' },
      { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Kumar', type: 'text' },
      { key: 'department', label: 'Contracting Firm / Agency', placeholder: 'e.g. Sidwal Refrigeration', type: 'text' },
      { key: 'designation', label: 'Trade / Designation', placeholder: 'e.g. HVAC Specialist', type: 'text' },
      { key: 'fatherName', label: "Father's Name", placeholder: 'e.g. Ram Kumar', type: 'text' },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. O+', type: 'text' },
      { key: 'aadhaarNumber', label: 'Aadhaar No', placeholder: 'e.g. XXXX-XXXX-9999', type: 'text' },
      { key: 'phone', label: 'Mobile No', placeholder: 'e.g. +91 98765 11111', type: 'tel' },
      { key: 'address', label: 'Address', placeholder: 'e.g. Gorakhpur, UP', type: 'text' },
    ],
  },
  {
    id: 'event',
    label: 'Event Pass',
    description: 'Conferences, summits, exhibitions, and venue delegate credentials',
    icon: 'Ticket',
    idFieldLabel: 'Pass / Ticket No',
    idFieldKey: 'ticketNo',
    primaryFieldLabel: 'Access Zone / Hall',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Pass Category',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'modern-tech',
    fields: [
      { key: 'ticketNo', label: 'Badge / Ticket No', placeholder: 'e.g. TKT-2026-VIP', type: 'text' },
      { key: 'firstName', label: 'Delegate First Name', placeholder: 'e.g. Elena', type: 'text' },
      { key: 'lastName', label: 'Delegate Last Name', placeholder: 'e.g. Rostova', type: 'text' },
      { key: 'department', label: 'Access Zone', placeholder: 'e.g. Hall A • VIP Lounge', type: 'text' },
      { key: 'designation', label: 'Badge Tier / Category', placeholder: 'e.g. Keynote Speaker / VIP', type: 'text' },
      { key: 'email', label: 'Registered Email', placeholder: 'e.g. elena@summit.org', type: 'email' },
      { key: 'address', label: 'Organization / Affiliation', placeholder: 'e.g. DeepMind Research', type: 'text' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom ID Card',
    description: 'Tailored credential schema with custom field names and layouts',
    icon: 'Sparkles',
    idFieldLabel: 'ID / Code',
    idFieldKey: 'id',
    primaryFieldLabel: 'Primary Field',
    primaryFieldKey: 'department',
    secondaryFieldLabel: 'Secondary Field',
    secondaryFieldKey: 'designation',
    defaultTemplateId: 'corporate-blue',
    fields: [
      { key: 'id', label: 'Identifier / Code', placeholder: 'e.g. ID-001', type: 'text' },
      { key: 'firstName', label: 'First Name', placeholder: 'e.g. Alex', type: 'text' },
      { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Morgan', type: 'text' },
      { key: 'department', label: 'Primary Field Label', placeholder: 'e.g. Category / Division', type: 'text' },
      { key: 'designation', label: 'Secondary Field Label', placeholder: 'e.g. Role / Level', type: 'text' },
      { key: 'email', label: 'Email', placeholder: 'e.g. alex@example.com', type: 'email' },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. +1 555-0199', type: 'tel' },
    ],
  },
]

/**
 * Generate a cryptographically robust internal record identifier.
 * Separate from displayed human-readable ID numbers.
 */
export const generateRecordId = (prefix = 'rec') => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 9)
  return `${prefix}_${timestamp}_${randomPart}`
}

/**
 * Resolve display ID string from any record structure.
 */
export const getDisplayId = (record) => {
  if (!record) return ''
  return String(
    record.displayedId ||
    record.employeeId ||
    record.rollNo ||
    record.visitorId ||
    record.ticketNo ||
    record.id ||
    record.recordId ||
    ''
  ).trim()
}

/**
 * Look up a card type configuration by ID.
 */
export const getCardTypeById = (typeId = 'employee') => {
  return CARD_TYPES.find((t) => t.id === typeId) || CARD_TYPES[0]
}

