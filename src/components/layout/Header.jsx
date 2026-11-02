import React, { useState } from 'react'
import { Menu, Search, Calendar, Sparkles, Building2, ChevronDown, DownloadCloud, Settings2 } from 'lucide-react'
import { NAV_ITEMS } from '../../utils/constants'
import { useEmployees } from '../../context/EmployeeContext'
import { OrganizationManagerModal } from '../organizations/OrganizationManagerModal'
import { BackupRestoreModal } from '../backup/BackupRestoreModal'

export const Header = ({ currentTab, onOpenSidebar, searchTerm, onSearchChange }) => {
  const currentNav = NAV_ITEMS.find((item) => item.id === currentTab) || NAV_ITEMS[0]
  const { organizations, activeOrganization, switchOrganization, createFullBackup, unassignedRecords } = useEmployees()
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const handleDownloadBackup = async () => {
    try {
      const backup = await createFullBackup()
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `idcard-platform-backup-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch (err) {
      alert(`Backup failed: ${err.message}`)
    }
  }

  // Only display active non-archived organizations in quick dropdown
  const activeOrgs = organizations.filter((org) => !org.isArchived && org.id !== 'unassigned-legacy')

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Portal</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-semibold text-blue-600">{currentNav.label}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 hidden sm:block">
            {currentNav.label}
          </h2>
        </div>
      </div>

      {/* Middle: Active Organization Selector & Manager Trigger */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
          <Building2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
          <span className="text-slate-400 font-medium mr-1 hidden md:inline">Org:</span>
          <select
            value={activeOrganization?.id || 'novatech'}
            onChange={(e) => switchOrganization(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-4 text-xs max-w-[140px] sm:max-w-[200px] truncate"
            title="Switch Active Organization or Institution"
          >
            {activeOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsOrgModalOpen(true)}
          className="relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          title="Open Organization & Institution Manager"
        >
          <Settings2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Manage</span>
          {unassignedRecords?.length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Right: Actions, Date, User */}
      <div className="flex items-center gap-2.5">
        {/* Backup & Disaster Recovery Button */}
        <button
          type="button"
          onClick={() => setIsBackupModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          title="Open Backup & Disaster Recovery System"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-blue-600" />
          <span>Backup & Restore</span>
        </button>

        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100">
            ID
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Admin User</p>
            <p className="text-[10px] text-slate-400">Card Platform</p>
          </div>
        </div>
      </div>

      {/* Organization Manager Modal */}
      <OrganizationManagerModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
      />

      {/* Backup & Disaster Recovery Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </header>
  )
}
