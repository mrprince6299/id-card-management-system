import React from 'react'
import { getStatusVariant } from '../../utils/formatters'

export const Badge = ({ status, customLabel, className = '' }) => {
  const variant = getStatusVariant(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variant.bg} ${variant.text} ${variant.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${variant.dot}`} />
      {customLabel || variant.label}
    </span>
  )
}

