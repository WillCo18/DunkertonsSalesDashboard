'use client'

import { formatNumber, truncate } from '@/lib/utils'
import type { NewCustomer } from '@/types'
import { UserPlus, Download } from 'lucide-react'

interface NewCustomersListProps {
  data: NewCustomer[]
  loading?: boolean
  onExport?: () => void
}

export function NewCustomersList({
  data,
  loading = false,
  onExport,
}: NewCustomersListProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">New Customers</h3>
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
          <UserPlus className="w-4 h-4 text-success" />
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
            New This Month
          </h3>
          <span className="bg-success/20 text-success text-xs font-medium px-2 py-0.5 rounded-full">
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
            No new customers this period
          </div>
        ) : (
          data.map((customer) => (
            <div
              key={customer.del_account}
              className="flex items-center justify-between py-2 px-3 bg-surface-elevated rounded-lg hover:bg-border transition-colors"
            >
              <div>
                <div className="font-medium text-foreground text-sm">
                  {truncate(customer.customer_name, 25)}
                </div>
                <div className="text-xs text-foreground-muted">
                  {customer.delivery_city || customer.delivery_postcode || 'No location'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-accent">
                  {formatNumber(customer.first_month_units)}
                </div>
                <div className="text-xs text-foreground-muted">units</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
