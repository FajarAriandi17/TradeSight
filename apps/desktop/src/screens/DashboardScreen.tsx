import { ChartPanel } from '../components/chart/ChartPanel'
import { SignalCard } from '../components/signal/SignalCard'
import { WatchlistSidebar } from '../components/watchlist/WatchlistSidebar'

export function DashboardScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div id="dashboard-screen" className="anim-screen flex min-h-0 flex-1">
      <WatchlistSidebar />
      <ChartPanel onRetry={onRetry} />
      <SignalCard />
    </div>
  )
}
