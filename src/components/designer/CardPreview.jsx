import React from 'react'
import { CardFrontView } from './CardFrontView'
import { CardBackView } from './CardBackView'

export const CardPreview = ({
  employee,
  photoUrl,
  template = 'corporate-blue',
  side = 'front', // 'front' | 'back'
  settings = {},
  scale = 1,
}) => {
  const isDark = template === 'modern-tech' || template === 'tech-cyan'
  const isSidwal = template === 'sidwal-workshop' || template?.startsWith('sidwal-')

  return (
    <div
      data-testid="id-card-preview"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
      className={`w-[280px] ${
        isSidwal ? 'h-[407px] rounded-xl' : 'h-[444px] rounded-2xl'
      } shadow-xl overflow-hidden relative select-none transition-all duration-300 ${
        isDark
          ? 'bg-[#0a0f1d] border border-cyan-800/60 shadow-cyan-950/40 ring-1 ring-cyan-500/20'
          : isSidwal
          ? 'bg-white border border-slate-300 shadow-slate-400/40'
          : template === 'executive-minimal' || template === 'executive-slate'
          ? 'bg-white border border-zinc-300 shadow-zinc-300/60'
          : 'bg-white border border-slate-200 shadow-slate-300/60'
      }`}
    >
      {/* Top Lanyard Clip Slot Visual Indicator (Omit for SIDWAL to preserve logo) */}
      {!isSidwal && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full z-30 ${
            isDark ? 'bg-cyan-950/80 border border-cyan-800/60' : 'bg-slate-300/90 border border-slate-400/40'
          }`}
        />
      )}

      {/* Render Selected Side */}
      {side === 'front' ? (
        <CardFrontView
          employee={employee}
          photoUrl={photoUrl}
          template={template}
          settings={settings}
        />
      ) : (
        <CardBackView
          employee={employee}
          template={template}
          settings={settings}
        />
      )}
    </div>
  )
}
