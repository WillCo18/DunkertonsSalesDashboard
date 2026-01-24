'use client'

import { formatNumber, formatMonth, truncate } from '@/lib/utils'
import type { AtRiskCustomer } from '@/types'
import { AlertTriangle, Download } from 'lucide-react'

interface AtRiskCustomersListProps {
  data: AtRiskCustomer[]
  loading?: boolean
  onExport?: () => void
  onRowClick?: (id: string) => void
}

export function AtRiskCustomersList({
  data,
  loading = false,
  onExport,
  onRowClick,
}: AtRiskCustomersListProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">At-Risk Customers</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
            At-Risk Customers
          </h3>
          <span className="bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">
            {data.length}
          </span>
        </div>
        {onExport && data.length > 0 && (
          <button
            onClick={onExport}
            className="text-foreground-muted hover:text-foreground transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {data.length === 0 ? (
          <div className="text-center text-foreground-muted py-4">
            No at-risk customers identified
          </div>
        ) : (
          data.map((customer) => (
            <div
              key={customer.del_account}
              onClick={() => onRowClick?.(customer.del_account)}
              className="flex items-center justify-between py-2 px-3 bg-surface-elevated rounded-lg hover:bg-border transition-colors cursor-pointer"
            >
              <div>
                <div className="font-medium text-foreground text-sm">
                  {truncate(customer.customer_name, 25)}
                </div>
                <div className="text-xs text-foreground-muted">
                  Last order: {formatMonth(customer.last_order_month)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-mono text-sm ${customer.months_since_last_order >= 2
                    ? 'text-danger'
                    : 'text-warning'
                    }`}
                >
                  {customer.months_since_last_order}mo ago
                </div>
                <div className="text-xs text-foreground-muted">
                  {formatNumber(customer.total_units_all_time)} total units
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
