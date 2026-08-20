import type { Category } from '@/domain/types'

/**
 * Two-letter mono codes rather than pictograms: this is dispatch software,
 * and a fixed-width code column scans faster than mixed-width icons.
 */
const CATEGORY_META: Record<Category, { code: string; label: string }> = {
  fire: { code: 'FR', label: 'FIRE' },
  medical: { code: 'MD', label: 'MEDICAL' },
  security: { code: 'SC', label: 'SECURITY' },
  harassment: { code: 'HR', label: 'HARASSMENT' },
  infrastructure: { code: 'IN', label: 'INFRA' },
  other: { code: 'OT', label: 'OTHER' },
}

export function CategoryChip({ category }: { category: Category }) {
  const { code, label } = CATEGORY_META[category]

  return (
    <span
      title={label}
      className="flex size-7 shrink-0 items-center justify-center rounded border border-ops-border bg-ops-bg font-mono text-[10px] font-bold text-ops-accent"
    >
      {code}
    </span>
  )
}
