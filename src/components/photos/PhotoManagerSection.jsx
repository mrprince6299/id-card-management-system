import React, { useState, useRef, useMemo } from 'react'
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  RefreshCw,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  FileCheck,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { useEmployees } from '../../context/EmployeeContext'
import {
  matchPhotosBatch,
  formatFileSize,
  isSupportedPhotoFormat,
  SUPPORTED_EXTENSIONS,
} from '../../utils/photoMatcher'

export const PhotoManagerSection = ({ onNavigateToEmployees, onNavigateToDesigner }) => {
  const { employees, photoUrls, assignPhoto, batchAssignPhotos, removePhoto } = useEmployees()

  // Uploaded files state: Array of { id, file, filename, size, previewUrl }
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'matched' | 'unmatched' | 'ambiguous' | 'missing'
  const [searchQuery, setSearchQuery] = useState('')

  // Manual matching modal state
  const [manualMatchTarget, setManualMatchTarget] = useState(null) // photo object being manually matched
  const [selectedEmployeeIdForManual, setSelectedEmployeeIdForManual] = useState('')

  // Confirmation dialog state (for replacing or deleting)
  const [confirmDialog, setConfirmDialog] = useState(null) // { title, message, onConfirm }

  // Batch commit state
  const [isSavingBatch, setIsSavingBatch] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null)

  const fileInputRef = useRef(null)

  // Compute live matching results whenever uploadedFiles or employees change
  const matchResults = useMemo(() => {
    return matchPhotosBatch(
      uploadedFiles.map((u) => u.file),
      employees,
      photoUrls
    )
  }, [uploadedFiles, employees, photoUrls])

  // Process uploaded File objects
  const handleAddFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return

    const newItems = []
    const existingFilenames = new Set(uploadedFiles.map((f) => f.filename.toLowerCase()))

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]
      const lowerName = file.name.toLowerCase()

      // Avoid exact duplicate file objects in the same session
      if (existingFilenames.has(lowerName)) {
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      newItems.push({
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        filename: file.name,
        size: file.size,
        previewUrl,
      })
    }

    setUploadedFiles((prev) => [...prev, ...newItems])
    setSaveSuccessMessage(null)
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
    if (e.dataTransfer?.files?.length > 0) {
      handleAddFiles(e.dataTransfer.files)
    }
  }

  // Remove a single uploaded photo from staging
  const handleRemoveUploadedFile = (filename) => {
    setUploadedFiles((prev) => {
      const target = prev.find((f) => f.filename === filename)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((f) => f.filename !== filename)
    })
  }

  // Clear all uploaded files from staging
  const handleClearAllStaged = () => {
    uploadedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setUploadedFiles([])
    setSaveSuccessMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Commit all clean matched photos to IndexedDB
  const handleCommitAllMatched = async () => {
    if (matchResults.matched.length === 0) return

    setIsSavingBatch(true)
    try {
      const count = await batchAssignPhotos(matchResults.matched)
      setSaveSuccessMessage(
        `Successfully saved ${count} employee photos to IndexedDB persistent storage!`
      )
    } catch (err) {
      console.error('Error committing photos:', err)
      alert(`Error saving photos to IndexedDB: ${err.message}`)
    } finally {
      setIsSavingBatch(false)
    }
  }

  // Execute manual assignment
  const handleExecuteManualMatch = async () => {
    if (!manualMatchTarget || !selectedEmployeeIdForManual) return

    const targetEmp = employees.find((e) => (e.employeeId || e.id) === selectedEmployeeIdForManual)
    const empId = targetEmp?.employeeId || targetEmp?.id
    const hasExisting = Boolean(photoUrls[empId])

    const applyAssignment = async () => {
      await assignPhoto(empId, manualMatchTarget.file, manualMatchTarget.filename)
      setManualMatchTarget(null)
      setSelectedEmployeeIdForManual('')
      setSaveSuccessMessage(`Assigned photo "${manualMatchTarget.filename}" to ${targetEmp.fullName} (${empId}).`)
    }

    if (hasExisting) {
      setConfirmDialog({
        title: 'Replace Existing Photo?',
        message: `${targetEmp.fullName} (${empId}) already has an assigned photo. Do you wish to overwrite it with "${manualMatchTarget.filename}"?`,
        onConfirm: async () => {
          await applyAssignment()
          setConfirmDialog(null)
        },
      })
    } else {
      await applyAssignment()
    }
  }

  // Generator: create 15 fictional SVG/PNG employee photo blobs for instant browser testing
  const handleGenerateSamplePhotos = () => {
    const sampleSpecs = [
      { id: 'EMP-1001', name: 'Sarah Jenkins', color: '#2563eb' },
      { id: 'EMP-1002', name: 'Marcus Vance', color: '#4f46e5' },
      { id: 'EMP-1003', name: 'Elena Rostova', color: '#059669' },
      { id: 'EMP-1004', name: 'Devon Miles', color: '#d97706' },
      { id: 'EMP-1005', name: 'Amina Khoury', color: '#dc2626' },
      { id: 'EMP-1006', name: 'Liam Chen', color: '#7c3aed' },
      { id: 'EMP-1007', name: 'Priya Sharma', color: '#db2777' },
      { id: 'EMP-2001', name: 'Lucas Bennett', color: '#0891b2' },
      { id: 'EMP-2002', name: 'Chloe Morrison', color: '#0d9488' },
      { id: 'EMP-2003', name: 'Alexander Wright', color: '#2563eb' },
      { id: 'EMP-2004', name: 'Zoe Kowalski', color: '#ea580c' },
      { id: 'EMP-2005', name: 'Gabriel Santos', color: '#4b5563' },
      { id: 'EMP-3001', name: 'Julian Casablancas', color: '#16a34a' },
      { id: 'EMP-3002', name: 'Fabrizio Moretti', color: '#9333ea' },
      { id: 'UNMATCHED-99', name: 'Unknown Contractor', color: '#64748b' }, // Intentional unmatched test
    ]

    const generatedFiles = []

    for (const spec of sampleSpecs) {
      // Create SVG representation
      const initials = spec.name.split(' ').map((n) => n[0]).join('')
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
          <rect width="300" height="300" fill="${spec.color}"/>
          <circle cx="150" cy="115" r="55" fill="white" fill-opacity="0.9"/>
          <path d="M70 260 C70 190, 230 190, 230 260 Z" fill="white" fill-opacity="0.9"/>
          <text x="150" y="125" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="${spec.color}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
          <text x="150" y="280" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${spec.id}</text>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const filename = `${spec.id}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })

      generatedFiles.push(file)
    }

    handleAddFiles(generatedFiles)
  }

  // Pre-index preview items for fast display
  const filePreviewMap = useMemo(() => {
    const map = new Map()
    uploadedFiles.forEach((u) => {
      map.set(u.filename, u.previewUrl)
    })
    return map
  }, [uploadedFiles])

  // Filtered lists for display
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase()

    if (activeFilter === 'missing') {
      return matchResults.missingEmployees
        .filter((emp) => {
          return (
            (emp.fullName || '').toLowerCase().includes(q) ||
            (emp.employeeId || emp.id || '').toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q)
          )
        })
        .map((emp) => ({ type: 'missing', employee: emp }))
    }

    let combined = []

    if (activeFilter === 'all' || activeFilter === 'matched') {
      combined = [...combined, ...matchResults.matched.map((m) => ({ type: 'matched', data: m }))]
    }
    if (activeFilter === 'all' || activeFilter === 'unmatched') {
      combined = [...combined, ...matchResults.unmatched.map((u) => ({ type: 'unmatched', data: u }))]
    }
    if (activeFilter === 'all' || activeFilter === 'ambiguous') {
      combined = [...combined, ...matchResults.ambiguous.map((a) => ({ type: 'ambiguous', data: a }))]
    }

    if (q) {
      combined = combined.filter((item) => {
        const fn = item.data?.filename || ''
        const empName = item.data?.employee?.fullName || ''
        const empId = item.data?.employeeId || item.data?.candidateId || ''
        return (
          fn.toLowerCase().includes(q) ||
          empName.toLowerCase().includes(q) ||
          empId.toLowerCase().includes(q)
        )
      })
    }

    return combined
  }, [matchResults, activeFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Bulk Employee Photo Manager
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              IndexedDB Storage
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Upload 100+ photos and automatically match them against Employee IDs (e.g. EMP001.jpg, EMP001_profile.png).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={handleGenerateSamplePhotos}
            title="Generate 15 fictional employee photo files for instant browser testing"
          >
            Load 15 Test Photos
          </Button>
          {onNavigateToDesigner && (
            <Button
              variant="secondary"
              size="sm"
              icon={Layers}
              onClick={onNavigateToDesigner}
            >
              Card Designer
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Uploaded */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{matchResults.stats.totalUploaded}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Staged photos</p>
        </div>

        {/* Matched */}
        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Matched</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{matchResults.stats.matchedCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Matched to ID</p>
        </div>

        {/* Unmatched */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unmatched</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{matchResults.stats.unmatchedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">No ID matched</p>
        </div>

        {/* Ambiguous / Duplicates */}
        <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Ambiguous</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{matchResults.stats.ambiguousCount}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Multiple matches</p>
        </div>

        {/* Missing Photos in Directory */}
        <div className="p-4 rounded-xl bg-white border border-blue-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Missing</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{matchResults.stats.missingCount}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">Employees without photo</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Photo Upload Zone */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-8 border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70 ring-4 ring-blue-500/20'
            : 'border-slate-300 bg-white hover:bg-slate-50/60 hover:border-blue-400'
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 ring-8 ring-blue-50/40">
          <UploadCloud className="w-7 h-7 stroke-[1.75]" />
        </div>

        <h4 className="text-base font-bold text-slate-900">
          {isDragging ? 'Drop Image Files Now' : 'Drag & Drop Multiple Employee Photos Here'}
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          Supported: <strong>JPG, JPEG, PNG, WEBP</strong>. Files are stored in browser <strong>IndexedDB</strong> blobs (never in localStorage strings).
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors">
            <ImageIcon className="w-4 h-4" />
            <span>Select Multiple Photos</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length > 0) {
                  handleAddFiles(e.target.files)
                }
              }}
            />
          </label>

          {uploadedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              onClick={handleClearAllStaged}
            >
              Clear Staged ({uploadedFiles.length})
            </Button>
          )}
        </div>
      </Card>

      {/* Action Toolbar & Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Uploads ({matchResults.stats.totalUploaded})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('matched')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeFilter === 'matched'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matched ({matchResults.stats.matchedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unmatched')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeFilter === 'unmatched'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Unmatched ({matchResults.stats.unmatchedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('missing')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeFilter === 'missing'
                  ? 'bg-white text-blue-800 font-bold shadow-2xs'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Missing Photos ({matchResults.stats.missingCount})</span>
            </button>
          </div>

          {/* Quick Search & Commit Action */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photo or ID..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {matchResults.matched.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                disabled={isSavingBatch}
                onClick={handleCommitAllMatched}
              >
                {isSavingBatch
                  ? 'Saving to IndexedDB...'
                  : `Save ${matchResults.matched.length} Matched to Storage`}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Grid of Photo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            {uploadedFiles.length === 0
              ? 'No photos uploaded yet. Drop image files or click "Load 15 Test Photos" above to begin.'
              : `No items found matching the "${activeFilter}" filter.`}
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            // Case 1: Missing Photo Record (Employee without photo)
            if (item.type === 'missing') {
              const emp = item.employee
              const empId = emp.employeeId || emp.id
              return (
                <Card key={`missing-${empId}`} className="p-4 border-dashed border-slate-300 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 font-bold text-lg border border-slate-300">
                      {emp.fullName?.split(' ').map((n) => n[0]).join('') || 'ID'}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-900">{emp.fullName}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">{empId}</p>
                      <p className="text-[10px] text-slate-400">{emp.department}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/70 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <UserX className="w-3 h-3" /> No Photo Assigned
                    </span>
                  </div>
                </Card>
              )
            }

            // Case 2: Uploaded Photo Items (Matched, Unmatched, or Ambiguous)
            const record = item.data
            const previewUrl = filePreviewMap.get(record.filename) || record.previewUrl

            return (
              <Card
                key={record.id || idx}
                className={`p-4 flex flex-col justify-between transition-all ${
                  item.type === 'matched'
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : item.type === 'ambiguous'
                    ? 'border-amber-300 bg-amber-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Photo Preview Thumbnail */}
                  <div className="relative w-full aspect-square rounded-lg bg-slate-100 overflow-hidden mb-3 border border-slate-200/80">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={record.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}

                    {/* Status badge pinned to thumbnail */}
                    <div className="absolute top-2 right-2">
                      {item.type === 'matched' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Matched
                        </span>
                      )}
                      {item.type === 'unmatched' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-white shadow-xs">
                          Unmatched
                        </span>
                      )}
                      {item.type === 'ambiguous' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                          Ambiguous
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Filename & Size info */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={record.filename}>
                      {record.filename}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(record.size)}
                    </p>
                  </div>

                  {/* Matched Details */}
                  {item.type === 'matched' && record.employee && (
                    <div className="mt-2.5 p-2 rounded bg-emerald-50/60 border border-emerald-100 text-[11px] space-y-0.5">
                      <p className="font-semibold text-emerald-900 truncate">
                        {record.employee.fullName}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono">
                        ID: {record.employeeId}
                      </p>
                    </div>
                  )}

                  {/* Ambiguous Warning */}
                  {item.type === 'ambiguous' && (
                    <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                      {record.warning}
                    </div>
                  )}
                </div>

                {/* Bottom Row Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {item.type === 'unmatched' || item.type === 'ambiguous' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs w-full"
                      onClick={() => {
                        setManualMatchTarget(record)
                        setSelectedEmployeeIdForManual('')
                      }}
                    >
                      Assign Manually...
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" /> Ready to Save
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedFile(record.filename)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Manual Assignment Modal Dialog */}
      {manualMatchTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Manually Assign Photo</h3>
              <button
                type="button"
                onClick={() => setManualMatchTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-12 h-12 rounded bg-slate-200 overflow-hidden shrink-0">
                <img
                  src={filePreviewMap.get(manualMatchTarget.filename)}
                  alt={manualMatchTarget.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {manualMatchTarget.filename}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formatFileSize(manualMatchTarget.size)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Employee to Assign:
              </label>
              <select
                value={selectedEmployeeIdForManual}
                onChange={(e) => setSelectedEmployeeIdForManual(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose an Employee Record --</option>
                {employees.map((emp) => {
                  const id = emp.employeeId || emp.id
                  const hasPhoto = Boolean(photoUrls[id])
                  return (
                    <option key={id} value={id}>
                      {emp.fullName} ({id}) — {emp.department} {hasPhoto ? '• [Has Photo]' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualMatchTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!selectedEmployeeIdForManual}
                icon={Check}
                onClick={handleExecuteManualMatch}
              >
                Confirm Assignment
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal (for Overwrite / Replace) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDialog.onConfirm}
              >
                Confirm Replace
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

