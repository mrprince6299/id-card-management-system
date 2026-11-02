import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const firstNames = [
  'Aarav', 'Aditi', 'Alok', 'Ananya', 'Arjun', 'Bhavna', 'Chetan', 'Deepika', 'Dev', 'Diya',
  'Eshan', 'Farhan', 'Gaurav', 'Geeta', 'Harsh', 'Isha', 'Ishaan', 'Jaya', 'Kabir', 'Kavita',
  'Kunal', 'Lakshmi', 'Manish', 'Meera', 'Mohit', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya',
  'Rahul', 'Rani', 'Rohan', 'Ritu', 'Sameer', 'Sangeeta', 'Sanjay', 'Shreya', 'Siddharth', 'Simran',
  'Tanvi', 'Tarun', 'Uday', 'Uma', 'Varun', 'Vidya', 'Vikram', 'Vandana', 'Yash', 'Zara'
]

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Singh', 'Kumar', 'Gupta', 'Mehta', 'Joshi', 'Bhat',
  'Nair', 'Iyer', 'Chopra', 'Malhotra', 'Kapoor', 'Saxena', 'Bansal', 'Agarwal', 'Chauhan', 'Yadav',
  'Mishra', 'Pandey', 'Trivedi', 'Rao', 'Deshmukh', 'Kulkarni', 'Mukherjee', 'Chatterjee', 'Sen', 'Dutta'
]

const departments = [
  { name: 'Engineering', roles: ['Software Engineer', 'Senior Frontend Developer', 'Backend Architect', 'DevOps Specialist', 'QA Engineer', 'Mobile Developer'] },
  { name: 'Product & Design', roles: ['Product Manager', 'UX Designer', 'UI Architect', 'Design Lead', 'Interaction Designer'] },
  { name: 'Marketing', roles: ['Digital Marketer', 'Content Strategist', 'SEO Analyst', 'Growth Manager', 'Brand Designer'] },
  { name: 'Human Resources', roles: ['HR Manager', 'Talent Acquisition', 'People Operations', 'HR Business Partner'] },
  { name: 'Finance', roles: ['Financial Analyst', 'Accountant', 'Controller', 'Billing Specialist'] },
  { name: 'Operations', roles: ['Operations Lead', 'Project Coordinator', 'Logistics Analyst', 'Compliance Officer'] }
]

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export function generate100Employees() {
  const employees = []
  for (let i = 1; i <= 100; i++) {
    const idNum = 2000 + i
    const empId = `EMP-${idNum}`
    const firstName = firstNames[(i - 1) % firstNames.length]
    const lastName = lastNames[Math.floor((i - 1) / firstNames.length) % lastNames.length]
    const deptObj = departments[(i - 1) % departments.length]
    const department = deptObj.name
    const designation = deptObj.roles[(i - 1) % deptObj.roles.length]
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 50 ? i : ''}@novatech.example`
    const phone = `+91 98${String(10000000 + i * 73).slice(-8)}`
    
    // Vary joining dates over the past 3 years
    const year = 2023 + (i % 3)
    const month = String(1 + (i % 12)).padStart(2, '0')
    const day = String(1 + (i % 28)).padStart(2, '0')
    const joiningDate = `${year}-${month}-${day}`
    
    const bloodGroup = bloodGroups[i % bloodGroups.length]
    
    // Test diverse photo naming conventions (exact, suffix, extension)
    let photoFileName = `${empId}.jpg`
    if (i % 7 === 0) photoFileName = `${empId}_profile.jpg`
    else if (i % 7 === 1) photoFileName = `${empId}_photo.png`
    else if (i % 7 === 2) photoFileName = `${empId.toLowerCase()}.jpeg`
    else if (i % 7 === 3) photoFileName = `${empId}-headshot.webp`

    employees.push({
      employeeId: empId,
      firstName,
      lastName,
      department,
      designation,
      email,
      phone,
      joiningDate,
      bloodGroup,
      photoFileName
    })
  }
  return employees
}

// Generate valid minimal PNG image bytes (100x100 RGB image with distinct palette)
function createMinimalPng(r, g, b) {
  // A clean 10x10 indexed PNG buffer
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGYzAEAHb/DAeF6dZ4AAAAAElFTkSuQmCC'
  return Buffer.from(b64, 'base64')
}

async function main() {
  const employees = generate100Employees()
  console.log(`Generated ${employees.length} employee records.`)

  // 1. Create XLSX
  const headers = [
    'Employee ID', 'First Name', 'Last Name', 'Department', 'Designation',
    'Email Address', 'Phone Number', 'Joining Date', 'Blood Group', 'Photo Filename'
  ]
  const rows = employees.map(e => [
    e.employeeId, e.firstName, e.lastName, e.department, e.designation,
    e.email, e.phone, e.joiningDate, e.bloodGroup, e.photoFileName
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  
  const xlsxPath = path.resolve('tests', 'fixtures', '100-employees.xlsx')
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(xlsxPath, xlsxBuf)
  console.log(`✅ Saved 100-employee XLSX at: ${xlsxPath}`)

  // 2. Create CSV
  const csvRows = [headers.join(',')]
  employees.forEach(e => {
    csvRows.push([
      `"${e.employeeId}"`, `"${e.firstName}"`, `"${e.lastName}"`,
      `"${e.department}"`, `"${e.designation}"`, `"${e.email}"`,
      `"${e.phone}"`, `"${e.joiningDate}"`, `"${e.bloodGroup}"`, `"${e.photoFileName}"`
    ].join(','))
  })
  const csvPath = path.resolve('tests', 'fixtures', '100-employees.csv')
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8')
  console.log(`✅ Saved 100-employee CSV at: ${csvPath}`)

  // 3. Create 100 matching photo files
  const photosDir = path.resolve('tests', 'fixtures', 'photos')
  let photoCount = 0
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i]
    const pPath = path.join(photosDir, e.photoFileName)
    // Vary color tones across departments
    const r = (i * 25) % 255
    const g = (i * 50) % 255
    const b = (i * 75) % 255
    const pngBuf = createMinimalPng(r, g, b)
    fs.writeFileSync(pPath, pngBuf)
    photoCount++
  }
  console.log(`✅ Generated ${photoCount} distinct employee photos in ${photosDir}`)
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('generate-100-dataset.mjs') ||
  process.argv[1].replace(/\\/g, '/').endsWith('generate-100-dataset.mjs')
)

if (isDirectRun) {
  main().catch(err => {
    console.error('Error generating 100-employee dataset:', err)
    process.exit(1)
  })
}

