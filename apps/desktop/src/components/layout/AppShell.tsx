import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { ToastContainer } from '../common/Toast'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="flex min-h-0 flex-1">{children}</main>
      <ToastContainer />
      <footer id="app-footer" className="flex h-7 shrink-0 items-center justify-center border-t border-border-subtle bg-bg-surface px-4 text-[10px] text-txt-muted">
        ⚠ TradeSight adalah alat bantu analisa teknikal — <strong className="mx-1 text-txt-primary">bukan rekomendasi investasi</strong>. Trading mengandung risiko kerugian. Keputusan sepenuhnya di tangan Anda.
      </footer>
    </div>
  )
}
