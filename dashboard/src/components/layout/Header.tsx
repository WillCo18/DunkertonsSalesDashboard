'use client'

import { formatMonth } from '@/lib/utils'

interface HeaderProps {
  currentMonth?: string
  mappingCoverage?: number
}

export function Header({ currentMonth, mappingCoverage }: HeaderProps) {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          Dunkertons Sales Dashboard
        </h1>
        {currentMonth && (
          <span className="px-3 py-1 bg-surface-elevated rounded-full text-sm text-foreground-secondary">
            {formatMonth(currentMonth)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {mappingCoverage !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-muted">Mapping Coverage:</span>
            <span
              className={`text-sm font-mono font-medium ${mappingCoverage >= 95
                  ? 'text-success'
                  : mappingCoverage >= 80
                    ? 'text-warning'
                    : 'text-danger'
                }`}
            >
              {mappingCoverage.toFixed(1)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <span className="text-sm font-semibold text-background">D</span>
          </div>
        </div>
      </div>
    </header>
  )
}
