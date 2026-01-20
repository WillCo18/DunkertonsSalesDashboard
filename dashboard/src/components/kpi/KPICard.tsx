'use client'

import { ReactNode } from 'react'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: number | string
  delta?: number
  deltaLabel?: string
  format?: 'number' | 'percent' | 'text'
  icon?: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  loading?: boolean
  onClick?: () => void
}

export function KPICard({
  label,
  value,
  delta,
  deltaLabel,
  format = 'number',
  icon,
  variant = 'default',
  loading = false,
  onClick,
}: KPICardProps) {
  const formattedValue =
    typeof value === 'string'
      ? value
      : format === 'percent'
        ? formatPercent(value)
        : formatNumber(value)

  const deltaDirection = delta ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral') : null

  return (
    <div
      className={cn(
        'kpi-tile relative overflow-hidden',
        variant === 'success' && 'border-l-4 border-l-success',
        variant === 'warning' && 'border-l-4 border-l-warning',
        variant === 'danger' && 'border-l-4 border-l-danger',
        onClick && 'cursor-pointer hover:bg-surface-elevated transition-colors'
      )}
      onClick={onClick}
    >
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-20 bg-surface-elevated rounded" />
          <div className="h-10 w-32 bg-surface-elevated rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">{label}</span>
            {icon && (
              <span className="text-foreground-muted">{icon}</span>
            )}
          </div>

          <div className="kpi-value mb-1 truncate" title={typeof value === 'string' ? value : undefined}>
            {formattedValue}
          </div>

          {delta !== undefined && (
            <div className="flex items-center gap-1">
              {deltaDirection === 'up' && (
                <TrendingUp className="w-4 h-4 text-success" />
              )}
              {deltaDirection === 'down' && (
                <TrendingDown className="w-4 h-4 text-danger" />
              )}
              {deltaDirection === 'neutral' && (
                <Minus className="w-4 h-4 text-foreground-muted" />
              )}
              <span
                className={cn(
                  'kpi-delta',
                  deltaDirection === 'up' && 'text-success',
                  deltaDirection === 'down' && 'text-danger',
                  deltaDirection === 'neutral' && 'text-foreground-muted'
                )}
              >
                {delta > 0 ? '+' : ''}
                {formatPercent(delta)}
              </span>
              {deltaLabel && (
                <span className="text-xs text-foreground-muted ml-1">
                  {deltaLabel}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
