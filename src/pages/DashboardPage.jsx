import React, { lazy, Suspense } from 'react'
import { DashboardOverview } from '../components/dashboard/DashboardOverview'
import { EmployeesPage } from './EmployeesPage'
import { Loader2 } from 'lucide-react'

// Lazy load feature tabs to optimize initial page load performance
const ImportEmployeesSection = lazy(() =>
  import('../components/import/ImportEmployeesSection').then((m) => ({
    default: m.ImportEmployeesSection,
  }))
)
const PhotoManagerSection = lazy(() =>
  import('../components/photos/PhotoManagerSection').then((m) => ({
    default: m.PhotoManagerSection,
  }))
)
const IdCardDesignerSection = lazy(() =>
  import('../components/designer/IdCardDesignerSection').then((m) => ({
    default: m.IdCardDesignerSection,
  }))
)
const ExportPdfSection = lazy(() =>
  import('../components/export/ExportPdfSection').then((m) => ({
    default: m.ExportPdfSection,
  }))
)

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] text-gray-500 space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Loading section...</p>
    </div>
  )
}

export const DashboardPage = ({
  currentTab,
  onNavigate,
  selectedEmployee,
  onSelectEmployeeForDesigner,
}) => {
  return (
    <Suspense fallback={<TabLoadingFallback />}>
      {(() => {
        switch (currentTab) {
          case 'overview':
            return (
              <DashboardOverview
                onNavigate={onNavigate}
                onSelectEmployeeForDesigner={onSelectEmployeeForDesigner}
              />
            )

          case 'employees':
            return (
              <EmployeesPage
                onSelectEmployeeForDesigner={(emp) => {
                  onSelectEmployeeForDesigner(emp)
                  onNavigate('designer')
                }}
                onNavigateToImport={() => onNavigate('import')}
              />
            )

          case 'import':
            return (
              <ImportEmployeesSection
                onNavigateToEmployees={() => onNavigate('employees')}
                onNavigateToDesigner={() => onNavigate('designer')}
              />
            )

          case 'photos':
            return (
              <PhotoManagerSection
                onNavigateToEmployees={() => onNavigate('employees')}
                onNavigateToDesigner={() => onNavigate('designer')}
              />
            )

          case 'designer':
            return (
              <IdCardDesignerSection
                selectedEmployee={selectedEmployee}
                onNavigateToExport={() => onNavigate('export')}
              />
            )

          case 'export':
            return (
              <ExportPdfSection
                onNavigateToDesigner={() => onNavigate('designer')}
              />
            )

          default:
            return (
              <DashboardOverview
                onNavigate={onNavigate}
                onSelectEmployeeForDesigner={onSelectEmployeeForDesigner}
              />
            )
        }
      })()}
    </Suspense>
  )
}

