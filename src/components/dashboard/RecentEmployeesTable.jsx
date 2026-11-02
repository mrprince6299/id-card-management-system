import React, { useState } from 'react'
import { Search, Eye, ArrowUpRight } from 'lucide-react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { useEmployees } from '../../context/EmployeeContext'

export const RecentEmployeesTable = ({ onSelectEmployeeForDesigner, onNavigateToEmployees }) => {
  const { employees, getEmployeePhoto } = useEmployees()
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEmployees = employees.filter((emp) => {
    const status = emp.status || 'Pending'
    const matchesStatus =
      filterStatus === 'all' || status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch =
      (emp.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.id || emp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  // Display top 8 most recent
  const displayedEmployees = filteredEmployees.slice(0, 8)

  return (
    <Card className="p-5 sm:p-6">
      {/* Table Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Live Employee Directory & Status</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor badge issuance and identity verification status from persistent storage
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 text-xs">
            {['all', 'Generated', 'Pending', 'Draft'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                  filterStatus === status
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter roster..."
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-sm text-slate-600">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Employee</th>
              <th className="py-3 px-3">Employee ID</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3">Blood Group</th>
              <th className="py-3 px-3">Validity</th>
              <th className="py-3 px-3">Badge Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                  No employees found matching the filter criteria.
                </td>
              </tr>
            ) : (
              displayedEmployees.map((emp) => {
                const empId = emp.employeeId || emp.id
                return (
                  <tr key={empId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getEmployeePhoto(emp) || emp.avatarUrl}
                          alt={emp.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 ring-1 ring-slate-100 shrink-0"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
                          }}
                        />
                        <div>
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {emp.role || emp.designation}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700">
                      {empId}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{emp.department}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-slate-700">
                      {emp.bloodGroup || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {emp.expiryDate || '2028-01-01'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={emp.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Eye}
                        onClick={() => onSelectEmployeeForDesigner?.(emp)}
                        title="Preview in ID Card Designer"
                      >
                        Preview Card
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
        <p>
          Showing <span className="font-semibold text-slate-700">{displayedEmployees.length}</span>{' '}
          of <span className="font-semibold text-slate-700">{employees.length}</span> live
          records in storage
        </p>

        {onNavigateToEmployees && (
          <button
            type="button"
            onClick={onNavigateToEmployees}
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View Complete Roster ({employees.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  )
}
