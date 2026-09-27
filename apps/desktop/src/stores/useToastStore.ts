import { create } from 'zustand'

export type ToastKind = 'signal' | 'tp' | 'sl' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) })
    // auto-dismiss setelah 4 dtk (PRD §11)
    setTimeout(() => get().dismiss(id), 4000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}))

/** Helper ringkas untuk memicu toast dari luar komponen. */
export const toast = (t: Omit<Toast, 'id'>) => useToastStore.getState().push(t)
