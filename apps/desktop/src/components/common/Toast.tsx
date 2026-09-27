import { useToastStore, type ToastKind } from '../../stores/useToastStore'

const STYLE: Record<ToastKind, { icon: string; ring: string; accent: string }> = {
  signal: { icon: '✦', ring: 'border-tp/40', accent: 'text-tp' },
  tp: { icon: '✓', ring: 'border-buy/40', accent: 'text-buy' },
  sl: { icon: '✕', ring: 'border-sl/40', accent: 'text-sl' },
  info: { icon: 'ℹ', ring: 'border-border-subtle', accent: 'text-txt-muted' },
}

/** Kontainer toast (kanan atas). Animasi slide-in + fade — PRD §11. */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-72 flex-col gap-2">
      {toasts.map((t) => {
        const st = STYLE[t.kind]
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`anim-toast pointer-events-auto flex items-start gap-2 rounded-card border ${st.ring} bg-bg-surface p-3 text-left shadow-xl`}
          >
            <span className={`text-sm font-bold ${st.accent}`}>{st.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-txt-primary">{t.title}</span>
              {t.body && <span className="num mt-0.5 block truncate text-[11px] text-txt-muted">{t.body}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
