/**
 * The number the demo is sold on. The fill animates via `transform: scaleX`
 * rather than width — transforms stay off the layout path, per the design
 * contract's motion rules — so the climb is smooth even mid-storm.
 */
export function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100)

  return (
    <div className="flex items-center gap-2" aria-label={`corroboration confidence ${percent}%`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ops-bg">
        <div
          className="h-full origin-left rounded-full bg-ops-accent transition-transform duration-700 ease-out will-change-transform motion-reduce:transition-none"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, value))})` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-ops-accent">
        {percent}%
      </span>
    </div>
  )
}
