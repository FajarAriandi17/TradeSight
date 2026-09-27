import type { ReactNode } from 'react'

export function Modal({ open, onClose, children, width = 520 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="anim-backdrop absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        className="anim-modal relative rounded-card border border-border-subtle bg-bg-surface p-6 shadow-2xl"
        style={{ width, maxWidth: '92vw' }}
      >
        <button onClick={onClose} aria-label="Tutup" className="absolute right-3 top-2 text-xl text-txt-muted hover:text-txt-primary">×</button>
        {children}
      </div>
    </div>
  )
}
