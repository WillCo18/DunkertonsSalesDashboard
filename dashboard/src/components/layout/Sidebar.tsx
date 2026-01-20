'use client'

import { formatMonth } from '@/lib/utils'
import type { FilterState } from '@/types'

interface SidebarProps {
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  toggleArrayFilter: (
    key: 'brandFamily' | 'packFormat' | 'salesperson',
    value: string
  ) => void
  resetFilters: () => void
  hasActiveFilters: boolean
  availableMonths: string[]
  filterOptions: {
    brandFamilies: string[]
    packFormats: string[]
    salespeople: string[]
  }
}

export function Sidebar({
  filters,
  setFilter,
  toggleArrayFilter,
  resetFilters,
  hasActiveFilters,
  availableMonths,
  filterOptions,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-surface border-r border-border h-full overflow-y-auto flex flex-col">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-lg font-bold text-background">D</span>
          </div>
          <div>
            <div className="font-semibold text-foreground">Dunkertons</div>
            <div className="text-xs text-foreground-muted">Sales Analytics</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto">
        {/* Period Filter */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Period
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('reportMonth', availableMonths)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
                title="Select all months"
              >
                All
              </button>
              <span className="text-foreground-muted">|</span>
              <button
                onClick={() => setFilter('reportMonth', [])}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                title="Clear selection"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Month count indicator */}
          {filters.reportMonth.length > 0 && (
            <div className="mb-2 text-xs text-accent">
              {filters.reportMonth.length} month{filters.reportMonth.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Scrollable month list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {availableMonths.map((month) => (
              <label
                key={month}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.reportMonth.includes(month)}
                  onChange={() => {
                    const current = filters.reportMonth
                    const newValue = current.includes(month)
                      ? current.filter((m) => m !== month)
                      : [...current, month]
                    setFilter('reportMonth', newValue)
                  }}
                  className="w-4 h-4 rounded border-border bg-surface-elevated text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                  {formatMonth(month)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Brand Family Filter */}
        <div className="p-4 border-b border-border">
          <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider block mb-2">
            Brand Family
          </label>
          <div className="space-y-2">
            {filterOptions.brandFamilies.map((brand) => (
              <label
                key={brand}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.brandFamily.includes(brand)}
                  onChange={() => toggleArrayFilter('brandFamily', brand)}
                  className="w-4 h-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                  {brand}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Pack Format Filter */}
        <div className="p-4 border-b border-border">
          <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider block mb-2">
            Pack Format
          </label>
          <div className="space-y-2">
            {filterOptions.packFormats.map((format) => (
              <label
                key={format}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.packFormat.includes(format)}
                  onChange={() => toggleArrayFilter('packFormat', format)}
                  className="w-4 h-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                  {format}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Salesperson Filter */}
        {filterOptions.salespeople.length > 0 && (
          <div className="p-4 border-b border-border">
            <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider block mb-2">
              Salesperson
            </label>
            <div className="space-y-2">
              {filterOptions.salespeople.map((person) => (
                <label
                  key={person}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.salesperson.includes(person)}
                    onChange={() => toggleArrayFilter('salesperson', person)}
                    className="w-4 h-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                    {person}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-border">
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground bg-surface-elevated hover:bg-border rounded-md transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </aside>
  )
}
