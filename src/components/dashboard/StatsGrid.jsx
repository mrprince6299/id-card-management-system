import React from 'react'
import { Users, CreditCard, Clock, Layers } from 'lucide-react'
import { StatsCard } from '../common/StatsCard'
import { useEmployees } from '../../context/EmployeeContext'

export const StatsGrid = () => {
  const { stats } = useEmployees()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Total Employees */}
      <StatsCard
        title="Total Employees"
        value={stats.totalEmployees}
        subtext={stats.totalEmployeesGrowth}
        icon={Users}
        badgeText="Active Roster"
        badgeColor="bg-blue-50 text-blue-700 border-blue-200"
        accentBorder="border-l-blue-600"
      />

      {/* Generated ID Cards */}
      <StatsCard
        title="Generated ID Cards"
        value={stats.generatedCards}
        subtext={`${stats.generatedPercentage}% of workforce issued`}
        icon={CreditCard}
        badgeText={`${stats.generatedPercentage}%`}
        badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        accentBorder="border-l-emerald-600"
      />

      {/* Pending Generation */}
      <StatsCard
        title="Pending Generation"
        value={stats.pendingGeneration}
        subtext="Requires card generation"
        icon={Clock}
        badgeText="Action required"
        badgeColor="bg-amber-50 text-amber-700 border-amber-200"
        accentBorder="border-l-amber-500"
      />

      {/* Active Card Templates */}
      <StatsCard
        title="Design Templates"
        value={stats.activeTemplates}
        subtext={`${stats.departmentsCount} departments tagged`}
        icon={Layers}
        badgeText="3 Styles"
        badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200"
        accentBorder="border-l-indigo-600"
      />
    </div>
  )
}
