import React from 'react'
import { Card } from './Card'

export const StatsCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200',
  accentBorder = 'border-l-blue-600',
}) => {
  return (
    <Card className={`p-5 relative overflow-hidden border-l-4 ${accentBorder}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
            {badgeText && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtext && <p className="mt-1.5 text-xs text-slate-500">{subtext}</p>}
        </div>

        {Icon && (
          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100/60 text-blue-600">
            <Icon className="w-5 h-5 stroke-[1.75]" />
          </div>
        )}
      </div>
    </Card>
  )
}

