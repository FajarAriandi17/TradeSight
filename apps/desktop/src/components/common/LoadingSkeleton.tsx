export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="skeleton h-6 w-48" />
      <div className="skeleton flex-1" />
      <div className="skeleton h-20" />
    </div>
  )
}
