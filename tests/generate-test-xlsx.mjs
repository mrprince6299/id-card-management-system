import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const sampleHeaders = [
  'Emp ID',
  'First Name',
  'Last Name',
  'Department',
  'Job Title',
  'Work Email',
  'Phone Number',
  'Hire Date',
  'Blood Group',
  'Photo File',
]

const sampleRows = [
  ['EMP-3001', 'Julian', 'Casablancas', 'Audio Tech', 'Sound Engineer', 'julian.c@company.internal', '+1 555-0301', '2026-01-05', 'O+', 'julian.jpg'],
  ['EMP-3002', 'Fabrizio', 'Moretti', 'Audio Tech', 'Percussion Lead', 'fab.m@company.internal', '+1 555-0302', '2026-01-06', 'A+', 'fab.jpg'],
  ['EMP-3003', 'Nikolai', 'Fraiture', 'Audio Tech', 'Acoustics Specialist', 'nik.f@company.internal', '+1 555-0303', '2026-01-07', 'B+', 'nik.jpg'],
  ['EMP-3004', 'Albert', 'Hammond', 'Audio Tech', 'Hardware Tech', 'albert.h@company.internal', '+1 555-0304', '2026-01-08', 'AB+', 'albert.jpg'],
  ['EMP-3005', 'Nick', 'Valensi', 'Audio Tech', 'Lead Technician', 'nick.v@company.internal', '+1 555-0305', '2026-01-09', 'O-', 'nick.jpg'],
  ['EMP-3006', 'Gordon', 'Freeman', 'Research', 'Theoretical Physicist', 'gordon.f@company.internal', '+1 555-0306', '2026-01-10', 'A-', 'gordon.jpg'],
  ['EMP-3007', 'Alyx', 'Vance', 'Engineering', 'Robotics Specialist', 'alyx.v@company.internal', '+1 555-0307', '2026-01-11', 'B-', 'alyx.jpg'],
  ['EMP-3008', 'Eli', 'Vance', 'Research', 'Lab Director', 'eli.v@company.internal', '+1 555-0308', '2026-01-12', 'O+', 'eli.jpg'],
  ['EMP-3009', 'Isaac', 'Kleiner', 'Research', 'Quantum Teleportation Lead', 'isaac.k@company.internal', '+1 555-0309', '2026-01-13', 'A+', 'isaac.jpg'],
  ['EMP-3010', 'Barney', 'Calhoun', 'Security', 'Security Chief', 'barney.c@company.internal', '+1 555-0310', '2026-01-14', 'O+', 'barney.jpg'],
  ['EMP-3011', 'Judith', 'Mossman', 'Research', 'Senior Fellow', 'judith.m@company.internal', '+1 555-0311', '2026-01-15', 'AB-', 'judith.jpg'],
  ['EMP-3012', 'Wallace', 'Breen', 'Executive', 'Managing Director', 'wallace.b@company.internal', '+1 555-0312', '2026-01-16', 'O+', 'wallace.jpg'],
]

const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows])
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Employees')

const outPath = path.resolve('tests', 'sample-employees-12.xlsx')
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
fs.writeFileSync(outPath, buf)
console.log(`Generated sample XLSX at ${outPath}`)

