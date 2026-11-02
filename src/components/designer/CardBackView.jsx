import React from 'react'
import { QrCode, MapPin, Globe, Mail, Phone, AlertCircle } from 'lucide-react'
import { getCustomFieldsForSide } from '../../utils/customFields'

export const CardBackView = ({
  employee,
  template = 'corporate-blue',
  settings = {},
}) => {
  const currentEmp = employee || {
    id: 'EMP-1001',
    employeeId: 'EMP-1001',
    fullName: 'Sarah Jenkins',
    emergencyPhone: '+XX-XXXXXXXXXX',
  }

  const companyName = settings.companyName || 'NOVATECH SOLUTIONS'
  const address = settings.address || 'Dehradun, Uttarakhand, India'
  const website = settings.website || 'www.novatech.example'
  const contactEmail = settings.contactEmail || 'contact@novatech.example'
  const emergencyPhone =
    currentEmp.emergencyPhone || settings.emergencyPhonePlaceholder || '+XX-XXXXXXXXXX'

  const showEmergencyContact = settings.showEmergencyContact !== false
  const showSignatures = settings.showSignatures !== false
  const showQrCode = settings.showQrCode !== false

  // Resolved dynamic custom fields for back side (omitted for locked SIDWAL)
  const backCustomFields = getCustomFieldsForSide(currentEmp, 'back', settings, template)

  // ================= TEMPLATE D: SIDWAL MECHANICAL WORKSHOP (BACK) =================
  if (template === 'sidwal-workshop') {
    const bloodGroup = currentEmp.bloodGroup || ''
    const aadhaar = currentEmp.aadhaarNumber || currentEmp.aadhaar || currentEmp.aadhar || ''
    const phone = currentEmp.phone || ''
    const empAddress = currentEmp.address || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 text-[10px] relative select-none font-sans overflow-hidden">
        {/* Top Dark Navy Header & Red Accent Strip */}
        <div>
          <div className="h-9 w-full bg-[#0d2b59] flex items-center justify-center">
            <span className="font-bold text-[10.5px] text-white tracking-[0.16em] uppercase">
              CARDHOLDER DETAILS
            </span>
          </div>
          <div className="h-[2.5px] w-full bg-[#e30613]" />
        </div>

        {/* Dynamic Cardholder Personal Details */}
        <div className="px-5 pt-4 space-y-3.5 text-[9.5px] font-bold">
          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[100px] shrink-0 uppercase tracking-wide">
              BLOOD GROUP :
            </span>
            <span className="text-black uppercase font-bold">{bloodGroup}</span>
          </div>

          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[100px] shrink-0 uppercase tracking-wide">
              AADHAAR NO. :
            </span>
            <span className="text-black uppercase font-bold">{aadhaar}</span>
          </div>

          <div className="flex items-baseline">
            <span className="text-[#0d2b59] w-[100px] shrink-0 uppercase tracking-wide">
              MOBILE NO. :
            </span>
            <span className="text-black uppercase font-bold">{phone}</span>
          </div>

          <div className="flex items-start">
            <span className="text-[#0d2b59] w-[100px] shrink-0 uppercase tracking-wide pt-0.5">
              ADDRESS :
            </span>
            <span className="text-black uppercase font-bold leading-snug flex-1">
              {empAddress}
            </span>
          </div>
        </div>

        {/* Bottom Right Signatory */}
        <div className="mt-auto pb-4 pr-5 flex flex-col items-end">
          <div className="w-32 h-[1px] bg-slate-400 mb-1" />
          <span className="text-[7.5px] font-bold text-[#0d2b59] tracking-wider uppercase block text-right">
            AUTHORIZED SIGNATORY
          </span>
          <span className="text-[6.5px] text-slate-500 font-medium italic block text-right mt-0.5">
            Name & Designation
          </span>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL MODERN CORPORATE (BACK) =================
  if (template === 'sidwal-modern-corporate') {
    const bloodGroup = currentEmp.bloodGroup || ''
    const aadhaar = currentEmp.aadhaarNumber || currentEmp.aadhaar || currentEmp.aadhar || ''
    const phone = currentEmp.phone || ''
    const empAddress = currentEmp.address || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 text-[10px] relative select-none font-sans overflow-hidden">
        {/* Modern Corporate Navy Header */}
        <div>
          <div className="h-9 w-full bg-[#0d2b59] flex items-center justify-center shadow-xs">
            <span className="font-bold text-[10.5px] text-white tracking-[0.16em] uppercase">
              CARDHOLDER DETAILS
            </span>
          </div>
          <div className="h-[2.5px] w-full bg-[#e30613]" />
        </div>

        {/* Structured Personal Details Cards */}
        <div className="px-4 pt-3.5 space-y-2.5 text-[9px] font-bold">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-[#0d2b59] uppercase tracking-wide">BLOOD GROUP :</span>
            <span className="text-slate-950 font-black px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 uppercase">
              {bloodGroup}
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-[#0d2b59] uppercase tracking-wide">AADHAAR NO. :</span>
            <span className="text-slate-900 font-mono font-bold">{aadhaar}</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span className="text-[#0d2b59] uppercase tracking-wide">MOBILE NO. :</span>
            <span className="text-slate-900 font-bold">{phone}</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-left">
            <span className="text-[#0d2b59] uppercase tracking-wide block mb-0.5">ADDRESS :</span>
            <span className="text-slate-800 font-semibold leading-relaxed block text-[8.5px]">
              {empAddress}
            </span>
          </div>
        </div>

        {/* Modern Bottom Signatory */}
        <div className="mt-auto pb-4 pr-5 flex flex-col items-end">
          <div className="w-32 h-[1.5px] bg-[#0d2b59] mb-1" />
          <span className="text-[7.5px] font-bold text-[#0d2b59] tracking-wider uppercase block text-right">
            AUTHORIZED SIGNATORY
          </span>
          <span className="text-[6.5px] text-slate-500 font-medium italic block text-right mt-0.5">
            Name & Designation
          </span>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL INDUSTRIAL ENGINEERING (BACK) =================
  if (template === 'sidwal-industrial-engineering') {
    const bloodGroup = currentEmp.bloodGroup || ''
    const aadhaar = currentEmp.aadhaarNumber || currentEmp.aadhaar || currentEmp.aadhar || ''
    const phone = currentEmp.phone || ''
    const empAddress = currentEmp.address || ''

    return (
      <div className="w-full h-full bg-[#f8fafc] flex flex-col justify-between text-slate-900 text-[10px] relative select-none font-sans overflow-hidden border-2 border-slate-300">
        {/* Technical Charcoal & Steel Bar */}
        <div>
          <div className="h-9 w-full bg-[#1e293b] flex items-center justify-center">
            <span className="font-mono font-bold text-[10px] text-white tracking-[0.18em] uppercase">
              CARDHOLDER DETAILS // RECORD
            </span>
          </div>
          <div className="h-[2.5px] w-full bg-[#dc2626]" />
        </div>

        {/* Technical Spec Box Readouts */}
        <div className="px-3.5 pt-3 space-y-2 font-mono text-[8.5px]">
          <div className="p-1.5 bg-white rounded border border-slate-300 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase">BLOOD GROUP :</span>
            <span className="text-slate-950 font-bold uppercase">{bloodGroup}</span>
          </div>

          <div className="p-1.5 bg-white rounded border border-slate-300 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase">AADHAAR NO. :</span>
            <span className="text-slate-900 font-bold">{aadhaar}</span>
          </div>

          <div className="p-1.5 bg-white rounded border border-slate-300 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase">MOBILE NO. :</span>
            <span className="text-slate-900 font-bold">{phone}</span>
          </div>

          <div className="p-1.5 bg-white rounded border border-slate-300 text-left">
            <span className="text-slate-500 font-bold uppercase block mb-0.5">ADDRESS :</span>
            <span className="text-slate-800 font-medium leading-snug block text-[8px]">
              {empAddress}
            </span>
          </div>
        </div>

        {/* Technical Authorization Seal */}
        <div className="mt-auto pb-3.5 pr-4 flex flex-col items-end">
          <div className="w-28 h-[1px] border-b border-dashed border-slate-600 mb-1" />
          <span className="font-mono text-[7px] font-bold text-slate-800 tracking-wider uppercase block text-right">
            AUTHORIZED SIGNATORY
          </span>
          <span className="font-mono text-[6px] text-slate-500 block text-right mt-0.5">
            Name & Designation
          </span>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL PREMIUM EXECUTIVE (BACK) =================
  if (template === 'sidwal-premium-executive') {
    const bloodGroup = currentEmp.bloodGroup || ''
    const aadhaar = currentEmp.aadhaarNumber || currentEmp.aadhaar || currentEmp.aadhar || ''
    const phone = currentEmp.phone || ''
    const empAddress = currentEmp.address || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 text-[10px] relative select-none font-sans overflow-hidden">
        {/* Executive Midnight Header */}
        <div>
          <div className="h-9 w-full bg-[#091b36] flex items-center justify-center">
            <span className="font-serif font-medium text-[9.5px] text-slate-100 tracking-[0.24em] uppercase">
              C A R D H O L D E R   D E T A I L S
            </span>
          </div>
          <div className="h-[1.5px] w-full bg-[#b91c1c]" />
        </div>

        {/* Minimalist Executive Tabular Rows */}
        <div className="px-5 pt-4 space-y-3 text-[9px] font-sans">
          <div className="flex items-baseline border-b border-slate-100 pb-1.5">
            <span className="text-[#091b36] font-bold w-[95px] shrink-0 uppercase tracking-wider text-[8px]">
              BLOOD GROUP :
            </span>
            <span className="text-slate-900 font-bold uppercase">{bloodGroup}</span>
          </div>

          <div className="flex items-baseline border-b border-slate-100 pb-1.5">
            <span className="text-[#091b36] font-bold w-[95px] shrink-0 uppercase tracking-wider text-[8px]">
              AADHAAR NO. :
            </span>
            <span className="text-slate-900 font-mono font-medium">{aadhaar}</span>
          </div>

          <div className="flex items-baseline border-b border-slate-100 pb-1.5">
            <span className="text-[#091b36] font-bold w-[95px] shrink-0 uppercase tracking-wider text-[8px]">
              MOBILE NO. :
            </span>
            <span className="text-slate-900 font-medium">{phone}</span>
          </div>

          <div className="flex items-start">
            <span className="text-[#091b36] font-bold w-[95px] shrink-0 uppercase tracking-wider text-[8px] pt-0.5">
              ADDRESS :
            </span>
            <span className="text-slate-800 font-normal leading-relaxed flex-1 text-[8.5px]">
              {empAddress}
            </span>
          </div>
        </div>

        {/* Executive Bottom Right Signatory */}
        <div className="mt-auto pb-4 pr-5 flex flex-col items-end">
          <div className="w-28 h-[1px] bg-slate-300 mb-1" />
          <span className="text-[7px] font-semibold text-[#091b36] tracking-wider uppercase block text-right">
            AUTHORIZED SIGNATORY
          </span>
          <span className="text-[6px] text-slate-400 font-serif italic block text-right mt-0.5">
            Name & Designation
          </span>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE: SIDWAL CONTEMPORARY OFFICIAL (BACK) =================
  if (template === 'sidwal-contemporary-official') {
    const bloodGroup = currentEmp.bloodGroup || ''
    const aadhaar = currentEmp.aadhaarNumber || currentEmp.aadhaar || currentEmp.aadhar || ''
    const phone = currentEmp.phone || ''
    const empAddress = currentEmp.address || ''

    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-900 text-[10px] relative select-none font-sans overflow-hidden">
        {/* Royal Navy Header */}
        <div>
          <div className="h-9 w-full bg-[#0a326a] flex items-center justify-center">
            <span className="font-extrabold text-[10.5px] text-white tracking-[0.16em] uppercase">
              CARDHOLDER DETAILS
            </span>
          </div>
          <div className="h-[3px] w-full bg-[#e11d48]" />
        </div>

        {/* Banded Information Cards */}
        <div className="px-4 pt-3.5 space-y-2 text-[9px] font-bold">
          <div className="flex items-baseline bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[#0a326a] w-[95px] shrink-0 uppercase tracking-wide text-[8.5px]">
              BLOOD GROUP :
            </span>
            <span className="text-slate-950 font-black uppercase">{bloodGroup}</span>
          </div>

          <div className="flex items-baseline bg-white p-2 rounded border border-slate-200">
            <span className="text-[#0a326a] w-[95px] shrink-0 uppercase tracking-wide text-[8.5px]">
              AADHAAR NO. :
            </span>
            <span className="text-slate-900 font-mono font-bold">{aadhaar}</span>
          </div>

          <div className="flex items-baseline bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[#0a326a] w-[95px] shrink-0 uppercase tracking-wide text-[8.5px]">
              MOBILE NO. :
            </span>
            <span className="text-slate-900 font-bold">{phone}</span>
          </div>

          <div className="flex items-start bg-white p-2 rounded border border-slate-200">
            <span className="text-[#0a326a] w-[95px] shrink-0 uppercase tracking-wide text-[8.5px] pt-0.5">
              ADDRESS :
            </span>
            <span className="text-slate-800 font-semibold leading-snug flex-1 text-[8.5px]">
              {empAddress}
            </span>
          </div>
        </div>

        {/* Official Signatory Footer */}
        <div className="mt-auto pb-4 pr-5 flex flex-col items-end">
          <div className="w-32 h-[1.5px] bg-[#0a326a] mb-1" />
          <span className="text-[7.5px] font-bold text-[#0a326a] tracking-wider uppercase block text-right">
            AUTHORIZED SIGNATORY
          </span>
          <span className="text-[6.5px] text-slate-500 font-medium italic block text-right mt-0.5">
            Name & Designation
          </span>
        </div>
      </div>
    )
  }

  // ================= TEMPLATE A: CORPORATE BLUE (BACK) =================
  if (template === 'corporate-blue') {
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-slate-800 text-[10px] relative select-none">
        {/* Top Magnetic Stripe Simulation */}
        <div>
          <div className="h-7 w-full bg-slate-900 border-b border-slate-700" />
          <div className="px-4 pt-2 text-center">
            <h4 className="font-extrabold text-[11px] text-blue-900 tracking-wide uppercase">
              {companyName}
            </h4>
            <p className="text-[8px] text-slate-400 font-medium">Terms & Conditions of Issue</p>
          </div>
        </div>

        {/* Card Terms & Usage Agreement */}
        <div className="px-4 text-[9px] text-slate-600 leading-snug space-y-1">
          <p>
            1. This card is official identification and property of <strong>{companyName}</strong>.
          </p>
          <p>
            2. It must be prominently displayed while on company premises and returned upon cessation of employment.
          </p>
          <p className="italic text-slate-500">
            If found, please surrender to security or return by post to the address below.
          </p>
        </div>

        {/* Company Contact Information */}
        <div className="mx-4 p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[9px] text-slate-700">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">{address}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="font-mono text-blue-700">{website}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="font-mono text-slate-600">{contactEmail}</span>
          </div>

          {showEmergencyContact && (
            <div className="pt-1 mt-1 border-t border-slate-200 flex items-center justify-between text-rose-700 font-medium">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Emergency Hotline:
              </span>
              <span className="font-mono">{emergencyPhone}</span>
            </div>
          )}

          {/* Dynamic Custom Fields on Back */}
          {backCustomFields.length > 0 && (
            <div className="pt-1 mt-1 border-t border-slate-200/90 space-y-1">
              {backCustomFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between text-[8.5px]">
                  <span className="text-slate-500 font-semibold uppercase truncate max-w-[100px]">{field.label}:</span>
                  <span className="font-mono text-slate-800 font-medium truncate max-w-[130px]" title={field.value}>{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signatures & Security QR Code */}
        <div className="px-4 pb-2 space-y-2">
          {showSignatures && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center">
                <div className="h-6 border-b border-slate-400 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-500 text-[10px]">
                    {currentEmp.fullName?.split(' ')[0]}
                  </span>
                </div>
                <p className="text-[7.5px] uppercase font-bold text-slate-400 mt-0.5">
                  Cardholder Signature
                </p>
              </div>

              <div className="text-center">
                <div className="h-6 border-b border-blue-400 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-blue-900 text-[10px] font-bold">
                    Novatech HR
                  </span>
                </div>
                <p className="text-[7.5px] uppercase font-bold text-slate-400 mt-0.5">
                  Authorized Signatory
                </p>
              </div>
            </div>
          )}

          {showQrCode && (
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100">
              <QrCode className="w-7 h-7 text-slate-900" />
              <div className="text-[8px] text-slate-500 leading-tight text-left">
                <p className="font-bold text-slate-700">Digital Verification</p>
                <p>Scan to verify security token</p>
              </div>
            </div>
          )}
        </div>

        {/* Colored Bottom Accent Band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700" />
      </div>
    )
  }

  // ================= TEMPLATE B: EXECUTIVE MINIMAL (BACK) =================
  if (template === 'executive-minimal' || template === 'executive-slate') {
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between text-zinc-900 text-[10px] relative select-none">
        {/* Minimal Header */}
        <div className="pt-4 px-4 text-center border-b border-zinc-200 pb-2">
          <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-900">
            {companyName}
          </h4>
          <p className="text-[8px] font-mono text-zinc-400 uppercase mt-0.5">
            Credential Information & Policies
          </p>
        </div>

        {/* Minimal Terms */}
        <div className="px-4 text-[8.5px] font-mono text-zinc-600 leading-normal space-y-1">
          <p>• PROPERTY OF {companyName}. NON-TRANSFERABLE.</p>
          <p>• MUST BE SURRENDERED IMMEDIATELY UPON DEMAND.</p>
          <p className="text-zinc-400">
            • IF FOUND RETURN TO: {address.toUpperCase()}
          </p>
        </div>

        {/* Contact Coordinates */}
        <div className="mx-4 p-2 rounded border border-zinc-300 font-mono text-[8.5px] text-zinc-700 space-y-0.5">
          <p className="font-bold text-zinc-900">HQ LOCATION: {address}</p>
          <p>PORTAL: {website}</p>
          <p>INQUIRIES: {contactEmail}</p>
          {showEmergencyContact && (
            <p className="text-rose-700 font-semibold pt-0.5 border-t border-zinc-200 mt-1">
              EMERGENCY: {emergencyPhone}
            </p>
          )}

          {/* Dynamic Custom Fields on Back */}
          {backCustomFields.length > 0 && (
            <div className="pt-1 mt-1 border-t border-zinc-200 space-y-0.5">
              {backCustomFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between text-[8px]">
                  <span className="text-zinc-500 uppercase truncate max-w-[100px]">{field.label}:</span>
                  <span className="font-bold text-zinc-900 truncate max-w-[130px]" title={field.value}>{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Signature Lines */}
        <div className="px-4 pb-3 space-y-2">
          {showSignatures && (
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="text-center">
                <div className="h-6 border-b border-zinc-400 flex items-end justify-center pb-0.5 font-serif italic text-zinc-600">
                  {currentEmp.fullName?.split(' ')[0]}
                </div>
                <p className="text-[7.5px] text-zinc-400 uppercase mt-0.5">EMPLOYEE SIGNATURE</p>
              </div>

              <div className="text-center">
                <div className="h-6 border-b border-zinc-900 flex items-end justify-center pb-0.5 font-serif italic text-zinc-900 font-bold">
                  VALIDATED
                </div>
                <p className="text-[7.5px] text-zinc-400 uppercase mt-0.5">OFFICIAL SEAL</p>
              </div>
            </div>
          )}

          {showQrCode && (
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-zinc-200 font-mono">
              <QrCode className="w-6 h-6 text-zinc-900" />
              <span className="text-[8px] text-zinc-500">ISO/IEC 7810 COMPLIANT</span>
            </div>
          )}
        </div>

        <div className="h-1 w-full bg-zinc-900" />
      </div>
    )
  }

  // ================= TEMPLATE C: MODERN TECH (BACK) =================
  // (template === 'modern-tech' || template === 'tech-cyan')
  return (
    <div className="w-full h-full bg-[#0a0f1d] flex flex-col justify-between text-slate-200 text-[10px] relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

      {/* Cyber Header */}
      <div className="pt-4 px-4 pb-2 border-b border-cyan-800/40 text-center relative z-10">
        <h4 className="font-bold text-xs uppercase tracking-widest text-cyan-400">
          {companyName}
        </h4>
        <p className="text-[8px] font-mono text-cyan-500/70 tracking-wider">
          ACCESS CONTROL PROTOCOL
        </p>
      </div>

      {/* Cyber Terms */}
      <div className="px-4 text-[8.5px] font-mono text-slate-400 leading-normal space-y-1 relative z-10">
        <p>1. Encrypted biometric identity key. Restricted facility access only.</p>
        <p>2. Unauthorized reproduction or misuse is punishable by federal security code.</p>
        <p className="text-cyan-400/80">
          Return to command center: {address}
        </p>
      </div>

      {/* Cyber Contact Coordinates Box */}
      <div className="mx-4 p-2 rounded-lg bg-slate-900/90 border border-cyan-800/50 font-mono text-[9px] text-slate-300 space-y-1 relative z-10 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-cyan-400">HQ:</span>
          <span className="truncate">{address}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cyan-400">NET:</span>
          <span className="text-white">{website}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cyan-400">COMM:</span>
          <span>{contactEmail}</span>
        </div>
        {showEmergencyContact && (
          <div className="pt-1 mt-1 border-t border-cyan-900/60 flex items-center justify-between text-rose-400 font-bold">
            <span>EMERGENCY:</span>
            <span>{emergencyPhone}</span>
          </div>
        )}

        {/* Dynamic Custom Fields on Back */}
        {backCustomFields.length > 0 && (
          <div className="pt-1 mt-1 border-t border-cyan-900/60 space-y-0.5">
            {backCustomFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between text-[8px]">
                <span className="text-cyan-400/80 uppercase truncate max-w-[100px]">{field.label}:</span>
                <span className="text-white font-bold truncate max-w-[130px]" title={field.value}>{field.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cyber Signatures & QR */}
      <div className="px-4 pb-3 space-y-2 relative z-10 font-mono">
        {showSignatures && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="h-6 border-b border-cyan-700/60 flex items-end justify-center pb-0.5 font-serif italic text-cyan-300">
                {currentEmp.fullName?.split(' ')[0]}
              </div>
              <p className="text-[7.5px] text-cyan-500/80 uppercase mt-0.5">BEARER SIGNATURE</p>
            </div>

            <div className="text-center">
              <div className="h-6 border-b border-cyan-400 flex items-end justify-center pb-0.5 font-serif italic text-cyan-300 font-bold">
                ENCRYPTED
              </div>
              <p className="text-[7.5px] text-cyan-500/80 uppercase mt-0.5">SECURITY OFFICER</p>
            </div>
          </div>
        )}

        {showQrCode && (
          <div className="flex items-center justify-center gap-2 pt-1 border-t border-cyan-900/50">
            <div className="p-0.5 bg-slate-900 rounded border border-cyan-600/80">
              <QrCode className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-[8px] text-cyan-400/80 tracking-widest">
              AUTHENTICATED 300 DPI
            </span>
          </div>
        )}
      </div>

      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 z-10" />
    </div>
  )
}

