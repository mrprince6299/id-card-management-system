import React from 'react'
import { Cpu, Building2 } from 'lucide-react'

export const CompanyLogo = ({
  logoUrl,
  companyName = 'NOVATECH SOLUTIONS',
  tagline = 'Technology | Innovation | Excellence',
  theme = 'corporate-blue',
  compact = false,
}) => {
  const isDarkTheme = theme === 'modern-tech'

  if (logoUrl) {
    return (
      <div className="flex items-center justify-center gap-2">
        <img
          src={logoUrl}
          alt={companyName}
          className="max-h-7 max-w-[120px] object-contain"
        />
        {!compact && (
          <div className="text-left">
            <p
              className={`text-xs font-extrabold tracking-wider uppercase leading-none ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
              }`}
            >
              {companyName}
            </p>
            {tagline && (
              <p
                className={`text-[8px] font-medium tracking-tight mt-0.5 truncate ${
                  isDarkTheme ? 'text-cyan-300/80' : 'text-slate-500'
                }`}
              >
                {tagline}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Fallback: Elegant text-based monogram logo
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="flex items-center justify-center gap-1.5">
        <div
          className={`flex items-center justify-center w-5 h-5 rounded ${
            theme === 'corporate-blue'
              ? 'bg-blue-600 text-white shadow-2xs'
              : theme === 'modern-tech'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-400/50'
              : 'bg-zinc-800 text-white'
          }`}
        >
          <span className="text-[10px] font-black leading-none">N</span>
        </div>
        <span
          className={`text-xs font-extrabold tracking-wider uppercase ${
            theme === 'modern-tech' || theme === 'corporate-blue'
              ? 'text-white'
              : 'text-zinc-900'
          }`}
        >
          {companyName}
        </span>
      </div>

      {!compact && tagline && (
        <p
          className={`text-[8.5px] font-medium tracking-wide uppercase mt-0.5 ${
            theme === 'modern-tech'
              ? 'text-cyan-300/80'
              : theme === 'corporate-blue'
              ? 'text-blue-100/90'
              : 'text-zinc-500'
          }`}
        >
          {tagline}
        </p>
      )}
    </div>
  )
}

