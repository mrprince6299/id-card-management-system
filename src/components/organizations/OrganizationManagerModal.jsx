import React, { useState, useMemo } from 'react'
import {
  Building2,
  X,
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Check,
  ShieldAlert,
  ArrowRight,
  Upload,
  RefreshCw,
} from 'lucide-react'
import { useEmployees } from '../../context/EmployeeContext'
import { CARD_TYPES } from '../../utils/cardTypes'

const PRESET_COLORS = [
  { name: 'Corporate Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Railway Red', hex: '#e30613' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Slate', hex: '#475569' },
]

export const OrganizationManagerModal = ({ isOpen, onClose }) => {
  const {
    organizations,
    activeOrgId,
    activeOrganization,
    switchOrganization,
    createOrganization,
    editOrganization,
    archiveOrg,
    restoreOrg,
    deleteOrg,
    reassignLegacyRecords,
    unassignedRecords,
    getOrgRecordCount,
    getOrgPhotoCount,
  } = useEmployees()

  // Tabs: 'list' | 'edit' | 'unassigned'
  const [activeTab, setActiveTab] = useState('list')
  const [listFilter, setListFilter] = useState('active') // 'active' | 'archived' | 'all'

  // Form State for Create/Edit
  const [editingOrgId, setEditingOrgId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    tagline: '',
    address: '',
    website: '',
    contactEmail: '',
    emergencyPhonePlaceholder: '',
    cardType: 'employee',
    defaultTemplateId: 'corporate-blue',
    customAccentColor: '#2563eb',
    logoUrl: '',
  })
  const [formErrors, setFormErrors] = useState({})

  // Deletion Safety Modal State
  const [deleteTargetOrg, setDeleteTargetOrg] = useState(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Unassigned Records Reassignment State
  const [targetReassignOrgId, setTargetReassignOrgId] = useState('')
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState(new Set())
  const [reassignConfirmModal, setReassignConfirmModal] = useState(null)
  const [reassignSuccessMsg, setReassignSuccessMsg] = useState('')

  // Filtered organizations list
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      if (org.id === 'unassigned-legacy') return false
      if (listFilter === 'active') return !org.isArchived
      if (listFilter === 'archived') return Boolean(org.isArchived)
      return true
    })
  }, [organizations, listFilter])

  // Count active non-archived organizations
  const activeOrgsCount = useMemo(() => {
    return organizations.filter((o) => !o.isArchived && o.id !== 'unassigned-legacy').length
  }, [organizations])

  if (!isOpen) return null

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingOrgId(null)
    setFormData({
      name: '',
      companyName: '',
      tagline: '',
      address: '',
      website: '',
      contactEmail: '',
      emergencyPhonePlaceholder: '+91-XXXXXXXXXX',
      cardType: 'employee',
      defaultTemplateId: 'corporate-blue',
      customAccentColor: '#2563eb',
      logoUrl: '',
    })
    setFormErrors({})
    setActiveTab('edit')
  }

  // Open Edit Form
  const handleOpenEdit = (org) => {
    setEditingOrgId(org.id)
    setFormData({
      name: org.name || '',
      companyName: org.companyName || '',
      tagline: org.tagline || '',
      address: org.address || '',
      website: org.website || '',
      contactEmail: org.contactEmail || '',
      emergencyPhonePlaceholder: org.emergencyPhonePlaceholder || '',
      cardType: org.cardType || 'employee',
      defaultTemplateId: org.defaultTemplateId || 'corporate-blue',
      customAccentColor: org.customAccentColor || '#2563eb',
      logoUrl: org.logoUrl || '',
      isImmutableBranding: Boolean(org.isImmutableBranding),
    })
    setFormErrors({})
    setActiveTab('edit')
  }

  // Handle Logo File Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logoUrl: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  // Save Form (Create or Edit)
  const handleSaveForm = (e) => {
    e.preventDefault()
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Organization name is required.'
    if (!formData.companyName.trim() && !formData.isImmutableBranding) {
      errors.companyName = 'Company name for card header is required.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (editingOrgId) {
      editOrganization(editingOrgId, formData)
    } else {
      createOrganization(formData)
    }

    setActiveTab('list')
  }

  // Handle Archive
  const handleArchive = (org) => {
    try {
      archiveOrg(org.id)
    } catch (err) {
      alert(err.message)
    }
  }

  // Handle Restore
  const handleRestore = (org) => {
    try {
      restoreOrg(org.id)
    } catch (err) {
      alert(err.message)
    }
  }

  // Handle Delete Click
  const handleRequestDelete = (org) => {
    const recCount = getOrgRecordCount(org.id)
    const photoCount = getOrgPhotoCount(org.id)
    setDeleteTargetOrg({
      ...org,
      recordCount: recCount,
      photoCount,
    })
    setDeleteConfirmInput('')
    setDeleteError('')
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetOrg) return
    try {
      await deleteOrg(deleteTargetOrg.id, { confirmName: deleteConfirmInput.trim() })
      setDeleteTargetOrg(null)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  // Handle Unassigned Selection
  const handleToggleSelectUnassigned = (recId) => {
    setSelectedUnassignedIds((prev) => {
      const next = new Set(prev)
      if (next.has(recId)) next.delete(recId)
      else next.add(recId)
      return next
    })
  }

  const handleSelectAllUnassigned = () => {
    if (selectedUnassignedIds.size === unassignedRecords.length) {
      setSelectedUnassignedIds(new Set())
    } else {
      setSelectedUnassignedIds(new Set(unassignedRecords.map((r) => r.recordId)))
    }
  }

  // Trigger Reassignment Confirmation
  const handleRequestReassign = (scope = 'selected') => {
    const activeTargetOrg = organizations.find((o) => o.id === targetReassignOrgId && !o.isArchived)
    if (!activeTargetOrg) {
      alert('Please select an active destination organization first.')
      return
    }

    const idsToReassign = scope === 'all'
      ? unassignedRecords.map((r) => r.recordId)
      : Array.from(selectedUnassignedIds)

    if (idsToReassign.length === 0) {
      alert('No unassigned records selected.')
      return
    }

    const recordsSubset = unassignedRecords.filter((r) => idsToReassign.includes(r.recordId))
    const photosToMigrate = recordsSubset.filter((r) => r.hasPhoto).length

    setReassignConfirmModal({
      targetOrg: activeTargetOrg,
      idsToReassign,
      recordsCount: idsToReassign.length,
      photosCount: photosToMigrate,
    })
  }

  // Execute Reassignment
  const handleExecuteReassign = async () => {
    if (!reassignConfirmModal) return
    try {
      const result = await reassignLegacyRecords(
        reassignConfirmModal.targetOrg.id,
        reassignConfirmModal.idsToReassign
      )
      setReassignConfirmModal(null)
      setSelectedUnassignedIds(new Set())
      setReassignSuccessMsg(
        `Successfully reassigned ${result.reassignedCount} records and migrated ${result.photosMigratedCount} photos into ${result.targetOrgName}.`
      )
      setTimeout(() => setReassignSuccessMsg(''), 6000)
    } catch (err) {
      alert(`Reassignment failed: ${err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Organization & Institution Manager</h2>
              <p className="text-xs text-slate-500">
                Multi-tenant organization isolation, branding configurations, and unassigned records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center justify-between px-6 bg-slate-100/70 border-b border-slate-200 text-sm">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Organizations ({organizations.filter((o) => o.id !== 'unassigned-legacy').length})
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingOrgId ? 'Edit Organization' : 'New Organization'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unassigned')}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'unassigned'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Unassigned Records</span>
              {unassignedRecords.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                  {unassignedRecords.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="flex items-center gap-1.5 py-2">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs">
                {['active', 'archived', 'all'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setListFilter(f)}
                    className={`px-2.5 py-1 font-medium capitalize rounded-md transition-colors ${
                      listFilter === f ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: ORGANIZATIONS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {filteredOrgs.length} {listFilter} organizations. Data, records, and photos are strictly isolated.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Organization</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrgs.map((org) => {
                  const isActive = org.id === activeOrgId
                  const isArchived = Boolean(org.isArchived)
                  const recordCount = getOrgRecordCount(org.id)
                  const photoCount = getOrgPhotoCount(org.id)

                  return (
                    <div
                      key={org.id}
                      className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-xs'
                          : isArchived
                          ? 'border-slate-200 bg-slate-50/60 opacity-80'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            {org.logoUrl && org.logoUrl !== 'asset:sidwal-logo' ? (
                              <img
                                src={org.logoUrl}
                                alt={org.name}
                                className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-2xs"
                                style={{ backgroundColor: org.customAccentColor || '#2563eb' }}
                              >
                                {org.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-slate-900 leading-snug">{org.name}</h3>
                                {isActive && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-md">
                                    ACTIVE
                                  </span>
                                )}
                                {isArchived && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md">
                                    ARCHIVED
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">
                                {org.companyName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(org)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit organization branding"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Tagline & Badges */}
                        {org.tagline && (
                          <p className="text-xs text-slate-600 line-clamp-1 italic mb-2.5">"{org.tagline}"</p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200/80">
                            Type: {org.cardType || 'employee'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200/80">
                            Template: {org.defaultTemplateId || 'corporate-blue'}
                          </span>
                          {org.isImmutableBranding && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                              Fixed Branding
                            </span>
                          )}
                        </div>

                        {/* Metrics Bar */}
                        <div className="flex items-center gap-4 py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 mb-3">
                          <div>
                            <span className="font-bold text-slate-800">{recordCount}</span> records
                          </div>
                          <div className="text-slate-300">•</div>
                          <div>
                            <span className="font-bold text-slate-800">{photoCount}</span> photos
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
                        <div>
                          {!isActive && !isArchived && (
                            <button
                              type="button"
                              onClick={() => switchOrganization(org.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              <span>Switch to this Org</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {isActive && (
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Current Active Portal</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Archive / Restore Button */}
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(org)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="Restore archived organization"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={activeOrgsCount <= 1 || org.isImmutableBranding}
                              onClick={() => handleArchive(org)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                activeOrgsCount <= 1 || org.isImmutableBranding
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title={
                                org.isImmutableBranding
                                  ? 'System organization cannot be archived'
                                  : activeOrgsCount <= 1
                                  ? 'Cannot archive the only remaining active organization'
                                  : 'Archive organization'
                              }
                            >
                              <Archive className="w-3.5 h-3.5 text-slate-500" />
                              <span>Archive</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={activeOrgsCount <= 1 || org.isImmutableBranding}
                            onClick={() => handleRequestDelete(org)}
                            className={`p-1 text-xs font-medium rounded-md transition-colors ${
                              activeOrgsCount <= 1 || org.isImmutableBranding
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title={
                              org.isImmutableBranding
                                ? 'Protected system organization cannot be deleted'
                                : activeOrgsCount <= 1
                                ? 'Cannot delete the only remaining active organization'
                                : 'Permanently delete organization'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE / EDIT ORGANIZATION FORM */}
          {activeTab === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form */}
              <form onSubmit={handleSaveForm} className="lg:col-span-2 space-y-4">
                {formData.isImmutableBranding && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Protected Official Branding:</span> Company headers, workshop
                      designations, and logo for this organization are legally bound to contract specifications and
                      cannot be altered.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Organization Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Apex Institute of Technology"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.name && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Card Header Company Name *
                    </label>
                    <input
                      type="text"
                      disabled={formData.isImmutableBranding}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. APEX INSTITUTE OF TECHNOLOGY"
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                        formData.isImmutableBranding
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                    {formErrors.companyName && (
                      <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.companyName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motto / Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Excellence in Engineering & Applied Sciences"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Card Type</label>
                    <select
                      value={formData.cardType}
                      onChange={(e) => setFormData({ ...formData, cardType: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CARD_TYPES.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Card Template</label>
                    <select
                      value={formData.defaultTemplateId}
                      onChange={(e) => setFormData({ ...formData, defaultTemplateId: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="corporate-blue">Corporate Blue</option>
                      <option value="modern-tech">Modern Tech</option>
                      <option value="executive-minimal">Executive Minimal</option>
                      <option value="sidwal-workshop">SIDWAL Mechanical Workshop</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Phone Text</label>
                    <input
                      type="text"
                      value={formData.emergencyPhonePlaceholder}
                      onChange={(e) => setFormData({ ...formData, emergencyPhonePlaceholder: e.target.value })}
                      placeholder="+91-XXXXXXXXXX"
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Greater Noida, UP, India"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="e.g. www.apex-institute.edu"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Accent Color Palette */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Brand Accent Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, customAccentColor: c.hex })}
                        className={`w-7 h-7 rounded-lg transition-transform border flex items-center justify-center ${
                          formData.customAccentColor === c.hex
                            ? 'scale-110 ring-2 ring-slate-900 border-white'
                            : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {formData.customAccentColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="color"
                        value={formData.customAccentColor || '#2563eb'}
                        onChange={(e) => setFormData({ ...formData, customAccentColor: e.target.value })}
                        className="w-7 h-7 p-0 rounded-md border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.customAccentColor}
                        onChange={(e) => setFormData({ ...formData, customAccentColor: e.target.value })}
                        placeholder="#2563eb"
                        className="w-20 px-2 py-1 text-xs font-mono border border-slate-300 rounded-md uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization Logo</label>
                  {!formData.isImmutableBranding ? (
                    <div className="flex items-center gap-3">
                      {formData.logoUrl ? (
                        <div className="relative group">
                          <img
                            src={formData.logoUrl}
                            alt="Logo preview"
                            className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logoUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 shadow-2xs"
                            title="Remove logo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                          <Building2 className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px]">No Logo</span>
                        </div>
                      )}
                      <div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer shadow-2xs transition-colors">
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>Upload Image</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, SVG or WebP (max 2 MB recommended)</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Official fixed SIDWAL logo locked by template policy.</p>
                  )}
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                  >
                    {editingOrgId ? 'Save Changes' : 'Create Organization'}
                  </button>
                </div>
              </form>

              {/* Right Col: Live Card Branding Preview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live Brand Preview</h4>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Preview of card banner, accent colors, and branding elements.
                  </p>

                  <div className="rounded-xl overflow-hidden shadow-md border border-slate-300 bg-white">
                    {/* Header Banner */}
                    <div
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: formData.customAccentColor || '#2563eb' }}
                    >
                      <div className="flex items-center gap-2">
                        {formData.logoUrl ? (
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="w-8 h-8 object-contain bg-white rounded-md p-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs">
                            {(formData.name || 'ORG').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-bold tracking-tight uppercase leading-none">
                            {formData.companyName || 'COMPANY NAME'}
                          </p>
                          <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                            {formData.tagline || 'Organization Tagline'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-black/20 rounded uppercase">
                        {formData.cardType}
                      </span>
                    </div>

                    {/* Card Body Mock */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-14 h-16 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
                        PHOTO
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 w-24 bg-slate-800 rounded"></div>
                        <div className="h-2 w-16 bg-slate-400 rounded"></div>
                        <div className="h-2 w-20 bg-slate-300 rounded"></div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 text-[9px] text-slate-500 flex justify-between">
                      <span>{formData.website || 'www.example.com'}</span>
                      <span>{formData.emergencyPhonePlaceholder || '+XX-XXXXXXXXXX'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic text-center mt-4">
                  Changes update across designer views and generated cards.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNASSIGNED LEGACY COHORT & REASSIGNMENT */}
          {activeTab === 'unassigned' && (
            <div className="space-y-4">
              {reassignSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reassignSuccessMsg}</span>
                </div>
              )}

              {unassignedRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No Unassigned Records Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    All records in the database are properly partitioned into isolated tenant organizations.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Unassigned Legacy Cohort Detected ({unassignedRecords.length} records)</p>
                      <p className="text-amber-800 mt-0.5">
                        These records were preserved during migration or import without a definitive organization.
                        Select a destination organization below to safely reassign them. All record IDs, personal data,
                        and photo associations will be preserved.
                      </p>
                    </div>
                  </div>

                  {/* Reassignment Target Bar */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Assign To:</span>
                      <select
                        value={targetReassignOrgId}
                        onChange={(e) => setTargetReassignOrgId(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Choose Active Organization --</option>
                        {organizations
                          .filter((o) => !o.isArchived && o.id !== 'unassigned-legacy')
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.companyName})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedUnassignedIds.size === 0 || !targetReassignOrgId}
                        onClick={() => handleRequestReassign('selected')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors ${
                          selectedUnassignedIds.size === 0 || !targetReassignOrgId
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Reassign Selected ({selectedUnassignedIds.size})
                      </button>
                      <button
                        type="button"
                        disabled={!targetReassignOrgId}
                        onClick={() => handleRequestReassign('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors ${
                          !targetReassignOrgId
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                      >
                        Reassign All ({unassignedRecords.length})
                      </button>
                    </div>
                  </div>

                  {/* Records Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                unassignedRecords.length > 0 &&
                                selectedUnassignedIds.size === unassignedRecords.length
                              }
                              onChange={handleSelectAllUnassigned}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="py-2.5 px-3">Displayed ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Role / Designation</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3 text-center">Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {unassignedRecords.map((rec) => {
                          const isSelected = selectedUnassignedIds.has(rec.recordId)
                          return (
                            <tr
                              key={rec.recordId}
                              onClick={() => handleToggleSelectUnassigned(rec.recordId)}
                              className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                                isSelected ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectUnassigned(rec.recordId)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                                {rec.displayedId || rec.employeeId || rec.id}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">{rec.fullName}</td>
                              <td className="py-2 px-3 text-slate-600">{rec.role || rec.designation || '—'}</td>
                              <td className="py-2 px-3 text-slate-600">{rec.department || '—'}</td>
                              <td className="py-2 px-3 text-center">
                                {rec.hasPhoto ? (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                    Photo OK
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
                                    No Photo
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>Active Tenant: </span>
            <span className="font-bold text-slate-800">{activeOrganization?.name || 'Novatech'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* REASSIGNMENT CONFIRMATION & AUDIT DIALOG */}
      {reassignConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Legacy Reassignment</h3>
                <p className="text-xs text-slate-500">Review migration details before applying</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-bold text-slate-800">{reassignConfirmModal.targetOrg.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Records to Reassign:</span>
                <span className="font-bold text-slate-800">{reassignConfirmModal.recordsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IndexedDB Photos to Migrate:</span>
                <span className="font-bold text-slate-800">{reassignConfirmModal.photosCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Internal record IDs, displayed IDs, field values, custom fields, and photos will remain intact. Photos will be
              namespaced under <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{reassignConfirmModal.targetOrg.id}</code>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReassignConfirmModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
              >
                Confirm & Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETION SAFETY MODAL */}
      {deleteTargetOrg && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Delete Organization Safely</h3>
                <p className="text-xs text-rose-500">Permanent data loss warning</p>
              </div>
            </div>

            {deleteTargetOrg.recordCount > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
                  <p className="font-bold">
                    Warning: This organization currently contains {deleteTargetOrg.recordCount} records and{' '}
                    {deleteTargetOrg.photoCount} photos.
                  </p>
                  <p>
                    Permanently deleting will erase all records and photos associated strictly with this organization.
                    Other organizations will NOT be affected.
                  </p>
                  <p className="font-semibold text-blue-700">
                    💡 Tip: We strongly recommend Archiving this organization instead to preserve records.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    To confirm permanent deletion, type the organization name:{' '}
                    <span className="font-mono text-rose-600">"{deleteTargetOrg.name}"</span>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder={deleteTargetOrg.name}
                    className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  {deleteError && <p className="text-[11px] text-rose-600 mt-1">{deleteError}</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <span className="font-bold">{deleteTargetOrg.name}</span>? This organization
                contains 0 records.
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetOrg(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTargetOrg.recordCount > 0 && deleteConfirmInput.trim() !== deleteTargetOrg.name}
                onClick={handleConfirmDelete}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors ${
                  deleteTargetOrg.recordCount > 0 && deleteConfirmInput.trim() !== deleteTargetOrg.name
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
