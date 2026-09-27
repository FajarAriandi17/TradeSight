import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { DashboardScreen } from './screens/DashboardScreen'
import { DetailScreen } from './screens/DetailScreen'
import { ScreenerScreen } from './screens/ScreenerScreen'
import { JournalScreen } from './screens/JournalScreen'
import { BacktestScreen } from './screens/BacktestScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PaywallScreen } from './screens/PaywallScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useUserStore } from './stores/useUserStore'
import { useChartStore } from './stores/useChartStore'
import { api, waitForSidecar } from './services/api'
import { useMarketData } from './hooks/useMarketData'
import { Button } from './components/common/Button'

function Main() {
  const screen = useUserStore((s) => s.screen)
  const { reload } = useMarketData()
  return (
    <AppShell>
      {screen === 'dashboard' && <DashboardScreen onRetry={reload} />}
      {screen === 'detail' && <DetailScreen onRetry={reload} />}
      {screen === 'screener' && <ScreenerScreen />}
      {screen === 'journal' && <JournalScreen />}
      {screen === 'backtest' && <BacktestScreen />}
      {screen === 'settings' && <SettingsScreen />}
      <PaywallScreen />
    </AppShell>
  )
}

export default function App() {
  const onboarded = useUserStore((s) => s.onboarded)
  const theme = useUserStore((s) => s.theme)
  const [ready, setReady] = useState<'wait' | 'ok' | 'fail'>('wait')

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const boot = async () => {
    setReady('wait')
    if (!(await waitForSidecar())) return setReady('fail')
    try {
      useChartStore.getState().setInstruments(await api.instruments())
      setReady('ok')
    } catch {
      setReady('fail')
    }
  }

  useEffect(() => { boot() }, [])

  if (!onboarded) return <OnboardingScreen />
  if (ready === 'wait')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <img src="/icon.png" className="h-14 w-14 animate-pulse rounded-xl" alt="" />
        <p className="text-sm text-txt-muted">Menyalakan engine analisa…</p>
      </div>
    )
  if (ready === 'fail')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-sl">Engine analisa lokal tidak merespons.</p>
        <Button variant="outline" onClick={boot}>Coba lagi</Button>
      </div>
    )
  return <Main />
}
