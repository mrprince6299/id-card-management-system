import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Filter,
  Layers,
  ArrowLeft,
  Download,
  Tag,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { parseSpreadsheetFile, autoGuessMapping, applyColumnMapping } from '../../utils/importer'
import { REQUIRED_FIELDS, OPTIONAL_FIELDS, validateBatch } from '../../utils/validator'
import { useEmployees } from '../../context/EmployeeContext'
import { CARD_TYPES, getCardTypeById } from '../../utils/cardTypes'

export const ImportEmployeesSection = ({ onNavigateToEmployees, onNavigateToDesigner }) => {
  const { employees, importEmployees, activeOrganization } = useEmployees()

  // Workflow steps: 'upload' -> 'mapping' -> 'preview' -> 'complete'
  const [step, setStep] = useState('upload')

  // Selected Card Type Schema for import
  const [selectedCardType, setSelectedCardType] = useState(() => activeOrganization?.cardType || 'employee')
  const [lenientMode, setLenientMode] = useState(true) // No personal field mandatory by default

  // File & parsing state
  const [fileInfo, setFileInfo] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState({})

  // Preview & validated records state
  const [records, setRecords] = useState([])
  const [previewFilter, setPreviewFilter] = useState('all') // 'all' | 'valid' | 'invalid'
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  // Duplicate strategy: 'skip' | 'update'
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip')

  // Final completion summary
  const [importSummary, setImportSummary] = useState(null)

  const fileInputRef = useRef(null)

  // Handle file reading
  const processUploadedFile = async (file) => {
    if (!file) return

    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setParseError('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.')
      return
    }

    setParseError(null)
    setIsProcessing(true)

    try {
      const parsedData = await parseSpreadsheetFile(file)
      setFileInfo(parsedData)

      // Auto-guess initial column mapping
      const guessed = autoGuessMapping(parsedData.headers)
      setColumnMapping(guessed)

      setStep('mapping')
    } catch (err) {
      setParseError(err.message || 'Failed to process spreadsheet file.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files?.[0]) {
      processUploadedFile(e.dataTransfer.files[0])
    }
  }

  // Handle Mapping Apply -> Preview & Validation
  const handleApplyMapping = () => {
    if (!fileInfo) return

    // Apply mapping to raw rows
    const mapped = applyColumnMapping(fileInfo.rawRows, fileInfo.headers, columnMapping, {
      cardType: selectedCardType,
    })

    // Validate the batch against existing directory records
    const validated = validateBatch(mapped, employees, {
      strictRequired: !lenientMode,
      cardType: selectedCardType,
    })

    setRecords(validated)
    setStep('preview')
  }

  // Live row editing in preview table
  const handleStartEdit = (index) => {
    setEditingRowIndex(index)
    setEditFormData({ ...records[index] })
  }

  const handleSaveEdit = (index) => {
    const updatedRecords = [...records]
    const updatedRecord = {
      ...editFormData,
      fullName: editFormData.fullName || `${editFormData.firstName || ''} ${editFormData.lastName || ''}`.trim(),
      role: editFormData.designation || editFormData.role,
    }

    updatedRecords[index] = updatedRecord

    // Re-validate batch
    const revalidated = validateBatch(updatedRecords, employees, {
      strictRequired: !lenientMode,
      cardType: selectedCardType,
    })
    setRecords(revalidated)
    setEditingRowIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingRowIndex(null)
    setEditFormData({})
  }

  const handleDeleteRow = (index) => {
    const remaining = records.filter((_, idx) => idx !== index)
    const revalidated = validateBatch(remaining, employees, {
      strictRequired: !lenientMode,
      cardType: selectedCardType,
    })
    setRecords(revalidated)
  }

  // Confirm Import
  const handleConfirmImport = () => {
    const validRecords = records.filter((r) => r._validation?.isValid)
    if (validRecords.length === 0) return

    const summary = importEmployees(validRecords, duplicateStrategy)
    const invalidCount = records.length - validRecords.length

    setImportSummary({
      ...summary,
      invalidCount,
      totalProcessed: records.length,
    })
    setStep('complete')
  }

  // Reset workflow
  const handleResetWorkflow = () => {
    setStep('upload')
    setFileInfo(null)
    setRecords([])
    setColumnMapping({})
    setImportSummary(null)
    setParseError(null)
    setEditingRowIndex(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Download Sample Template
  const handleDownloadSample = (format = 'csv') => {
    const cardInfo = getCardTypeById(selectedCardType)
    const sampleHeaders = [
      cardInfo.idFieldLabel,
      'First Name',
      'Last Name',
      cardInfo.primaryFieldLabel,
      cardInfo.secondaryFieldLabel,
      'Email',
      'Phone',
      'Joining Date',
      'Blood Group',
      "Father's Name",
      'Aadhaar Number',
      'Address',
    ]

    const sampleRows = [
      [
        'ID-2001',
        'Arthur',
        'Pendleton',
        'Engineering',
        'DevOps Specialist',
        'arthur.p@example.com',
        '+91 98765 00001',
        '2026-02-15',
        'O+',
        'Thomas Pendleton',
        'XXXX-XXXX-1111',
        'Sector 4, City',
      ],
      [
        'ID-2002',
        'Nadia',
        'Kasparov',
        'Data & AI',
        'Senior Scientist',
        'nadia.k@example.com',
        '+91 98765 00002',
        '2026-03-01',
        'A+',
        'Alexander Kasparov',
        'XXXX-XXXX-2222',
        'Campus Residence B',
      ],
    ]

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Records')

    if (format === 'csv') {
      XLSX.writeFile(wb, `sample_${selectedCardType}_template.csv`)
    } else {
      XLSX.writeFile(wb, `sample_${selectedCardType}_template.xlsx`)
    }
  }

  // Filter preview records
  const filteredRecords = records.filter((rec) => {
    if (previewFilter === 'valid') return rec._validation?.isValid
    if (previewFilter === 'invalid') return !rec._validation?.isValid
    return true
  })

  const validCount = records.filter((r) => r._validation?.isValid).length
  const invalidCount = records.length - validCount
  const duplicateDetectedCount = records.filter(
    (r) =>
      r._validation?.warnings?.some((w) => w.includes('already exists')) ||
      r._validation?.errors?.some((e) => e.includes('Duplicate'))
  ).length
  const skippedEmptyRows = fileInfo?.totalRawCount ? Math.max(0, fileInfo.totalRawCount - records.length) : 0

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Spreadsheet Import & Schema Ingestion
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Import records for any card type (Employees, Students, Visitors, Passes) with custom mapping and validation.
          </p>
        </div>

        {/* Progress Pills */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1 rounded-full border transition-colors ${
              step === 'upload'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            1. File Upload
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1 rounded-full border transition-colors ${
              step === 'mapping'
                ? 'bg-blue-600 text-white border-blue-600'
                : step === 'preview' || step === 'complete'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            2. Column Mapping
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1 rounded-full border transition-colors ${
              step === 'preview'
                ? 'bg-blue-600 text-white border-blue-600'
                : step === 'complete'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            3. Preview & Validate
          </span>
        </div>
      </div>

      {/* ================= STEP 1: UPLOAD ================= */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Card Type Selection Bar */}
            <Card className="p-4 bg-slate-50 border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Select Ingestion Card Type Schema:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CARD_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedCardType(t.id)}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      selectedCardType === t.id
                        ? 'border-blue-600 bg-white font-semibold text-blue-900 shadow-2xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{t.idFieldLabel}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-10 border-2 border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[300px] ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-500/20'
                  : 'border-slate-300 bg-white/80 hover:bg-slate-50/60 hover:border-blue-400'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 ring-8 ring-blue-50/40">
                <UploadCloud className="w-8 h-8 stroke-[1.75]" />
              </div>

              <h4 className="text-base font-bold text-slate-900">
                {isDragging ? 'Drop Spreadsheet File Here' : 'Select or Drag & Drop Spreadsheet File'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Supports Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Parses hundreds of records in milliseconds.
              </p>

              {parseError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 max-w-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing File...' : 'Browse Computer Files'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    disabled={isProcessing}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        processUploadedFile(e.target.files[0])
                      }
                    }}
                  />
                </label>
              </div>

              <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-detects columns
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Skips blank rows
                </span>
              </div>
            </Card>
          </div>

          {/* Sample Format & Specs Sidecard */}
          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Sample Template ({getCardTypeById(selectedCardType).label})
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Download a pre-formatted template with all headers ready for this card type.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  icon={Download}
                  onClick={() => handleDownloadSample('csv')}
                >
                  Download Sample CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  icon={Download}
                  onClick={() => handleDownloadSample('xlsx')}
                >
                  Download Sample XLSX
                </Button>
              </div>
            </Card>

            <Card className="p-5 bg-slate-50/70 border-slate-200 text-xs text-slate-600 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Validation Mode
              </h4>
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={lenientMode}
                  onChange={(e) => setLenientMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Lenient General-Purpose Mode</span>
                  <p className="text-[11px] text-slate-500">
                    No personal field is strictly mandatory. Auto-generates internal record IDs for rows without employee codes.
                  </p>
                </div>
              </label>
            </Card>
          </div>
        </div>
      )}

      {/* ================= STEP 2: COLUMN MAPPING ================= */}
      {step === 'mapping' && fileInfo && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">Match Column Headers</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {fileInfo.filename}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {getCardTypeById(selectedCardType).label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Found <strong>{fileInfo.totalRawCount}</strong> rows. Match your spreadsheet columns with our system fields below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={ArrowLeft} onClick={handleResetWorkflow}>
                Choose Different File
              </Button>
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" onClick={handleApplyMapping}>
                Apply & Validate Records
              </Button>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Primary Identification & Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REQUIRED_FIELDS.map((field) => (
                <div key={field.key} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {!lenientMode && <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      Standard
                    </span>
                  </div>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select File Column --</option>
                    {fileInfo.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400 pt-3">
              Personal, Academic & Contact Fields (Optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {OPTIONAL_FIELDS.map((field) => (
                <div key={field.key} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">{field.label}</label>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </div>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Do Not Map --</option>
                    {fileInfo.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ================= STEP 3: PREVIEW & LIVE EDIT ================= */}
      {step === 'preview' && (
        <Card className="p-5 sm:p-6 space-y-5">
          {/* Top Bar with Counts & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Import Verification Preview</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {fileInfo?.filename}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and inline-edit records before committing to the directory storage.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1 rounded transition-all ${
                    previewFilter === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${
                    previewFilter === 'valid'
                      ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid ({validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('invalid')}
                  className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${
                    previewFilter === 'invalid'
                      ? 'bg-white text-red-800 font-bold shadow-2xs'
                      : 'text-red-700 hover:text-red-900'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Invalid ({invalidCount})
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => setStep('mapping')}
              >
                Remap Columns
              </Button>
            </div>
          </div>

          {/* Detailed Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-500 text-[11px] font-medium">Total Rows Parsed</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{records.length}</p>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
              <p className="text-emerald-700 text-[11px] font-medium">Valid Ready to Save</p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">{validCount}</p>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
              <p className="text-amber-700 text-[11px] font-medium">Duplicate Collisions</p>
              <p className="text-lg font-bold text-amber-900 mt-0.5">{duplicateDetectedCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-500 text-[11px] font-medium">Skipped Empty Rows</p>
              <p className="text-lg font-bold text-slate-700 mt-0.5">{skippedEmptyRows}</p>
            </div>
          </div>

          {/* Duplicate Resolution Strategy Banner */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-slate-800">
                Duplicate Record Resolution Strategy:
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="dupStrategy"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Skip duplicates (Keep existing directory records safe)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="dupStrategy"
                  checked={duplicateStrategy === 'update'}
                  onChange={() => setDuplicateStrategy('update')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Update existing directory records</span>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-[480px] border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Display ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Unit / Dept</th>
                  <th className="py-2.5 px-3">Role / Desig</th>
                  <th className="py-2.5 px-3">Father's Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Aadhaar</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No records matching the "{previewFilter}" filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, index) => {
                    const originalIndex = records.findIndex((r) => r._id === rec._id)
                    const isEditing = editingRowIndex === originalIndex
                    const isValid = rec._validation?.isValid

                    return (
                      <tr
                        key={rec._id || index}
                        className={`transition-colors ${
                          !isValid
                            ? 'bg-red-50/40 hover:bg-red-50/70'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                              <p className="text-[10px] text-red-600 max-w-[140px] truncate" title={rec._validation?.errors?.join(', ')}>
                                {rec._validation?.errors?.[0]}
                              </p>
                            </div>
                          )}
                        </td>

                        {isEditing ? (
                          <>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.displayedId || editFormData.employeeId || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    displayedId: e.target.value,
                                    employeeId: e.target.value,
                                  }))
                                }
                                className="w-24 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.fullName || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, fullName: e.target.value }))
                                }
                                className="w-32 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.department || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, department: e.target.value }))
                                }
                                className="w-28 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.designation || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, designation: e.target.value }))
                                }
                                className="w-28 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.fatherName || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, fatherName: e.target.value }))
                                }
                                className="w-24 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.phone || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                className="w-24 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editFormData.aadhaarNumber || ''}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({ ...prev, aadhaarNumber: e.target.value }))
                                }
                                className="w-24 p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(originalIndex)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Save edit"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {rec.displayedId || rec.employeeId || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {rec.fullName || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{rec.department || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{rec.designation || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{rec.fatherName || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{rec.phone || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{rec.aadhaarNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(originalIndex)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit row"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(originalIndex)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Ready to import <strong>{validCount}</strong> valid records into persistent storage.
            </span>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetWorkflow}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                disabled={validCount === 0}
                onClick={handleConfirmImport}
              >
                Import {validCount} Valid Records
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ================= STEP 4: IMPORT SUMMARY ================= */}
      {step === 'complete' && importSummary && (
        <Card className="p-8 text-center max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-9 h-9 stroke-[2]" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Import Batch Completed!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your spreadsheet data has been successfully ingested into local storage.
            </p>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Successfully Ingested</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">
                {importSummary.importedCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Skipped Duplicates</p>
              <p className="text-xl font-bold text-slate-600 mt-0.5">
                {importSummary.skippedCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Invalid Excluded</p>
              <p className="text-xl font-bold text-red-500 mt-0.5">
                {importSummary.invalidCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={handleResetWorkflow}>
              Import Another File
            </Button>
            {onNavigateToEmployees && (
              <Button variant="primary" size="sm" onClick={onNavigateToEmployees}>
                View Credential Directory
              </Button>
            )}
            {onNavigateToDesigner && (
              <Button variant="outline" size="sm" onClick={onNavigateToDesigner}>
                Open Card Designer
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
