import React from 'react'
import { QrCode, ShieldCheck, User } from 'lucide-react'
import { CompanyLogo } from './CompanyLogo'
import { SIDWAL_LOGO_SRC } from '../../assets/sidwalLogo'
import { getCardTypeById, getDisplayId } from '../../utils/cardTypes'
import { getCustomFieldsForSide } from '../../utils/customFields'

export const CardFrontView = ({
  employee,
  photoUrl,
  template = 'corporate-blue',
  settings = {},
}) => {
  const currentEmp = employee || {
    id: 'EMP-1001',
    employeeId: 'EMP-1001',
    fullName: 'Sarah Jenkins',
    role: 'Lead Cloud Architect',
    designation: 'Lead Cloud Architect',
    department: 'Engineering',
    bloodGroup: 'O+',
    joiningDate: '2026-01-15',
    issueDate: '2026-01-15',
    expiryDate: '2028-01-15',
  }

  const cardConfig = getCardTypeById(currentEmp.cardType)
  const idLabel = cardConfig.idFieldLabel.toUpperCase()
  const empId = getDisplayId(currentEmp) || currentEmp.employeeId || currentEmp.id || 'ID-XXXX'
  const designation = currentEmp.designation || currentEmp.role || 'Member'
  const joiningDate = currentEmp.joiningDate || currentEmp.issueDate || '2026-01-15'

  // Field visibility toggles from settings
  const showBloodGroup = settings.showBloodGroup !== false
  const showJoiningDate = settings.showJoiningDate !== false
  const showDepartment = settings.showDepartment !== false
  const showDesignation = settings.showDesignation !== false
  const showBarcode = settings.showBarcode !== false
  const showQr = settings.showQrCode !== false

  // Resolved dynamic custom fields for front side (omitted for locked SIDWAL)
  const frontCustomFields = getCustomFieldsForSide(currentEmp, 'front', settings, template)

  // Fallback initials for missing photo placeholder
  const initials = currentEmp.fullName
    ? currentEmp.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ID'

  // ================= TEMPLATE D: SIDWAL MECHANICAL WORKSHOP =================
  if (template === 'sidwal-workshop') {
    const fatherName = currentEmp.fatherName || currentEmp.father_name || ''
    const designationVal = currentEmp.designation || currentEmp.role || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 relative font-sans overflow-hidden">
        {/* Fixed Header: SIDWAL Logo & Company Headings */}
        <div className="pt-2 px-3 text-center">
          <div className="flex justify-center items-center mb-1">
            <img
              src={SIDWAL_LOGO_SRC}
              alt="SIDWAL"
              className="h-7 w-auto object-contain"
            />
          </div>
          <h2 className="text-[9.5px] font-bold text-[#1e293b] tracking-[0.01em] uppercase leading-tight">
            MECHANICAL WORKSHOP GORAKHPUR
          </h2>
          <h1 className="text-[11px] font-black text-[#0d2b59] tracking-[0.02em] uppercase leading-tight mt-0.5">
            NORTH EASTERN RAILWAY
          </h1>
          <h3 className="text-[8px] font-bold text-[#334155] tracking-[0.01em] uppercase leading-tight mt-0.5">
            SIDWAL REFRIGERATION INDUSTRIES(P) LTD
          </h3>
        </div>

        {/* Edge-to-edge Red Accent Divider */}
        <div className="w-full h-[2.5px] bg-[#e30613] mt-1.5" />

        {/* Center Employee Photo Frame */}
        <div className="flex flex-col items-center mt-1.5 px-4">
          <div className="w-[84px] h-[98px] bg-slate-50 border border-slate-300 overflow-hidden flex items-center justify-center shadow-xs">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={currentEmp.fullName || 'Employee'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                <User className="w-6 h-6 text-slate-300" />
                <span className="text-[7.5px] mt-0.5 font-medium text-slate-400">Photo</span>
              </div>
            )}
          </div>

          {/* Section Title */}
          <div className="text-[10px] font-bold text-[#e30613] tracking-[0.20em] text-center mt-2 mb-1 uppercase">
            IDENTITY CARD
          </div>
        </div>

        {/* Dynamic Personal Details */}
        <div className="px-5 text-[9.5px] font-bold space-y-0.5 mt-0.5 text-left">
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[82px] shrink-0 uppercase">ID NO.</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-black uppercase truncate">{empId}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[82px] shrink-0 uppercase">NAME</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-black uppercase truncate">{currentEmp.fullName || ''}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[82px] shrink-0 uppercase">FATHER NAME</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-black uppercase truncate">{fatherName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[82px] shrink-0 uppercase">DESIGNATION</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-black uppercase truncate">{designationVal}</span>
          </div>
        </div>

        {/* Bottom Signatures */}
        <div className="border-t border-slate-200/80 bg-[#f8fafc]/90 px-3 pt-2 pb-2 mt-auto">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase block">
                CARD HOLDER SIGN
              </span>
            </div>
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase block">
                CONTRACTOR SIGN
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL MODERN CORPORATE =================
  if (template === 'sidwal-modern-corporate') {
    const fatherName = currentEmp.fatherName || currentEmp.father_name || ''
    const designationVal = currentEmp.designation || currentEmp.role || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 relative font-sans overflow-hidden">
        {/* Modern Corporate Navy Header */}
        <div className="bg-[#0d2b59] pt-2 pb-2 px-3 text-center relative overflow-hidden">
          <div className="flex justify-center items-center mb-1">
            <div className="bg-white px-3 py-0.5 rounded-md shadow-xs flex items-center justify-center">
              <img src={SIDWAL_LOGO_SRC} alt="SIDWAL" className="h-6 w-auto object-contain" />
            </div>
          </div>
          <h2 className="text-[8px] font-bold text-slate-300 tracking-[0.06em] uppercase leading-tight">
            MECHANICAL WORKSHOP GORAKHPUR
          </h2>
          <h1 className="text-[10.5px] font-black text-white tracking-[0.04em] uppercase leading-tight mt-0.5">
            NORTH EASTERN RAILWAY
          </h1>
          <h3 className="text-[7.5px] font-semibold text-slate-200 tracking-[0.04em] uppercase leading-tight mt-0.5">
            SIDWAL REFRIGERATION INDUSTRIES (P) LTD
          </h3>
        </div>

        {/* Scarlet Red Accent Divider */}
        <div className="w-full h-[3px] bg-[#e30613]" />

        {/* Center Employee Photo */}
        <div className="flex flex-col items-center mt-2 px-4">
          <div className="w-[84px] h-[98px] rounded-lg border-2 border-[#0d2b59]/20 bg-slate-50 overflow-hidden flex items-center justify-center shadow-xs">
            {photoUrl ? (
              <img src={photoUrl} alt={currentEmp.fullName || 'Employee'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <User className="w-6 h-6 text-slate-300" />
                <span className="text-[7.5px] mt-0.5 font-medium text-slate-400">Photo</span>
              </div>
            )}
          </div>
          <span className="mt-1.5 px-3 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-[0.18em] uppercase text-[#0d2b59] bg-slate-100 border border-slate-200 shadow-2xs">
            IDENTITY CARD
          </span>
        </div>

        {/* Corporate Structured Field Rows */}
        <div className="mx-4 mt-1 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 space-y-1 text-[9px] font-bold text-left">
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[78px] shrink-0 uppercase tracking-wide">ID NO.</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-slate-900 font-mono uppercase truncate">{empId}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[78px] shrink-0 uppercase tracking-wide">NAME</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-slate-950 font-extrabold uppercase truncate">{currentEmp.fullName || ''}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[78px] shrink-0 uppercase tracking-wide">FATHER NAME</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-slate-800 uppercase truncate">{fatherName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[78px] shrink-0 uppercase tracking-wide">DESIGNATION</span>
            <span className="text-[#0d2b59] mr-1.5">:</span>
            <span className="text-slate-800 uppercase truncate">{designationVal}</span>
          </div>
        </div>

        {/* Bottom Signatures */}
        <div className="border-t border-slate-200 bg-slate-100/80 px-3 pt-2 pb-2 mt-auto">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase block">
                CARD HOLDER SIGN
              </span>
            </div>
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase block">
                CONTRACTOR SIGN
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL INDUSTRIAL ENGINEERING =================
  if (template === 'sidwal-industrial-engineering') {
    const fatherName = currentEmp.fatherName || currentEmp.father_name || ''
    const designationVal = currentEmp.designation || currentEmp.role || ''

    return (
      <div className="w-full h-full bg-[#f8fafc] flex flex-col justify-between text-slate-900 relative font-sans overflow-hidden border-2 border-slate-300">
        {/* Technical Charcoal & Steel Header */}
        <div className="bg-[#1e293b] pt-2 pb-2 px-3 text-center relative">
          <div className="flex justify-center items-center mb-1">
            <div className="bg-white/95 px-3 py-0.5 rounded border border-slate-400/30 flex items-center justify-center">
              <img src={SIDWAL_LOGO_SRC} alt="SIDWAL" className="h-6 w-auto object-contain" />
            </div>
          </div>
          <h2 className="text-[8px] font-mono font-bold text-slate-300 tracking-[0.14em] uppercase leading-tight">
            MECHANICAL WORKSHOP GORAKHPUR
          </h2>
          <h1 className="text-[10.5px] font-sans font-black text-white tracking-[0.08em] uppercase leading-tight mt-0.5">
            NORTH EASTERN RAILWAY
          </h1>
          <h3 className="text-[7.5px] font-mono font-bold text-amber-400 tracking-[0.06em] uppercase leading-tight mt-0.5">
            SIDWAL REFRIGERATION INDUSTRIES (P) LTD
          </h3>
        </div>

        {/* Industrial Safety Red Line */}
        <div className="w-full h-[3px] bg-[#dc2626]" />

        {/* Photo Viewfinder with Technical Corners */}
        <div className="flex flex-col items-center mt-2 px-4">
          <div className="relative p-1 bg-white border border-slate-300 shadow-2xs">
            <div className="w-[82px] h-[96px] bg-slate-100 overflow-hidden flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt={currentEmp.fullName || 'Employee'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <User className="w-6 h-6 text-slate-300" />
                  <span className="text-[7.5px] mt-0.5 font-mono text-slate-400">PHOTO</span>
                </div>
              )}
            </div>
          </div>
          <span className="mt-1 font-mono text-[8px] font-bold text-[#dc2626] tracking-[0.22em] uppercase">
            [ IDENTITY CARD // TECH-OPS ]
          </span>
        </div>

        {/* Industrial Spec Grid */}
        <div className="mx-4 mt-1 bg-white p-2 rounded border border-slate-300 space-y-1 font-mono text-[8.5px] text-left">
          <div className="flex items-baseline border-b border-slate-100 pb-0.5">
            <span className="text-slate-500 w-[80px] shrink-0 font-bold uppercase">ID NO.</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-900 font-bold uppercase truncate">{empId}</span>
          </div>
          <div className="flex items-baseline border-b border-slate-100 pb-0.5">
            <span className="text-slate-500 w-[80px] shrink-0 font-bold uppercase">NAME</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-950 font-black uppercase truncate">{currentEmp.fullName || ''}</span>
          </div>
          <div className="flex items-baseline border-b border-slate-100 pb-0.5">
            <span className="text-slate-500 w-[80px] shrink-0 font-bold uppercase">FATHER NAME</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800 font-medium uppercase truncate">{fatherName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-slate-500 w-[80px] shrink-0 font-bold uppercase">DESIGNATION</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800 font-bold uppercase truncate">{designationVal}</span>
          </div>
        </div>

        {/* Technical Footer Signatures */}
        <div className="border-t border-slate-300 bg-slate-200/70 px-3 pt-2 pb-2 mt-auto">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="w-20 h-[1px] border-b border-dashed border-slate-500 mx-auto mb-1" />
              <span className="text-[7px] font-mono font-bold text-slate-700 tracking-wider uppercase block">
                CARD HOLDER SIGN
              </span>
            </div>
            <div>
              <div className="w-20 h-[1px] border-b border-dashed border-slate-500 mx-auto mb-1" />
              <span className="text-[7px] font-mono font-bold text-slate-700 tracking-wider uppercase block">
                CONTRACTOR SIGN
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL PREMIUM EXECUTIVE =================
  if (template === 'sidwal-premium-executive') {
    const fatherName = currentEmp.fatherName || currentEmp.father_name || ''
    const designationVal = currentEmp.designation || currentEmp.role || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 relative font-sans overflow-hidden">
        {/* Elegant Minimal Header with Hairlines */}
        <div className="pt-3 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-[1px] w-8 bg-slate-300" />
            <img src={SIDWAL_LOGO_SRC} alt="SIDWAL" className="h-6 w-auto object-contain" />
            <div className="h-[1px] w-8 bg-slate-300" />
          </div>
          <h1 className="text-[11px] font-serif font-black text-[#091b36] tracking-[0.16em] uppercase leading-tight mt-0.5">
            NORTH EASTERN RAILWAY
          </h1>
          <h2 className="text-[8px] font-sans font-semibold text-slate-600 tracking-[0.14em] uppercase leading-tight mt-0.5">
            MECHANICAL WORKSHOP GORAKHPUR
          </h2>
          <h3 className="text-[7.5px] font-sans font-bold text-[#b91c1c] tracking-[0.10em] uppercase leading-tight mt-0.5">
            SIDWAL REFRIGERATION INDUSTRIES (P) LTD
          </h3>
        </div>

        {/* Fine Crimson Pinstripe */}
        <div className="w-28 h-[1.5px] bg-[#b91c1c] mx-auto mt-1.5" />

        {/* Executive Portrait Frame */}
        <div className="flex flex-col items-center mt-2 px-4">
          <div className="w-[84px] h-[98px] p-0.5 bg-white border border-slate-300 shadow-sm flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt={currentEmp.fullName || 'Employee'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <User className="w-6 h-6 text-slate-300" />
                <span className="text-[7.5px] mt-0.5 text-slate-400 uppercase tracking-widest font-serif">Photo</span>
              </div>
            )}
          </div>
          <span className="text-[7.5px] font-semibold text-slate-500 tracking-[0.25em] text-center mt-1.5 mb-0.5 uppercase">
            I D E N T I T Y   C R E D E N T I A L
          </span>
        </div>

        {/* Typographic Fields Table */}
        <div className="px-5 text-[9px] space-y-1 mt-0.5 text-left font-sans">
          <div className="flex items-baseline">
            <span className="text-[#091b36] font-bold w-[80px] shrink-0 uppercase tracking-wider text-[8px]">ID NO.</span>
            <span className="text-slate-400 mr-2">:</span>
            <span className="text-slate-900 font-semibold font-mono uppercase truncate">{empId}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#091b36] font-bold w-[80px] shrink-0 uppercase tracking-wider text-[8px]">NAME</span>
            <span className="text-slate-400 mr-2">:</span>
            <span className="text-slate-950 font-black tracking-wide uppercase truncate">{currentEmp.fullName || ''}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#091b36] font-bold w-[80px] shrink-0 uppercase tracking-wider text-[8px]">FATHER NAME</span>
            <span className="text-slate-400 mr-2">:</span>
            <span className="text-slate-800 font-medium uppercase truncate">{fatherName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#091b36] font-bold w-[80px] shrink-0 uppercase tracking-wider text-[8px]">DESIGNATION</span>
            <span className="text-slate-400 mr-2">:</span>
            <span className="text-slate-800 font-bold uppercase truncate">{designationVal}</span>
          </div>
        </div>

        {/* Minimal Signatures */}
        <div className="border-t border-slate-100 bg-[#fafafa] px-4 pt-2.5 pb-2 mt-auto">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="w-20 h-[1px] bg-slate-300 mx-auto mb-1" />
              <span className="text-[6.5px] font-semibold text-slate-500 tracking-wider uppercase block">
                CARD HOLDER SIGN
              </span>
            </div>
            <div>
              <div className="w-20 h-[1px] bg-slate-300 mx-auto mb-1" />
              <span className="text-[6.5px] font-semibold text-slate-500 tracking-wider uppercase block">
                CONTRACTOR SIGN
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL CONTEMPORARY OFFICIAL =================
  if (template === 'sidwal-contemporary-official') {
    const fatherName = currentEmp.fatherName || currentEmp.father_name || ''
    const designationVal = currentEmp.designation || currentEmp.role || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 relative font-sans overflow-hidden">
        {/* Dynamic Dual-Tone Royal Navy & Signal Red Banner */}
        <div className="bg-[#0a326a] pt-2 pb-2 px-3 text-center relative">
          <div className="flex justify-center items-center mb-1">
            <div className="bg-white px-2.5 py-0.5 rounded shadow-xs flex items-center justify-center">
              <img src={SIDWAL_LOGO_SRC} alt="SIDWAL" className="h-6 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-[10.5px] font-black text-white tracking-[0.06em] uppercase leading-tight">
            NORTH EASTERN RAILWAY
          </h1>
          <h2 className="text-[8px] font-bold text-blue-100 tracking-[0.05em] uppercase leading-tight mt-0.5">
            MECHANICAL WORKSHOP GORAKHPUR
          </h2>
          <h3 className="text-[7.5px] font-medium text-white/90 tracking-[0.03em] uppercase leading-tight mt-0.5">
            SIDWAL REFRIGERATION INDUSTRIES (P) LTD
          </h3>
        </div>

        {/* Signal Red Bar */}
        <div className="w-full h-[3.5px] bg-[#e11d48]" />

        {/* Center Photo Section */}
        <div className="flex flex-col items-center mt-2 px-4">
          <div className="w-[84px] h-[98px] rounded-md border-2 border-[#0a326a]/30 bg-slate-50 overflow-hidden flex items-center justify-center shadow-xs">
            {photoUrl ? (
              <img src={photoUrl} alt={currentEmp.fullName || 'Employee'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <User className="w-6 h-6 text-slate-300" />
                <span className="text-[7.5px] mt-0.5 font-medium text-slate-400">Photo</span>
              </div>
            )}
          </div>
          <span className="mt-1.5 text-[8.5px] font-extrabold text-[#0a326a] tracking-[0.18em] uppercase text-center">
            OFFICIAL IDENTITY CARD
          </span>
        </div>

        {/* Banded Institutional Rows */}
        <div className="mx-3.5 mt-1 rounded-lg border border-slate-200 overflow-hidden text-[9px] font-bold text-left">
          <div className="flex items-baseline bg-slate-50 px-2.5 py-1">
            <span className="text-[#0a326a] w-[78px] shrink-0 uppercase tracking-wide">ID NO.</span>
            <span className="text-[#0a326a] mr-1.5">:</span>
            <span className="text-slate-900 font-mono uppercase truncate">{empId}</span>
          </div>
          <div className="flex items-baseline bg-white px-2.5 py-1">
            <span className="text-[#0a326a] w-[78px] shrink-0 uppercase tracking-wide">NAME</span>
            <span className="text-[#0a326a] mr-1.5">:</span>
            <span className="text-slate-950 font-black uppercase truncate">{currentEmp.fullName || ''}</span>
          </div>
          <div className="flex items-baseline bg-slate-50 px-2.5 py-1">
            <span className="text-[#0a326a] w-[78px] shrink-0 uppercase tracking-wide">FATHER NAME</span>
            <span className="text-[#0a326a] mr-1.5">:</span>
            <span className="text-slate-800 uppercase truncate">{fatherName}</span>
          </div>
          <div className="flex items-baseline bg-white px-2.5 py-1">
            <span className="text-[#0a326a] w-[78px] shrink-0 uppercase tracking-wide">DESIGNATION</span>
            <span className="text-[#0a326a] mr-1.5">:</span>
            <span className="text-slate-800 uppercase truncate">{designationVal}</span>
          </div>
        </div>

        {/* Official Footer Verification */}
        <div className="border-t border-slate-200 bg-slate-100/90 px-3 pt-2 pb-2 mt-auto">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-700 tracking-wider uppercase block">
                CARD HOLDER SIGN
              </span>
            </div>
            <div>
              <div className="w-20 h-[1px] bg-slate-400 mx-auto mb-1" />
              <span className="text-[7px] font-bold text-slate-700 tracking-wider uppercase block">
                CONTRACTOR SIGN
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE A: CORPORATE BLUE =================
  if (template === 'corporate-blue') {
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-800 relative">
        {/* Navy Blue Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-950 pt-5 pb-3 px-4 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-blue-500/10 blur-xs pointer-events-none" />
          <CompanyLogo
            logoUrl={settings.logoUrl}
            companyName={settings.companyName || 'NOVATECH SOLUTIONS'}
            tagline={settings.tagline || 'Technology | Innovation | Excellence'}
            theme="corporate-blue"
          />
        </div>

        {/* Photo with Verified Shield Ribbon */}
        <div className="relative flex flex-col items-center mt-2 px-4">
          <div className="relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={currentEmp.fullName}
                className="w-22 h-22 rounded-full object-cover ring-4 ring-white shadow-md border border-slate-200"
              />
            ) : (
              <div className="w-22 h-22 rounded-full bg-blue-50 text-blue-700 flex flex-col items-center justify-center ring-4 ring-white shadow-md border border-blue-200 font-bold text-xl">
                <span>{initials}</span>
                <span className="text-[9px] font-normal text-blue-500 mt-0.5">No Photo</span>
              </div>
            )}
            <div
              title="Verified Corporate Credential"
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Name & Title */}
          <h3 className="mt-2 text-sm font-bold text-slate-950 text-center leading-tight tracking-tight">
            {currentEmp.fullName}
          </h3>
          {showDesignation && (
            <p className="text-[11px] font-medium text-slate-500 text-center mt-0.5 truncate max-w-[240px]">
              {designation}
            </p>
          )}

          {showDepartment && currentEmp.department && (
            <div className="mt-1.5">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                {currentEmp.department}
              </span>
            </div>
          )}
        </div>

        {/* Metadata Details Grid */}
        <div className="px-5 text-[11px] space-y-1 text-slate-600">
          <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
            <span className="text-slate-400 font-medium text-[10px] uppercase">{idLabel}</span>
            <span className="font-mono font-bold text-slate-900">{empId}</span>
          </div>

          {showBloodGroup && currentEmp.bloodGroup && (
            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-400 font-medium text-[10px] uppercase">Blood Group</span>
              <span className="font-bold text-rose-600 font-mono">{currentEmp.bloodGroup}</span>
            </div>
          )}

          {showJoiningDate && (
            <div className="flex items-center justify-between py-0.5 text-[10px]">
              <span className="text-slate-400 uppercase">Joining Date</span>
              <span className="font-medium text-slate-700 font-mono">{joiningDate}</span>
            </div>
          )}

          {/* Dynamic Custom Fields */}
          {frontCustomFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between py-0.5 border-b border-slate-100 text-[10px]">
              <span className="text-slate-400 uppercase font-medium truncate max-w-[100px]">{field.label}</span>
              <span className="font-semibold text-slate-800 font-mono truncate max-w-[130px]" title={field.value}>{field.value}</span>
            </div>
          ))}
        </div>

        {/* Bottom Barcode & Security Strip */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {showBarcode && (
            <div className="flex flex-col">
              <div className="flex items-end gap-[1.5px] h-5 overflow-hidden">
                <div className="w-[1.5px] h-5 bg-slate-800" />
                <div className="w-[1px] h-5 bg-slate-800" />
                <div className="w-[2.5px] h-5 bg-slate-800" />
                <div className="w-[1px] h-5 bg-slate-800" />
                <div className="w-[2px] h-5 bg-slate-800" />
                <div className="w-[3px] h-5 bg-slate-800" />
                <div className="w-[1px] h-5 bg-slate-800" />
                <div className="w-[1.5px] h-5 bg-slate-800" />
                <div className="w-[2px] h-5 bg-slate-800" />
                <div className="w-[1px] h-5 bg-slate-800" />
                <div className="w-[2.5px] h-5 bg-slate-800" />
                <div className="w-[1.5px] h-5 bg-slate-800" />
                <div className="w-[3px] h-5 bg-slate-800" />
                <div className="w-[1px] h-5 bg-slate-800" />
                <div className="w-[2px] h-5 bg-slate-800" />
              </div>
              <span className="text-[8px] font-mono tracking-widest text-slate-500 text-center mt-0.5">
                {empId}
              </span>
            </div>
          )}

          {showQr && (
            <div className="p-0.5 bg-white rounded border border-slate-200 shadow-2xs">
              <QrCode className="w-6 h-6 text-slate-900" />
            </div>
          )}
        </div>

        {/* Colored Bottom Accent Band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700" />
      </div>
    )
  }

  // ================= TEMPLATE B: EXECUTIVE MINIMAL =================
  if (template === 'executive-minimal' || template === 'executive-slate') {
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-zinc-900 relative">
        {/* Minimal Charcoal Brand Top Strip */}
        <div className="pt-5 pb-2 px-4 border-b border-zinc-200/90 text-center">
          <CompanyLogo
            logoUrl={settings.logoUrl}
            companyName={settings.companyName || 'NOVATECH SOLUTIONS'}
            tagline={settings.tagline || 'Technology | Innovation | Excellence'}
            theme="executive-minimal"
          />
        </div>

        {/* Minimal Clean Photo Area */}
        <div className="relative flex flex-col items-center mt-1 px-4">
          <div className="relative p-1 rounded-full border border-zinc-300">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={currentEmp.fullName}
                className="w-22 h-22 rounded-full object-cover grayscale-25"
              />
            ) : (
              <div className="w-22 h-22 rounded-full bg-zinc-100 text-zinc-700 flex flex-col items-center justify-center font-bold text-xl">
                <span>{initials}</span>
                <span className="text-[8px] font-normal text-zinc-400">No Photo</span>
              </div>
            )}
          </div>

          <h3 className="mt-2 text-sm font-extrabold text-zinc-900 text-center uppercase tracking-tight">
            {currentEmp.fullName}
          </h3>

          {showDesignation && (
            <p className="text-[11px] font-medium text-zinc-500 text-center uppercase tracking-wider text-[10px] mt-0.5 truncate max-w-[240px]">
              {designation}
            </p>
          )}

          {showDepartment && currentEmp.department && (
            <div className="mt-1">
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 uppercase tracking-widest">
                {currentEmp.department}
              </span>
            </div>
          )}
        </div>

        {/* Minimalist Tabular Data */}
        <div className="px-5 text-[11px] space-y-1 text-zinc-700">
          <div className="flex items-center justify-between py-0.5 border-b border-zinc-100 font-mono">
            <span className="text-zinc-400 text-[10px] uppercase">{idLabel}</span>
            <span className="font-bold">{empId}</span>
          </div>

          {showBloodGroup && currentEmp.bloodGroup && (
            <div className="flex items-center justify-between py-0.5 border-b border-zinc-100 font-mono">
              <span className="text-zinc-400 text-[10px]">BLOOD TYPE</span>
              <span className="font-semibold text-rose-700">{currentEmp.bloodGroup}</span>
            </div>
          )}

          {showJoiningDate && (
            <div className="flex items-center justify-between py-0.5 font-mono text-[10px]">
              <span className="text-zinc-400">JOINED</span>
              <span className="font-medium text-zinc-600">{joiningDate}</span>
            </div>
          )}

          {/* Dynamic Custom Fields */}
          {frontCustomFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between py-0.5 border-b border-zinc-100 font-mono text-[10px]">
              <span className="text-zinc-400 uppercase truncate max-w-[100px]">{field.label}</span>
              <span className="font-semibold text-zinc-900 truncate max-w-[130px]" title={field.value}>{field.value}</span>
            </div>
          ))}
        </div>

        {/* Minimalist Optical Barcode */}
        <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          {showBarcode && (
            <div className="flex flex-col">
              <div className="flex items-end gap-[1.5px] h-5 overflow-hidden">
                <div className="w-[2px] h-5 bg-zinc-900" />
                <div className="w-[1px] h-5 bg-zinc-900" />
                <div className="w-[2px] h-5 bg-zinc-900" />
                <div className="w-[1px] h-5 bg-zinc-900" />
                <div className="w-[3px] h-5 bg-zinc-900" />
                <div className="w-[1px] h-5 bg-zinc-900" />
                <div className="w-[1.5px] h-5 bg-zinc-900" />
                <div className="w-[2px] h-5 bg-zinc-900" />
                <div className="w-[1px] h-5 bg-zinc-900" />
                <div className="w-[3px] h-5 bg-zinc-900" />
                <div className="w-[1px] h-5 bg-zinc-900" />
                <div className="w-[2px] h-5 bg-zinc-900" />
              </div>
              <span className="text-[8px] font-mono tracking-widest text-zinc-500 mt-0.5">
                {empId}
              </span>
            </div>
          )}

          {showQr && (
            <div className="p-0.5 bg-white rounded border border-zinc-300">
              <QrCode className="w-6 h-6 text-zinc-900" />
            </div>
          )}
        </div>

        {/* Thin Charcoal Bottom Line */}
        <div className="h-1 w-full bg-zinc-900" />
      </div>
    )
  }

  // ================= TEMPLATE C: MODERN TECH =================
  // (template === 'modern-tech' || template === 'tech-cyan')
  return (
    <div className="w-full h-full bg-[#0a0f1d] flex flex-col justify-between text-slate-100 relative overflow-hidden">
      {/* Background Cyber Grid Accent Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 pt-5 pb-3 px-4 text-center border-b border-cyan-800/40 relative z-10">
        <CompanyLogo
          logoUrl={settings.logoUrl}
          companyName={settings.companyName || 'NOVATECH SOLUTIONS'}
          tagline={settings.tagline || 'Technology | Innovation | Excellence'}
          theme="modern-tech"
        />
      </div>

      {/* Futuristic Glowing Photo Frame */}
      <div className="relative flex flex-col items-center mt-2 px-4 z-10">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-70 blur-xs" />
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={currentEmp.fullName}
              className="relative w-22 h-22 rounded-full object-cover ring-2 ring-cyan-400 bg-slate-900"
            />
          ) : (
            <div className="relative w-22 h-22 rounded-full bg-slate-900 text-cyan-400 ring-2 ring-cyan-400 flex flex-col items-center justify-center font-bold text-xl">
              <span>{initials}</span>
              <span className="text-[8px] font-mono text-cyan-300/70">NO PHOTO</span>
            </div>
          )}
          <div
            title="Encrypted Identity Token"
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center ring-2 ring-slate-950 font-bold text-[9px]"
          >
            ID
          </div>
        </div>

        <h3 className="mt-2 text-sm font-bold text-white text-center leading-tight tracking-wide">
          {currentEmp.fullName}
        </h3>

        {showDesignation && (
          <p className="text-[11px] font-mono text-cyan-300 text-center mt-0.5 truncate max-w-[240px]">
            {designation}
          </p>
        )}

        {showDepartment && currentEmp.department && (
          <div className="mt-1">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 uppercase tracking-widest shadow-2xs">
              {currentEmp.department}
            </span>
          </div>
        )}
      </div>

      {/* Cyber Meta Table */}
      <div className="px-5 text-[11px] space-y-1 font-mono text-slate-300 z-10">
        <div className="flex items-center justify-between py-0.5 border-b border-cyan-900/40">
          <span className="text-cyan-400/80 text-[10px] uppercase">{idLabel}:</span>
          <span className="font-bold text-white">{empId}</span>
        </div>

        {showBloodGroup && currentEmp.bloodGroup && (
          <div className="flex items-center justify-between py-0.5 border-b border-cyan-900/40">
            <span className="text-cyan-400/80 text-[10px]">BLOOD GROUP:</span>
            <span className="font-bold text-rose-400">{currentEmp.bloodGroup}</span>
          </div>
        )}

        {showJoiningDate && (
          <div className="flex items-center justify-between py-0.5 text-[10px]">
            <span className="text-cyan-400/80">COMMISSIONED:</span>
            <span className="text-slate-300">{joiningDate}</span>
          </div>
        )}

        {/* Dynamic Custom Fields */}
        {frontCustomFields.map((field) => (
          <div key={field.key} className="flex items-center justify-between py-0.5 border-b border-cyan-900/40 text-[10px]">
            <span className="text-cyan-400/80 uppercase truncate max-w-[100px]">{field.label}:</span>
            <span className="font-bold text-white truncate max-w-[130px]" title={field.value}>{field.value}</span>
          </div>
        ))}
      </div>

      {/* Bottom Optical Strip */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-cyan-900/50 flex items-center justify-between z-10">
        {showBarcode && (
          <div className="flex flex-col">
            <div className="flex items-end gap-[1.5px] h-5 overflow-hidden">
              <div className="w-[1.5px] h-5 bg-cyan-400" />
              <div className="w-[1px] h-5 bg-cyan-400" />
              <div className="w-[2.5px] h-5 bg-cyan-400" />
              <div className="w-[1px] h-5 bg-cyan-400" />
              <div className="w-[2px] h-5 bg-cyan-400" />
              <div className="w-[3px] h-5 bg-cyan-400" />
              <div className="w-[1px] h-5 bg-cyan-400" />
              <div className="w-[1.5px] h-5 bg-cyan-400" />
              <div className="w-[2px] h-5 bg-cyan-400" />
              <div className="w-[1px] h-5 bg-cyan-400" />
              <div className="w-[2.5px] h-5 bg-cyan-400" />
              <div className="w-[1.5px] h-5 bg-cyan-400" />
              <div className="w-[3px] h-5 bg-cyan-400" />
            </div>
            <span className="text-[8px] font-mono tracking-widest text-cyan-400/70 text-center mt-0.5">
              {empId}
            </span>
          </div>
        )}

        {showQr && (
          <div className="p-0.5 bg-slate-900 rounded border border-cyan-700/80 shadow-2xs">
            <QrCode className="w-6 h-6 text-cyan-400" />
          </div>
        )}
      </div>

      {/* Cyber Electric Cyan Bottom Glow */}
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 z-10" />
    </div>
  )
}

