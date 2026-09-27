import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Plan = 'free' | 'premium'
export type Screen = 'dashboard' | 'settings' | 'detail'

interface UserState {
  onboarded: boolean
  plan: Plan
  licenseKey: string
  theme: 'dark' | 'light'
  notifications: boolean
  screen: Screen
  paywallOpen: boolean
  paywallReason: string
  completeOnboarding: () => void
  resetOnboarding: () => void
  setTheme: (t: 'dark' | 'light') => void
  setNotifications: (v: boolean) => void
  setScreen: (s: Screen) => void
  openPaywall: (reason: string) => void
  closePaywall: () => void
  activateLicense: (key: string) => boolean
  downgrade: () => void
}

export const FREE_WATCHLIST_LIMIT = 5

/**
 * Validasi lisensi offline sederhana (placeholder sebelum License Server + Midtrans di Fase 3).
 * Format: TS-XXXX-XXXX-XXXX, checksum = jumlah char code mod 7 === 0.
 */
export function isValidLicense(key: string): boolean {
  const k = key.trim().toUpperCase()
  if (!/^TS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) return false
  const sum = [...k.replace(/-/g, '')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return sum % 7 === 0
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      onboarded: false,
      plan: 'free',
      licenseKey: '',
      theme: 'dark',
      notifications: true,
      screen: 'dashboard',
      paywallOpen: false,
      paywallReason: '',
      completeOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () => set({ onboarded: false }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setScreen: (screen) => set({ screen }),
      openPaywall: (paywallReason) => set({ paywallOpen: true, paywallReason }),
      closePaywall: () => set({ paywallOpen: false }),
      activateLicense: (key) => {
        if (!isValidLicense(key)) return false
        set({ plan: 'premium', licenseKey: key.trim().toUpperCase(), paywallOpen: false })
        return true
      },
      downgrade: () => set({ plan: 'free', licenseKey: '' }),
    }),
    {
      name: 'tradesight-user',
      partialize: (s) => ({
        onboarded: s.onboarded, plan: s.plan, licenseKey: s.licenseKey, theme: s.theme, notifications: s.notifications,
      }),
    },
  ),
)
