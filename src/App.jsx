import React, { useState } from 'react'
import { AdminLayout } from './components/layout/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { useNavigation } from './hooks/useNavigation'
import { EmployeeProvider } from './context/EmployeeContext'

export function App() {
  const {
    currentTab,
    setCurrentTab,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
  } = useNavigation('overview')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployeeForDesigner, setSelectedEmployeeForDesigner] = useState(null)

  const handleSelectEmployeeForDesigner = (emp) => {
    setSelectedEmployeeForDesigner(emp)
  }

  return (
    <EmployeeProvider>
      <AdminLayout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isSidebarOpen={isSidebarOpen}
        onOpenSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      >
        <DashboardPage
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          selectedEmployee={selectedEmployeeForDesigner}
          onSelectEmployeeForDesigner={handleSelectEmployeeForDesigner}
        />
      </AdminLayout>
    </EmployeeProvider>
  )
}

export default App
