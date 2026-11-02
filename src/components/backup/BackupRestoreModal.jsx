import React, { useState, useEffect } from 'react'
import {
  DownloadCloud,
  UploadCloud,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Database,
  RotateCcw,
  Clock,
} from 'lucide-react'
import { useEmployees } from '../../context/EmployeeContext'
import {
  LAST_BACKUP_METADATA_KEY,
  RECOVERY_SNAPSHOT_KEY,
  BACKUP_SCHEMA_VERSION,
} from '../../utils/backupSystem'

export const BackupRestoreModal = ({ isOpen, onClose }) => {
  const {
    allEmployees,
    organizations,
    createPlatformBackup,
    executeStagedRestore,
    analyzeRestorePlan,
    validateBackupStructure,
    rollbackFromRecoverySnapshot,
  } = useEmployees()

  // Tabs: 'export' | 'restore' | 'recovery'
  const [activeTab, setActiveTab] = useState('export')

  // Export State
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState('')
  const [lastBackupMeta, setLastBackupMeta] = useState(null)

  // Restore State
  const [restoreFile, setRestoreFile] = useState(null)
  const [parsedBackup, setParsedBackup] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [restoreMode, setRestoreMode] = useState('merge') // 'merge' | 'replace'
  const [conflictResolution, setConflictResolution] = useState('incoming') // 'incoming' | 'preserve'
  const [restorePlan, setRestorePlan] = useState(null)
  const [replaceConfirmInput, setReplaceConfirmInput] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('')
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('')

  // Recovery Snapshot State
  const [snapshotInfo, setSnapshotInfo] = useState(null)
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState('')

  // Load last backup meta & snapshot info on mount / open
  useEffect(() => {
    if (!isOpen) return
    try {
      const rawMeta = localStorage.getItem(LAST_BACKUP_METADATA_KEY)
      if (rawMeta) setLastBackupMeta(JSON.parse(rawMeta))

      const rawSnapshot = localStorage.getItem(RECOVERY_SNAPSHOT_KEY)
      if (rawSnapshot) {
        const snap = JSON.parse(rawSnapshot)
        setSnapshotInfo({
          timestamp: snap.timestamp,
          recordsCount: snap.records?.length || 0,
          orgsCount: snap.organizations?.length || 0,
        })
      }
    } catch (_) {}
  }, [isOpen])

  if (!isOpen) return null

  // Handle Export Download
  const handleDownloadBackup = async () => {
    setIsExporting(true)
    setExportSuccess('')
    try {
      const backup = await createPlatformBackup()
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute(
        'download',
        `idcard-platform-backup-${new Date().toISOString().split('T')[0]}.json`
      )
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()

      setExportSuccess(
        `Successfully exported ${backup.counts.records} records, ${backup.counts.organizations} organizations, and ${backup.counts.photos} photos.`
      )
      setLastBackupMeta({
        lastBackupDate: backup.exportedAt,
        recordsCount: backup.counts.records,
        organizationsCount: backup.counts.organizations,
        photosCount: backup.counts.photos,
        checksum: backup.integrity?.checksum,
      })
    } catch (err) {
      alert(`Backup creation failed: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle File Selection
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreFile(file)
    setValidationError('')
    setRestorePlan(null)
    setRestoreSuccessMsg('')
    setRestoreErrorMsg('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        const validation = validateBackupStructure(parsed)

        if (!validation.isValid) {
          setValidationError(validation.error)
          setParsedBackup(null)
          return
        }

        setParsedBackup(validation.data)

        // Compute pre-restore preview plan
        const plan = analyzeRestorePlan({
          incomingData: validation.data,
          currentRecords: allEmployees,
          currentOrganizations: organizations,
          mode: restoreMode,
        })
        setRestorePlan(plan)
      } catch (err) {
        setValidationError(`Failed to parse JSON file: ${err.message}`)
        setParsedBackup(null)
      }
    }
    reader.readAsText(file)
  }

  // Handle Mode Change
  const handleModeChange = (mode) => {
    setRestoreMode(mode)
    if (parsedBackup) {
      const plan = analyzeRestorePlan({
        incomingData: parsedBackup,
        currentRecords: allEmployees,
        currentOrganizations: organizations,
        mode,
      })
      setRestorePlan(plan)
    }
  }

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return
    setIsRestoring(true)
    setRestoreErrorMsg('')
    setRestoreSuccessMsg('')

    try {
      const result = await executeStagedRestore({
        backupData: parsedBackup,
        mode: restoreMode,
        conflictResolution,
      })

      setRestoreSuccessMsg(
        `Restoration successful (${result.mode.toUpperCase()})! Restored ${result.recordsCount} records, ${result.organizationsCount} organizations, and ${result.photosCount} photos.`
      )

      // Refresh snapshot info
      const rawSnapshot = localStorage.getItem(RECOVERY_SNAPSHOT_KEY)
      if (rawSnapshot) {
        const snap = JSON.parse(rawSnapshot)
        setSnapshotInfo({
          timestamp: snap.timestamp,
          recordsCount: snap.records?.length || 0,
          orgsCount: snap.organizations?.length || 0,
        })
      }

      setRestoreFile(null)
      setParsedBackup(null)
      setRestorePlan(null)
      setReplaceConfirmInput('')
    } catch (err) {
      setRestoreErrorMsg(err.message)
    } finally {
      setIsRestoring(false)
    }
  }

  // Handle Rollback
  const handleRollback = async () => {
    try {
      const result = await rollbackFromRecoverySnapshot()
      setRollbackSuccessMsg(`Database reverted to recovery snapshot from ${new Date(result.timestamp).toLocaleString()}.`)
      setTimeout(() => setRollbackSuccessMsg(''), 6000)
    } catch (err) {
      alert(`Rollback failed: ${err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Backup & Disaster Recovery</h2>
              <p className="text-xs text-slate-500">
                Multi-tenant export, staged restoration, collision prevention, and automatic rollback snapshots
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

        {/* System Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium block">Total Organizations</span>
            <span className="text-sm font-bold text-slate-800">{organizations.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">
              ({organizations.filter((o) => !o.isArchived).length} active)
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium block">Master Records</span>
            <span className="text-sm font-bold text-slate-800">{allEmployees.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">across all tenants</span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium block">IndexedDB Photos</span>
            <span className="text-sm font-bold text-slate-800">
              {allEmployees.filter((e) => e.hasPhoto).length}
            </span>
            <span className="text-[10px] text-emerald-600 ml-1 font-semibold">Namespaced</span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium block">Last Backup</span>
            <span className="text-xs font-bold text-slate-800 truncate block">
              {lastBackupMeta?.lastBackupDate
                ? new Date(lastBackupMeta.lastBackupDate).toLocaleDateString()
                : 'Never exported'}
            </span>
            {lastBackupMeta?.checksum && (
              <span className="text-[9px] font-mono text-blue-600 block truncate">
                {lastBackupMeta.checksum}
              </span>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 px-6 bg-white border-b border-slate-200 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'restore'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Restore Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recovery')}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'recovery'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Safety Snapshot & Rollback</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: EXPORT BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-800">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Full Multi-Tenant Portable Backup</span>
                </div>
                <p>
                  Generates an all-inclusive archive containing every active and archived organization, all employee and
                  member records across all tenants, binary ID photos from IndexedDB (Base64-encoded), custom fields,
                  branding assets, and template settings.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-semibold text-[11px] text-blue-700">
                  <span className="px-2 py-0.5 bg-white rounded border border-blue-200">
                    Schema: v{BACKUP_SCHEMA_VERSION}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-blue-200">
                    Self-Contained JSON
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-blue-200">
                    Deterministic Integrity Checksum
                  </span>
                </div>
              </div>

              {exportSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Download Backup Archive</h4>
                  <p className="text-[11px] text-slate-500">
                    Exported JSON file can be restored anytime on any device running this portal.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0 disabled:bg-blue-300"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>{isExporting ? 'Compiling Archive...' : 'Download Backup (.json)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-5">
              {restoreSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{restoreSuccessMsg}</span>
                </div>
              )}

              {restoreErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{restoreErrorMsg}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              {!parsedBackup && (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 rounded-2xl p-6 text-center transition-colors">
                  <FileJson className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-800">Select Backup Archive JSON</h3>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                    Upload an exported backup file (compatible with schema versions v1.0, v2.0, and v2.1).
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-2xs transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Browse JSON File</span>
                    <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {validationError && (
                    <p className="text-xs text-rose-600 font-medium mt-3 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {validationError}
                    </p>
                  )}
                </div>
              )}

              {/* Parsed File Details & Staged Restore Controls */}
              {parsedBackup && (
                <div className="space-y-4">
                  {/* File Meta Header */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileJson className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800">{restoreFile?.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>Exported: {new Date(parsedBackup.exportedAt || Date.now()).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-semibold text-blue-600">
                            Schema: v{parsedBackup.schemaVersion || '1.0'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedBackup(null)
                        setRestorePlan(null)
                        setRestoreFile(null)
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      data-testid="mode-merge-card"
                      onClick={() => handleModeChange('merge')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        restoreMode === 'merge'
                          ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">Mode A: Merge & Update</span>
                        {restoreMode === 'merge' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Adds new records. Updates matching records using internal record IDs. Existing unrelated records
                        remain completely intact.
                      </p>
                    </div>

                    <div
                      data-testid="mode-replace-card"
                      onClick={() => handleModeChange('replace')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        restoreMode === 'replace'
                          ? 'border-rose-600 bg-rose-50/30 ring-1 ring-rose-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">Mode B: Replace All</span>
                        {restoreMode === 'replace' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Overwrites current database with incoming backup. Automatically creates a pre-restore recovery
                        snapshot before replacing.
                      </p>
                    </div>
                  </div>

                  {/* Mode A: Conflict Resolution Settings */}
                  {restoreMode === 'merge' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Conflict Resolution Strategy:</span>
                        <div className="flex gap-2">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="conflictStrategy"
                              value="incoming"
                              checked={conflictResolution === 'incoming'}
                              onChange={() => setConflictResolution('incoming')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>Incoming Overwrite</span>
                          </label>
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="conflictStrategy"
                              value="preserve"
                              checked={conflictResolution === 'preserve'}
                              onChange={() => setConflictResolution('preserve')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>Preserve Existing</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pre-Restore Preview Report */}
                  {restorePlan && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                        Restore Impact Preview ({restoreMode.toUpperCase()})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">New Records</span>
                          <span className="text-xs font-bold text-emerald-600">+{restorePlan.newRecordsCount}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Matching Records</span>
                          <span className="text-xs font-bold text-blue-600">{restorePlan.matchingRecordsCount}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Field Conflicts</span>
                          <span className="text-xs font-bold text-amber-600">{restorePlan.conflictsCount}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Unaffected Records</span>
                          <span className="text-xs font-bold text-slate-700">{restorePlan.unaffectedRecordsCount}</span>
                        </div>
                      </div>

                      {restorePlan.conflictsCount > 0 && restoreMode === 'merge' && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                          <span>
                            Detected {restorePlan.conflictsCount} matching record(s) with differing attributes. They will be
                            resolved using:{' '}
                            <strong>{conflictResolution === 'incoming' ? 'Incoming Overwrite' : 'Preserve Existing'}</strong>.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode B: Safety Confirmation */}
                  {restoreMode === 'replace' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Destructive Action Confirmation Required</span>
                      </div>
                      <p>
                        Current application records and photos will be replaced with this backup archive. A safety snapshot
                        will be saved prior to execution.
                      </p>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Type <span className="font-mono text-rose-600">"REPLACE"</span> to confirm:
                        </label>
                        <input
                          type="text"
                          value={replaceConfirmInput}
                          onChange={(e) => setReplaceConfirmInput(e.target.value)}
                          placeholder="REPLACE"
                          className="w-40 px-2.5 py-1.5 text-xs font-mono border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                        />
                      </div>
                    </div>
                  )}

                  {/* Execute Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isRestoring || (restoreMode === 'replace' && replaceConfirmInput.trim() !== 'REPLACE')}
                      onClick={handleExecuteRestore}
                      className={`px-5 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-colors ${
                        restoreMode === 'replace'
                          ? replaceConfirmInput.trim() === 'REPLACE' && !isRestoring
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : isRestoring
                          ? 'bg-blue-300 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isRestoring
                        ? 'Executing Staged Restore...'
                        : restoreMode === 'replace'
                        ? 'Execute Replace All'
                        : 'Execute Merge & Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAFETY SNAPSHOT & RECOVERY */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              {rollbackSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{rollbackSuccessMsg}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Pre-Restore Recovery Snapshot</span>
                </div>

                {snapshotInfo ? (
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      A safety snapshot was captured before the last restore operation at:{' '}
                      <strong>{new Date(snapshotInfo.timestamp).toLocaleString()}</strong>
                    </p>
                    <div className="flex gap-4 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <div>
                        Snapshot Records: <strong>{snapshotInfo.recordsCount}</strong>
                      </div>
                      <div>•</div>
                      <div>
                        Snapshot Organizations: <strong>{snapshotInfo.orgsCount}</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      If you made an unintended change during your last restore, you can revert back to this snapshot.
                    </p>
                    <button
                      type="button"
                      onClick={handleRollback}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-2xs transition-colors mt-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert Database to Safety Snapshot</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No recovery snapshot found yet. A recovery snapshot is automatically created immediately prior to
                    any restore operation.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Local-First Private Engine (0% cloud transmission)</span>
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
    </div>
  )
}
