import React from 'react'
import {
  UploadCloud,
  Palette,
  FileDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react'
import { StatsGrid } from './StatsGrid'
import { RecentEmployeesTable } from './RecentEmployeesTable'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { CardPreview } from '../designer/CardPreview'
import { useEmployees } from '../../context/EmployeeContext'

export const DashboardOverview = ({ onNavigate, onSelectEmployeeForDesigner }) => {
  const { employees, stats, getEmployeePhoto } = useEmployees()
  const rawFeatured = employees[0] || {
    id: 'EMP-1001',
    fullName: 'Active Employee',
    role: 'Staff Member',
    department: 'Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  }

  const featuredEmployee = {
    ...rawFeatured,
    avatarUrl: getEmployeePhoto(rawFeatured) || rawFeatured.avatarUrl,
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-blue-100 text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Enterprise Identity Card Management System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Employee ID Generator Dashboard
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Manage your employee credentials, import workforce records from Excel/CSV, customize standard CR80
            badges, and prepare print-ready high-resolution batches.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('import')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-xs"
            >
              Import Excel / CSV Roster
            </button>
            <button
              type="button"
              onClick={() => onNavigate('designer')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-800/60 hover:bg-blue-800/80 text-white border border-white/20 transition-colors"
            >
              Open ID Card Designer
            </button>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 1. Dashboard Overview Statistics Grid */}
      <section aria-label="Key Performance Indicators">
        <StatsGrid />
      </section>

      {/* 2. Three Dedicated Core Sections Preview Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Production Workflow Modules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Core pipelines for batch employee onboarding and badge manufacturing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Import Employees Section */}
          <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-blue-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Import Roster
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Excel (.xlsx, .xls) and CSV importer with auto-header mapping and validation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('import')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
            >
              <span>Import Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Card 2: Bulk Photo Upload */}
          <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-blue-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Photo Manager
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bulk photo upload with automatic Employee ID matching and IndexedDB persistence.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('photos')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors"
            >
              <span>Match Photos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Card 3: ID Card Designer Section */}
          <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-blue-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Palette className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Card Designer
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Design custom CR80 cards with live preview, barcodes, QR, and company branding.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('designer')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors"
            >
              <span>Open Designer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Card 4: Export PDF Section */}
          <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-blue-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileDown className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Export Setup
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Batch output layout (A4 8-up sheet or CR80 PVC feed) with 300 DPI calibration.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
            >
              <span>Print Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>
        </div>
      </section>

      {/* 3. Live Card Designer Quick Spotlight */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Standard Security Template Spotlight</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Ready-to-Print Corporate Identity Badges
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Every card integrates ISO/IEC standard dimensions, digital verification QR code,
              optical Code 128 barcode, verified security ribbon, and high-resolution photo bounds.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Standard</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">CR80 Plastic</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Dimensions</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">85.6 × 54 mm</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] text-slate-400 font-medium">Bleed Margin</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">3.0 mm Safe</p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                icon={Palette}
                onClick={() => onNavigate('designer')}
              >
                Customize This Design
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('export')}
              >
                View Print Sheet
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center py-4 bg-slate-50/70 rounded-xl border border-slate-100">
            <CardPreview
              employee={featuredEmployee}
              template="corporate-blue"
              scale={0.92}
            />
          </div>
        </div>
      </section>

      {/* 4. Recent Employees Table */}
      <section aria-label="Recent Employees Directory">
        <RecentEmployeesTable
          onSelectEmployeeForDesigner={(emp) => {
            onSelectEmployeeForDesigner(emp)
            onNavigate('designer')
          }}
          onNavigateToEmployees={() => onNavigate('employees')}
        />
      </section>
    </div>
  )
}
