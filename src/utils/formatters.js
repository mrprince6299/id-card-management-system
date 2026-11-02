/**
 * Format date string into readable standard format
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/**
 * Return badge styling classes based on ID generation status
 */
export const getStatusVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'generated':
      return {
        label: 'Generated',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'pending':
      return {
        label: 'Pending',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      }
    case 'draft':
      return {
        label: 'Draft',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
  }
}

