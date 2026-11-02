import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  FileDown,
  Printer,
  Grid,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sliders,
  Sparkles,
  Download,
  Eye,
  RefreshCw,
  Layers,
  Filter,
  CheckSquare,
  Square,
  Users,
} from 'lucide-react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { useEmployees } from '../../context/EmployeeContext'
import { CARD_TEMPLATES } from '../../utils/constants'
import { getSavedTemplateSettings } from '../../utils/templateStorage'
import { generateIdCardsPdf, A4_LAYOUTS } from '../../utils/pdfGenerator'
import { formatFileSize } from '../../utils/photoMatcher'

export const ExportPdfSection = ({ onNavigateToDesigner }) => {
  const { employees, photoUrls, activeOrganization } = useEmployees()
  const savedSettings = useMemo(() => getSavedTemplateSettings(), [])

  // Export parameters state
  const [layoutMode, setLayoutMode] = useState('a4-sheet') // 'a4-sheet' | 'single-cr80'
  const [orientation, setOrientation] = useState('portrait') // 'portrait' | 'landscape'
  const [cardSideMode, setCardSideMode] = useState('front-only') // 'front-only' | 'front-back'
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    activeOrganization?.defaultTemplateId || savedSettings.selectedTemplateId || 'corporate-blue'
  )
  const [includeCuttingMarks, setIncludeCuttingMarks] = useState(true)

  // Sync template with active organization
  useEffect(() => {
    if (activeOrganization?.defaultTemplateId) {
      setSelectedTemplateId(activeOrganization.defaultTemplateId)
    }
  }, [activeOrganization?.id])

  // Scope / Selection state
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() =>
    new Set(employees.map((e) => e.employeeId || e.id))
  )

  // Generation & Progress state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, text: '' })
  const [generatedPdf, setGeneratedPdf] = useState(null) // { url, filename, totalPages, fileSize, blob }

  const previewIframeRef = useRef(null)

  // Update selection if employees change
  useEffect(() => {
    setSelectedEmployeeIds(new Set(employees.map((e) => e.employeeId || e.id)))
  }, [employees])

  // Clean up previous blob URL when component unmounts or new PDF is created
  useEffect(() => {
    return () => {
      if (generatedPdf?.url) {
        URL.revokeObjectURL(generatedPdf.url)
      }
    }
  }, [generatedPdf])

  const departments = useMemo(() => {
    return ['all', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))]
  }, [employees])

  // Employees filtered by department
  const departmentFilteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) => selectedDepartment === 'all' || emp.department === selectedDepartment
    )
  }, [employees, selectedDepartment])

  // Final eligible employees based on checkboxes
  const eligibleEmployees = useMemo(() => {
    return departmentFilteredEmployees.filter((emp) =>
      selectedEmployeeIds.has(emp.employeeId || emp.id)
    )
  }, [departmentFilteredEmployees, selectedEmployeeIds])

  // Sheet calculation
  const sheetCalculation = useMemo(() => {
    const totalCount = eligibleEmployees.length
    const isDoubleSided = cardSideMode === 'front-back'

    if (layoutMode === 'a4-sheet') {
      const a4 = A4_LAYOUTS[orientation]
      const sheetsCount = Math.ceil(totalCount / a4.cardsPerSheet)
      const totalPages = isDoubleSided ? sheetsCount * 2 : sheetsCount
      return {
        cardsPerSheet: a4.cardsPerSheet,
        totalPages,
        description: `${sheetsCount} A4 sheet${sheetsCount !== 1 ? 's' : ''} (${a4.cardsPerSheet} cards/sheet${isDoubleSided ? ' • Front & Back Duplex' : ''})`,
      }
    } else {
      const totalPages = isDoubleSided ? totalCount * 2 : totalCount
      return {
        cardsPerSheet: 1,
        totalPages,
        description: `${totalPages} page${totalPages !== 1 ? 's' : ''} (${totalCount} individual CR80 card${totalCount !== 1 ? 's' : ''}${isDoubleSided ? ' • Front + Back' : ''})`,
      }
    }
  }, [eligibleEmployees.length, layoutMode, orientation, cardSideMode])

  // Toggle single employee selection
  const handleToggleEmployee = (id) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all in current department
  const handleSelectAllInDept = () => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      departmentFilteredEmployees.forEach((e) => next.add(e.employeeId || e.id))
      return next
    })
  }

  // Deselect all in current department
  const handleDeselectAllInDept = () => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      departmentFilteredEmployees.forEach((e) => next.delete(e.employeeId || e.id))
      return next
    })
  }

  // Execute full PDF batch generation
  const handleGeneratePdf = async () => {
    if (eligibleEmployees.length === 0) return

    setIsGenerating(true)
    setProgress({ current: 0, total: eligibleEmployees.length, text: 'Initializing 300 DPI engine...' })

    try {
      const result = await generateIdCardsPdf(
        eligibleEmployees,
        {
          template: selectedTemplateId,
          orientation,
          layout: layoutMode,
          includeBackSide: cardSideMode === 'front-back',
          includeCuttingMarks,
          photoUrls,
          settings: { ...savedSettings, ...activeOrganization },
          dpi: 300,
        },
        (current, total, text) => {
          setProgress({ current, total, text })
        }
      )

      // Revoke old URL if exists
      if (generatedPdf?.url) {
        URL.revokeObjectURL(generatedPdf.url)
      }

      const fileUrl = URL.createObjectURL(result.blob)
      setGeneratedPdf({
        url: fileUrl,
        filename: result.filename,
        totalPages: result.totalPages,
        fileSize: result.fileSize,
        blob: result.blob,
      })

      // Trigger direct download
      const downloadLink = document.createElement('a')
      downloadLink.href = fileUrl
      downloadLink.download = result.filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert(`PDF Generation Error: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Single card export for an individual employee
  const handleExportSingleCard = async (emp) => {
    try {
      const result = await generateIdCardsPdf(
        [emp],
        {
          template: selectedTemplateId,
          orientation,
          layout: 'single-cr80',
          includeBackSide: cardSideMode === 'front-back',
          includeCuttingMarks: false,
          photoUrls,
          settings: { ...savedSettings, ...activeOrganization },
          dpi: 300,
        }
      )

      const fileUrl = URL.createObjectURL(result.blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = fileUrl
      downloadLink.download = result.filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(fileUrl), 5000)
    } catch (err) {
      alert(`Single Card Export Error: ${err.message}`)
    }
  }

  const activeTemplate =
    CARD_TEMPLATES.find((t) => t.id === selectedTemplateId) || CARD_TEMPLATES[0]

  const progressPercentage =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Production-Ready Bulk PDF Generator
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              300 DPI Vector-Ready
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Generate calibrated A4 print sheets or individual CR80 plastic card PDFs with verified optical barcodes and QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToDesigner && (
            <Button
              variant="outline"
              size="sm"
              icon={Sliders}
              onClick={onNavigateToDesigner}
            >
              Card Designer
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Controls (5 cols) | Right Preview & Summary (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Layout & Scope Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Layout Mode & Page Configuration */}
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-600" />
              1. Print Layout Format
            </h4>

            {/* Layout Mode (A4 vs Single CR80) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLayoutMode('a4-sheet')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  layoutMode === 'a4-sheet'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Grid className="w-3.5 h-3.5 text-blue-600" />
                  <span>A4 Print Sheet</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  8-9 cards per page with cutting guides.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('single-cr80')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  layoutMode === 'single-cr80'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>CR80 Single</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Exact card size for direct PVC card printers.
                </p>
              </button>
            </div>

            {/* Orientation (Portrait vs Landscape) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Card Orientation
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                    orientation === 'portrait'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Portrait (53.98 × 85.6 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                    orientation === 'landscape'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Landscape (85.6 × 53.98 mm)
                </button>
              </div>
            </div>

            {/* Card Sides (Front Only vs Front & Back) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Card Sides Export
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCardSideMode('front-only')}
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                    cardSideMode === 'front-only'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Front Side Only
                </button>
                <button
                  type="button"
                  onClick={() => setCardSideMode('front-back')}
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                    cardSideMode === 'front-back'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Front & Back (Duplex)
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Design Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {CARD_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Cutting marks toggle (for A4) */}
            {layoutMode === 'a4-sheet' && (
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Corner Cutting Marks</p>
                  <p className="text-[10px] text-slate-500">Fine 0.2mm crop lines for guillotine cutters</p>
                </div>
                <input
                  type="checkbox"
                  checked={includeCuttingMarks}
                  onChange={(e) => setIncludeCuttingMarks(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
            )}
          </Card>

          {/* 2. Employee Scope & Selection List */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                2. Employee Selection ({eligibleEmployees.length}/{employees.length})
              </h4>

              {/* Department selector */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-slate-700 font-medium"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'all' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                <strong>{eligibleEmployees.length}</strong> selected for export
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllInDept}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllInDept}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  Deselect
                </button>
              </div>
            </div>

            {/* Scrollable Checkbox List */}
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {departmentFilteredEmployees.map((emp) => {
                const empId = emp.employeeId || emp.id
                const isSelected = selectedEmployeeIds.has(empId)
                const hasPhoto = Boolean(photoUrls[empId]?.url || emp.avatarUrl)

                return (
                  <div
                    key={empId}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleEmployee(empId)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{emp.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {empId} • {emp.department} {hasPhoto ? '• [Photo ✓]' : ''}
                        </p>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleExportSingleCard(emp)}
                      className="p-1 text-slate-400 hover:text-blue-600 text-[10px] font-medium shrink-0 flex items-center gap-0.5"
                      title="Direct single card export"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Sheet Preview & Batch Action (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 bg-slate-50/80 border border-slate-200">
            {/* Top Sheet Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    PDF Document Specifications
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target print quality: <strong>300 DPI High-Density Rasterization</strong>
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {layoutMode === 'a4-sheet' ? 'A4 Paper' : 'CR80 Single'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  {orientation.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Selected Cards</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{eligibleEmployees.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Pages</p>
                <p className="text-lg font-bold text-blue-600 mt-0.5">{sheetCalculation.totalPages}</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Sides</p>
                <p className="text-xs font-bold text-slate-800 mt-1">
                  {cardSideMode === 'front-back' ? 'Front & Back' : 'Front Only'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Resolution</p>
                <p className="text-xs font-bold text-emerald-600 mt-1">300 DPI</p>
              </div>
            </div>

            {/* Visual Simulated Sheet Layout Preview */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-5 max-w-sm mx-auto aspect-[1/1.414] relative flex flex-col justify-between">
              {/* Corner Cutting Crop Marks Indicator */}
              {includeCuttingMarks && layoutMode === 'a4-sheet' && (
                <>
                  <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-slate-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-slate-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-slate-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-slate-400" />
                </>
              )}

              {layoutMode === 'a4-sheet' ? (
                /* Grid preview */
                <div
                  className={`grid gap-2 flex-1 p-2 ${
                    orientation === 'portrait' ? 'grid-cols-3 grid-rows-3' : 'grid-cols-2 grid-rows-4'
                  }`}
                >
                  {[...Array(orientation === 'portrait' ? 9 : 8)].map((_, i) => (
                    <div
                      key={i}
                      className="border border-dashed border-slate-300 rounded p-1 flex flex-col justify-between bg-slate-50/70 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                        <div className="w-8 h-1 bg-slate-300 rounded" />
                      </div>
                      <div className="w-full flex items-center justify-between">
                        <div className="w-6 h-1 bg-slate-200 rounded" />
                        <div className="w-2 h-2 bg-slate-300 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single CR80 preview */
                <div className="flex-1 flex items-center justify-center p-6">
                  <div
                    className={`rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/30 flex flex-col items-center justify-center p-4 text-center ${
                      orientation === 'portrait' ? 'w-36 h-56' : 'w-56 h-36'
                    }`}
                  >
                    <CreditCard className="w-8 h-8 text-blue-600 mb-1" />
                    <p className="text-xs font-bold text-slate-800">CR80 Plastic Card</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {orientation === 'portrait' ? '53.98 × 85.6 mm' : '85.6 × 53.98 mm'}
                    </p>
                  </div>
                </div>
              )}

              {/* Sheet Bottom Footer */}
              <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>NOVATECH SOLUTIONS • PDF Export Engine</span>
                <span className="font-mono">CR80 300 DPI</span>
              </div>
            </div>

            {/* Progress Bar (During Generation) */}
            {isGenerating && (
              <div className="mt-5 p-4 rounded-xl bg-white border border-blue-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-700 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating PDF ({progressPercentage}%)
                  </span>
                  <span className="text-slate-500 font-mono">
                    {progress.current} / {progress.total}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 truncate">{progress.text}</p>
              </div>
            )}

            {/* Download Completion Banner */}
            {generatedPdf && !isGenerating && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">{generatedPdf.filename}</p>
                    <p className="text-[11px] text-emerald-700">
                      {generatedPdf.totalPages} Pages • {formatFileSize(generatedPdf.fileSize)}
                    </p>
                  </div>
                </div>

                <a
                  href={generatedPdf.url}
                  download={generatedPdf.filename}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </a>
              </div>
            )}

            {/* Main Action Button */}
            <div className="mt-5">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-sm"
                disabled={isGenerating || eligibleEmployees.length === 0}
                icon={FileDown}
                onClick={handleGeneratePdf}
              >
                {isGenerating
                  ? `Rendering ${progress.current} of ${progress.total}...`
                  : `Generate & Download PDF (${eligibleEmployees.length} Cards • ${sheetCalculation.description})`}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
