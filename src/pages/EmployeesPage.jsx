import React, { useState, useMemo, useRef } from 'react'
import {
  Users,
  Search,
  Filter,
  Eye,
  Trash2,
  Building,
  RotateCcw,
  FileSpreadsheet,
  PlusCircle,
  Edit2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  DownloadCloud,
  UploadCloud,
  CheckSquare,
  Square,
  X,
  Check,
  Tag,
} from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { useEmployees } from '../context/EmployeeContext'
import { CARD_TYPES, getCardTypeById, getDisplayId } from '../utils/cardTypes'

export const EmployeesPage = ({ onSelectEmployeeForDesigner, onNavigateToImport }) => {
  const {
    employees,
    addRecord,
    updateRecord,
    deleteRecord,
    bulkDeleteRecords,
    archiveRecord,
    restoreRecord,
    bulkUpdateStatus,
    selectedRecordIds,
    toggleSelectRecord,
    selectAllRecords,
    clearRecordSelection,
    resetToDefault,
    getEmployeePhoto,
    createFullBackup,
    restoreFromBackup,
  } = useEmployees()

  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCardType, setFilterCardType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [modalFormData, setModalFormData] = useState({})
  const [modalCardType, setModalCardType] = useState('employee')
  const [customFieldPairs, setCustomFieldPairs] = useState([]) // [{ key: '', value: '' }]

  const restoreFileInputRef = useRef(null)

  // Compute duplicate ID occurrences
  const duplicateIdSet = useMemo(() => {
    const idCount = new Map()
    for (const emp of employees) {
      const id = getDisplayId(emp)
      if (id) {
        idCount.set(id, (idCount.get(id) || 0) + 1)
      }
    }
    const duplicates = new Set()
    for (const [id, count] of idCount.entries()) {
      if (count > 1) duplicates.add(id)
    }
    return duplicates
  }, [employees])

  // Dynamically compute department/unit list from stored employees
  const dynamicDepartments = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
    ]
  }, [employees])

  // Filtered roster
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const status = emp.status || 'Pending'
      const isArchived = emp.archived === true || status.toLowerCase() === 'archived'

      // Status Filter logic
      if (filterStatus === 'archived') {
        if (!isArchived) return false
      } else if (filterStatus !== 'all') {
        if (isArchived || status.toLowerCase() !== filterStatus.toLowerCase()) return false
      } else {
        // 'all' hides archived records by default unless specifically selected
        if (isArchived) return false
      }

      // Department filter
      if (filterDepartment !== 'all' && emp.department !== filterDepartment) {
        return false
      }

      // Card Type filter
      if (filterCardType !== 'all') {
        const cType = emp.cardType || 'employee'
        if (cType !== filterCardType) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const dispId = getDisplayId(emp).toLowerCase()
        const name = (emp.fullName || '').toLowerCase()
        const email = (emp.email || '').toLowerCase()
        const dept = (emp.department || '').toLowerCase()
        const desig = (emp.designation || '').toLowerCase()
        const phone = (emp.phone || '').toLowerCase()

        if (!dispId.includes(q) && !name.includes(q) && !email.includes(q) && !dept.includes(q) && !desig.includes(q) && !phone.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [employees, filterDepartment, filterStatus, filterCardType, searchQuery])

  // Select all visible filtered records
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((emp) => selectedRecordIds.has(emp.recordId || emp.id))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      clearRecordSelection()
    } else {
      selectAllRecords(filtered.map((emp) => emp.recordId || emp.id))
    }
  }

  // Open Add Record Modal
  const handleOpenAddModal = () => {
    const defaultType = 'employee'
    setModalCardType(defaultType)
    setModalFormData({
      cardType: defaultType,
      firstName: '',
      lastName: '',
      department: '',
      designation: '',
      email: '',
      phone: '',
      bloodGroup: '',
      fatherName: '',
      aadhaarNumber: '',
      address: '',
    })
    setCustomFieldPairs([])
    setIsAddModalOpen(true)
  }

  // Open Edit Record Modal
  const handleOpenEditModal = (record) => {
    setEditingRecord(record)
    const cType = record.cardType || 'employee'
    setModalCardType(cType)
    setModalFormData({ ...record })

    // Load custom fields
    if (record.customFields && typeof record.customFields === 'object') {
      const pairs = Object.entries(record.customFields).map(([k, v]) => ({ key: k, value: v }))
      setCustomFieldPairs(pairs)
    } else {
      setCustomFieldPairs([])
    }
  }

  // Save Add/Edit Record
  const handleSaveModal = (e) => {
    e.preventDefault()

    // Package custom fields
    const customFieldsObj = {}
    for (const pair of customFieldPairs) {
      if (pair.key.trim()) {
        customFieldsObj[pair.key.trim()] = pair.value.trim()
      }
    }

    const payload = {
      ...modalFormData,
      cardType: modalCardType,
      customFields: customFieldsObj,
    }

    if (editingRecord) {
      updateRecord(editingRecord.recordId || editingRecord.id, payload)
      setEditingRecord(null)
    } else {
      addRecord(payload)
      setIsAddModalOpen(false)
    }
  }

  // Backup and Restore Handlers
  const handleDownloadBackup = async () => {
    try {
      const backup = await createFullBackup()
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `idcard-backup-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch (err) {
      alert(`Backup failed: ${err.message}`)
    }
  }

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result)
        if (window.confirm(`Restore database from backup? This will import ${json.records?.length || 0} records and ${json.photos?.length || 0} photos.`)) {
          const res = await restoreFromBackup(json)
          alert(`Successfully restored ${res.recordsCount} records and ${res.photosCount} photos!`)
        }
      } catch (err) {
        alert(`Failed to restore backup: ${err.message}`)
      } finally {
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Identity Card Management Roster
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {employees.length} Records in Storage
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            General-purpose credential records, field configurations, and multi-organization issuance tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Backup / Restore */}
          <Button
            variant="outline"
            size="sm"
            icon={DownloadCloud}
            onClick={handleDownloadBackup}
            title="Download full JSON backup with records & photos"
          >
            Backup
          </Button>

          <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs">
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Restore</span>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json"
              className="sr-only"
              onChange={handleRestoreFile}
            />
          </label>

          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={() => {
              if (window.confirm('Reset database back to initial sample records?')) {
                resetToDefault()
              }
            }}
            title="Reset database back to initial mock records"
          >
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={PlusCircle}
            onClick={handleOpenAddModal}
            className="text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-50"
          >
            Add Record
          </Button>

          {onNavigateToImport && (
            <Button
              variant="primary"
              size="sm"
              icon={FileSpreadsheet}
              onClick={onNavigateToImport}
            >
              Import Sheet
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID code, course, email..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Card Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Tag className="w-3.5 h-3.5" />
              <span>Type:</span>
            </div>
            <select
              value={filterCardType}
              onChange={(e) => setFilterCardType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Card Types</option>
              {CARD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Building className="w-3.5 h-3.5" />
              <span>Unit:</span>
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
            >
              {dynamicDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Units' : dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              {['all', 'Generated', 'Pending', 'Draft', 'archived'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'archived' ? 'Archived' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedRecordIds.size > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {selectedRecordIds.size}
              </span>
              <span className="text-xs font-semibold text-blue-900">
                {selectedRecordIds.size} record{selectedRecordIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Bulk Action:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateStatus(Array.from(selectedRecordIds), 'Generated')}
                className="text-xs py-1 h-auto"
              >
                Mark Generated
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateStatus(Array.from(selectedRecordIds), 'Pending')}
                className="text-xs py-1 h-auto"
              >
                Mark Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateStatus(Array.from(selectedRecordIds), 'Archived')}
                className="text-xs py-1 h-auto text-amber-700 hover:bg-amber-50"
              >
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Permanently delete ${selectedRecordIds.size} selected records?`)) {
                    bulkDeleteRecords(Array.from(selectedRecordIds))
                  }
                }}
                className="text-xs py-1 h-auto text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                Delete
              </Button>
              <button
                type="button"
                onClick={clearRecordSelection}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-2"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Table Card */}
      <Card className="p-5 sm:p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-8">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-slate-500 hover:text-slate-800"
                    title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Identity Record</th>
                <th className="py-3 px-3">Display ID Code</th>
                <th className="py-3 px-3">Type & Unit</th>
                <th className="py-3 px-3">Blood Group</th>
                <th className="py-3 px-3">Validity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No matching credential records found.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const dispId = getDisplayId(emp)
                  const recordKey = emp.recordId || emp.id || dispId
                  const isSelected = selectedRecordIds.has(recordKey)
                  const isDuplicate = dispId && duplicateIdSet.has(dispId)
                  const cardTypeInfo = getCardTypeById(emp.cardType)
                  const isArchived = emp.archived === true || emp.status?.toLowerCase() === 'archived'

                  return (
                    <tr
                      key={recordKey}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectRecord(recordKey)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getEmployeePhoto(emp) || emp.avatarUrl}
                            alt={emp.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 ring-1 ring-slate-100 shrink-0"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
                            }}
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{emp.fullName || '—'}</span>
                              {isDuplicate && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200"
                                  title="Duplicate ID collision detected in active roster"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Duplicate
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{emp.email || emp.phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-700">
                        {dispId || <span className="text-slate-300 font-normal italic">No ID</span>}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{emp.department || '—'}</span>
                          <span className="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {cardTypeInfo.label.split(' ')[0]}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{emp.role || emp.designation || '—'}</p>
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold text-slate-700">
                        {emp.bloodGroup || '—'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        <div>{emp.issueDate || '—'}</div>
                        <div className="text-[10px] text-slate-400">to {emp.expiryDate || '—'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={emp.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            onClick={() => onSelectEmployeeForDesigner?.(emp)}
                            title="Preview in ID Card Designer"
                            className="py-1 px-2 h-auto text-xs"
                          >
                            Design
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => restoreRecord(recordKey)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Restore from archive"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => archiveRecord(recordKey)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Archive record"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete record for ${emp.fullName || dispId}?`)) {
                                deleteRecord(recordKey)
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Displaying <strong>{filtered.length}</strong> of{' '}
            <strong>{employees.length}</strong> persistent records in local storage
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">
            Local Storage & IndexedDB active
          </span>
        </div>
      </Card>

      {/* Add / Edit Record Modal */}
      {(isAddModalOpen || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRecord ? 'Edit Identity Record' : 'Add New Identity Record'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure personal details, card type schema, and custom attributes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingRecord(null)
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Card Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Identity Card Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CARD_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setModalCardType(t.id)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all ${
                        modalCardType === t.id
                          ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900 ring-1 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {getCardTypeById(modalCardType).idFieldLabel} (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalFormData.displayedId || modalFormData.employeeId || modalFormData.rollNo || ''}
                    onChange={(e) =>
                      setModalFormData((prev) => ({
                        ...prev,
                        displayedId: e.target.value,
                        employeeId: e.target.value,
                      }))
                    }
                    placeholder="e.g. ID-1001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name / Given Name
                  </label>
                  <input
                    type="text"
                    value={modalFormData.fullName || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {getCardTypeById(modalCardType).primaryFieldLabel}
                  </label>
                  <input
                    type="text"
                    value={modalFormData.department || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Engineering / Science"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {getCardTypeById(modalCardType).secondaryFieldLabel}
                  </label>
                  <input
                    type="text"
                    value={modalFormData.designation || ''}
                    onChange={(e) =>
                      setModalFormData((prev) => ({
                        ...prev,
                        designation: e.target.value,
                        role: e.target.value,
                      }))
                    }
                    placeholder="e.g. Lead Specialist / 3rd Year"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={modalFormData.fatherName || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                    placeholder="Father / Guardian Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={modalFormData.bloodGroup || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                    placeholder="e.g. O+, A+, B+"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={modalFormData.phone || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Mobile number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aadhaar / ID No</label>
                  <input
                    type="text"
                    value={modalFormData.aadhaarNumber || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, aadhaarNumber: e.target.value }))}
                    placeholder="Aadhaar or National ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={modalFormData.address || ''}
                    onChange={(e) => setModalFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Full residential or permanent address"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Custom Attributes</span>
                  <button
                    type="button"
                    onClick={() => setCustomFieldPairs((prev) => [...prev, { key: '', value: '' }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    + Add Field
                  </button>
                </div>

                {customFieldPairs.length > 0 && (
                  <div className="space-y-2">
                    {customFieldPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pair.key}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomFieldPairs((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, key: val } : p))
                            )
                          }}
                          placeholder="Field Label (e.g. Bus Route)"
                          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                        />
                        <input
                          type="text"
                          value={pair.value}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomFieldPairs((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, value: val } : p))
                            )
                          }}
                          placeholder="Field Value (e.g. Route 14)"
                          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomFieldPairs((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setEditingRecord(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Check}>
                  {editingRecord ? 'Save Changes' : 'Create Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
