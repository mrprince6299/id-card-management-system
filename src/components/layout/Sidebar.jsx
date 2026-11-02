import React from 'react'
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  Palette,
  FileDown,
  CreditCard,
  ShieldCheck,
  X,
  Layers,
  Image as ImageIcon,
} from 'lucide-react'
import { NAV_ITEMS } from '../../utils/constants'

const iconMap = {
  LayoutDashboard,
  Users,
  UploadCloud,
  Image: ImageIcon,
  Palette,
  FileDown,
}

export const Sidebar = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/90 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shadow-xs">
              <CreditCard className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">ID Generator</h1>
              <p className="text-[11px] font-medium text-slate-400">Enterprise Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Menu
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 font-semibold border border-blue-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 stroke-[2] ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.id === 'export' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    PDF
                  </span>
                )}
              </button>
            )
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            System Specs
          </div>

          <div className="px-3 py-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                CR80 Format
              </span>
              <span className="font-mono text-[11px] text-slate-500">85.6×54 mm</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Print Standard
              </span>
              <span className="font-mono text-[11px] text-slate-500">300 DPI</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs">
              <p className="font-medium text-slate-800">Local Engine Ready</p>
              <p className="text-[11px] text-slate-400">Phase 1: Setup & UI</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

