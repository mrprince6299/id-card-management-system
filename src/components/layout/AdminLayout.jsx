import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const AdminLayout = ({
  children,
  currentTab,
  onSelectTab,
  isSidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={isSidebarOpen}
        onClose={onCloseSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          currentTab={currentTab}
          onOpenSidebar={onOpenSidebar}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

