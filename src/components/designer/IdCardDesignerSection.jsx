import React, { useState, useEffect, useRef } from 'react'
import {
  Palette,
  Sliders,
  Check,
  Maximize2,
  FileDown,
  Layers,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
  Upload,
  RotateCw,
  Eye,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { CardPreview } from './CardPreview'
import { CARD_TEMPLATES, CARD_SIZES } from '../../utils/constants'
import { useEmployees } from '../../context/EmployeeContext'
import {
  getSavedTemplateSettings,
  saveTemplateSettings,
  resetTemplateSettings,
} from '../../utils/templateStorage'

export const IdCardDesignerSection = ({
  selectedEmployee,
  onNavigateToExport,
}) => {
  const { employees, getEmployeePhoto, activeOrganization, updateActiveOrgSettings } = useEmployees()

  // Load saved template settings from localStorage
  const [settings, setSettings] = useState(() => getSavedTemplateSettings())
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0)
  const [scaleFactor, setScaleFactor] = useState(1)
  const [activeTabControl, setActiveTabControl] = useState('templates') // 'templates' | 'company' | 'fields'

  const logoInputRef = useRef(null)

  // Synchronize with active organization on org change
  useEffect(() => {
    if (activeOrganization) {
      setSettings((prev) => ({
        ...prev,
        selectedTemplateId: activeOrganization.defaultTemplateId || prev.selectedTemplateId,
        companyName: activeOrganization.companyName || prev.companyName,
        tagline: activeOrganization.tagline || prev.tagline,
        address: activeOrganization.address || prev.address,
        website: activeOrganization.website || prev.website,
        contactEmail: activeOrganization.contactEmail || prev.contactEmail,
        logoUrl: activeOrganization.logoUrl !== undefined ? activeOrganization.logoUrl : prev.logoUrl,
      }))
    }
  }, [activeOrganization?.id])

  // Persist settings to localStorage on change
  useEffect(() => {
    saveTemplateSettings(settings)
  }, [settings])

  // Active employee resolution
  const baseEmployee =
    selectedEmployee ||
    employees[currentEmployeeIndex] ||
    employees[0] || {
      id: 'EMP-1001',
      employeeId: 'EMP-1001',
      fullName: 'Sarah Jenkins',
      role: 'Lead Cloud Architect',
      designation: 'Lead Cloud Architect',
      department: 'Engineering',
      bloodGroup: 'O+',
      joiningDate: '2026-01-15',
      emergencyPhone: '+XX-XXXXXXXXXX',
    }

  const activePhotoUrl = getEmployeePhoto(baseEmployee)

  // Handle setting updates
  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Handle company logo file upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      updateSetting('logoUrl', event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    updateSetting('logoUrl', '')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset template customization and company details back to defaults?')) {
      const def = resetTemplateSettings()
      setSettings(def)
    }
  }

  const activeTemplate =
    CARD_TEMPLATES.find((t) => t.id === settings.selectedTemplateId) || CARD_TEMPLATES[0]
  const isSidwal = settings.selectedTemplateId === 'sidwal-workshop' || settings.selectedTemplateId?.startsWith('sidwal-')

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Professional ID Card Designer
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              CR80 Standard (85.6 × 53.98 mm)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Design corporate identity badges for <strong>{settings.companyName}</strong> with live front/back preview and persistent customization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleResetDefaults}
            title="Reset template and company details to default"
          >
            Reset Defaults
          </Button>

          {onNavigateToExport && (
            <Button
              variant="primary"
              size="sm"
              icon={FileDown}
              onClick={onNavigateToExport}
            >
              Batch Export Sheet
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sub-tab Switcher for Customization Controls */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTabControl('templates')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                activeTabControl === 'templates'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTabControl('company')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                activeTabControl === 'company'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Company Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTabControl('fields')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                activeTabControl === 'fields'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Card Fields
            </button>
          </div>

          {/* TAB 1: 3 PROFESSIONAL TEMPLATES */}
          {activeTabControl === 'templates' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Design Template
                </h4>
                <span className="text-xs text-blue-600 font-semibold">{CARD_TEMPLATES.length} Styles</span>
              </div>

              <div className="space-y-3">
                {CARD_TEMPLATES.map((tmpl) => {
                  const isSelected = settings.selectedTemplateId === tmpl.id
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      data-template-id={tmpl.id}
                      onClick={() => updateSetting('selectedTemplateId', tmpl.id)}
                      className={`w-full flex items-start justify-between p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 rounded-full border shadow-2xs shrink-0 mt-0.5"
                          style={{ backgroundColor: tmpl.accentColor }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900">{tmpl.displayName || tmpl.name}</p>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                              {tmpl.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {tmpl.description}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          {/* TAB 2: COMPANY INFORMATION & BRANDING */}
          {activeTabControl === 'company' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Company Details & Logo
                </h4>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto-Saved
                </span>
              </div>

              {isSidwal || activeOrganization?.isImmutableBranding ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Official North Eastern Railway Workshop Branding (Protected)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Per workshop specification, the SIDWAL logo, MECHANICAL WORKSHOP GORAKHPUR, NORTH EASTERN RAILWAY, and SIDWAL REFRIGERATION INDUSTRIES (P) LTD headings are permanent and protected from alterations.
                  </p>
                </div>
              ) : (
                <>
                  {/* Logo Upload Box */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Company Logo
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-16 h-10 bg-white rounded border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                        {settings.logoUrl ? (
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Text Logo</span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-wrap gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{settings.logoUrl ? 'Change' : 'Upload Logo'}</span>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleLogoUpload}
                          />
                        </label>

                        {settings.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Remove custom logo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company / Institution Name
                    </label>
                    <input
                      type="text"
                      value={settings.companyName || ''}
                      onChange={(e) => {
                        updateSetting('companyName', e.target.value)
                        updateActiveOrgSettings({ companyName: e.target.value })
                      }}
                      placeholder="e.g. NOVATECH SOLUTIONS"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tagline / Motto
                    </label>
                    <input
                      type="text"
                      value={settings.tagline || ''}
                      onChange={(e) => {
                        updateSetting('tagline', e.target.value)
                        updateActiveOrgSettings({ tagline: e.target.value })
                      }}
                      placeholder="e.g. Technology | Innovation | Excellence"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus / Physical Address
                    </label>
                    <input
                      type="text"
                      value={settings.address || ''}
                      onChange={(e) => {
                        updateSetting('address', e.target.value)
                        updateActiveOrgSettings({ address: e.target.value })
                      }}
                      placeholder="City, State, Country"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Website
                    </label>
                    <input
                      type="text"
                      value={settings.website || ''}
                      onChange={(e) => {
                        updateSetting('website', e.target.value)
                        updateActiveOrgSettings({ website: e.target.value })
                      }}
                      placeholder="www.example.com"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </Card>
          )}

          {/* TAB 3: FIELD VISIBILITY TOGGLES */}
          {activeTabControl === 'fields' && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Optional Field Visibility
                </h4>
                <span className="text-[11px] text-slate-500">Front & Back Toggles</span>
              </div>

              <div className="space-y-2.5">
                {/* Blood Group */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Blood Group</p>
                    <p className="text-[11px] text-slate-500">Front medical badge indicator</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showBloodGroup !== false}
                    onChange={(e) => updateSetting('showBloodGroup', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Joining Date */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Joining Date</p>
                    <p className="text-[11px] text-slate-500">Employment issue date</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showJoiningDate !== false}
                    onChange={(e) => updateSetting('showJoiningDate', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Department */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Department Pill</p>
                    <p className="text-[11px] text-slate-500">Department color badge</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showDepartment !== false}
                    onChange={(e) => updateSetting('showDepartment', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Barcode */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Optical Barcode</p>
                    <p className="text-[11px] text-slate-500">Code 128 scanner format</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showBarcode !== false}
                    onChange={(e) => updateSetting('showBarcode', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* QR Code */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">QR Code (Front & Back)</p>
                    <p className="text-[11px] text-slate-500">Digital verification token</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showQrCode !== false}
                    onChange={(e) => updateSetting('showQrCode', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Signatures on Back */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Signatures (Back Side)</p>
                    <p className="text-[11px] text-slate-500">Bearer & authorized signature lines</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showSignatures !== false}
                    onChange={(e) => updateSetting('showSignatures', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Emergency Contact */}
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Emergency Phone (Back)</p>
                    <p className="text-[11px] text-slate-500">Emergency hotline placeholder</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showEmergencyContact !== false}
                    onChange={(e) => updateSetting('showEmergencyContact', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>
              </div>
            </Card>
          )}

          {/* Custom Fields Placement Control (Available for configurable templates) */}
          {Object.keys(baseEmployee?.customFields || {}).length > 0 && !isSidwal && (
            <Card className="p-4 sm:p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Custom Fields Placement
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Configure which custom attributes appear on the Front or Back side of the card.
              </p>
              <div className="space-y-2">
                {Object.entries(baseEmployee.customFields).map(([key, val], idx) => {
                  const placements = settings.customFieldPlacements || {}
                  const currentSide = placements[key] || (idx < 2 ? 'front' : 'back')
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/[_-]+/g, ' ')
                    .trim()
                    .replace(/\b\w/g, (c) => c.toUpperCase())

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{label}</p>
                        <p className="text-[11px] text-slate-500 truncate" title={String(val)}>
                          {String(val)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting('customFieldPlacements', {
                              ...placements,
                              [key]: 'front',
                            })
                          }
                          className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            currentSide === 'front'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Front
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting('customFieldPlacements', {
                              ...placements,
                              [key]: 'back',
                            })
                          }
                          className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            currentSide === 'back'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Employee Selector Card */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Select Employee To Preview
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {employees.length} Records
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {employees.slice(0, 15).map((emp, idx) => {
                const photo = getEmployeePhoto(emp)
                const isSelected = idx === currentEmployeeIndex && !selectedEmployee
                const empId = emp.employeeId || emp.id

                return (
                  <button
                    key={empId || idx}
                    type="button"
                    onClick={() => setCurrentEmployeeIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={emp.fullName}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                        {emp.fullName?.[0] || 'E'}
                      </div>
                    )}
                    <span>{emp.firstName || emp.fullName?.split(' ')[0] || 'Staff'}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Interactive Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <Card className="w-full p-6 sm:p-8 bg-radial from-slate-100 to-slate-200/60 flex flex-col items-center justify-center min-h-[560px] relative overflow-hidden">
            {/* Top Canvas Toolbar */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  {settings.cardSide === 'front' ? 'Front Side View' : 'Back Side View'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">• {activeTemplate.name}</span>
              </div>

              {/* Side Switcher (Front vs Back) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs font-semibold">
                  <button
                    type="button"
                    data-side="front"
                    onClick={() => updateSetting('cardSide', 'front')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      settings.cardSide === 'front'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Front Side
                  </button>
                  <button
                    type="button"
                    data-side="back"
                    onClick={() => updateSetting('cardSide', 'back')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      settings.cardSide === 'back'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Back Side
                  </button>
                </div>

                {/* Quick Flip Button */}
                <button
                  type="button"
                  onClick={() =>
                    updateSetting('cardSide', settings.cardSide === 'front' ? 'back' : 'front')
                  }
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-medium flex items-center gap-1"
                  title="Flip Card"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip</span>
                </button>

                {/* Zoom Toggle */}
                <button
                  type="button"
                  onClick={() => setScaleFactor(scaleFactor === 1 ? 1.08 : 1)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-medium flex items-center gap-1"
                  title="Toggle Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{scaleFactor === 1 ? '110%' : '100%'}</span>
                </button>
              </div>
            </div>

            {/* Live Rendered CR80 Card */}
            <div className="py-2 transition-transform duration-200">
              <CardPreview
                employee={baseEmployee}
                photoUrl={activePhotoUrl}
                template={settings.selectedTemplateId}
                side={settings.cardSide}
                settings={settings}
                scale={scaleFactor}
              />
            </div>

            {/* Bottom Card Specifications & Metadata */}
            <div className="mt-5 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                CR80 Plastic Badge Standard • 85.6 mm × 53.98 mm
              </p>
              <p className="text-[11px] text-slate-400">
                ISO/IEC 7810 ID-1 Form Factor • 300 DPI High-Resolution Ready
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
