'use client'

import { useState } from 'react'
import { formatNumber, truncate, formatMonth } from '@/lib/utils'
import type { NewCustomer } from '@/types'
import { UserPlus, Download, RotateCcw } from 'lucide-react'

interface ReturningCustomer {
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  current_month_units: number
  last_order_month: string
  months_since_last_order: number
}

interface NewCustomersListProps {
  data: NewCustomer[]
  returningData?: ReturningCustomer[]
  loading?: boolean
  onExport?: () => void
}

export function NewCustomersList({
  data,
  returningData = [],
  loading = false,
  onExport,
}: NewCustomersListProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'returning'>('new')

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-header mb-0">New & Returning Customers</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    )
  }

  const currentData = activeTab === 'new' ? data : returningData

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-success" />
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
            Customer Acquisition
          </h3>
        </div>
        {onExport && currentData.length > 0 && (
          <button
            onClick={onExport}
            className="text-foreground-muted hover:text-foreground transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new'
              ? 'bg-success/20 text-success border border-success/30'
              : 'bg-surface-elevated text-foreground-muted hover:text-foreground border border-transparent'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="w-3.5 h-3.5" />
            <span>New</span>
            <span className="bg-success/20 text-success text-xs px-1.5 py-0.5 rounded-full">
              {data.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('returning')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'returning'
              ? 'bg-info/20 text-info border border-info/30'
              : 'bg-surface-elevated text-foreground-muted hover:text-foreground border border-transparent'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returning</span>
            <span className="bg-info/20 text-info text-xs px-1.5 py-0.5 rounded-full">
              {returningData.length}
            </span>
          </div>
        </button>
      </div>

      {/* Description */}
      <div className="mb-3 text-xs text-foreground-muted bg-surface-elevated p-2 rounded">
        {activeTab === 'new' ? (
          <span>🎉 First-time customers (never ordered before)</span>
        ) : (
          <span>🔄 Customers who returned after 3+ months of inactivity</span>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {currentData.length === 0 ? (
          <div className="text-center text-foreground-muted py-4">
            {activeTab === 'new'
              ? 'No new customers this period'
              : 'No returning customers this period'
            }
          </div>
        ) : activeTab === 'new' ? (
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
                <div className="font-mono text-sm text-success">
                  {formatNumber(customer.first_month_units)}
                </div>
                <div className="text-xs text-foreground-muted">units</div>
              </div>
            </div>
          ))
        ) : (
          returningData.map((customer) => (
            <div
              key={customer.del_account}
              className="flex items-center justify-between py-2 px-3 bg-surface-elevated rounded-lg hover:bg-border transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm">
                  {truncate(customer.customer_name, 25)}
                </div>
                <div className="text-xs text-foreground-muted">
                  {customer.delivery_city || customer.delivery_postcode || 'No location'}
                </div>
                <div className="text-xs text-info mt-1">
                  Last order: {formatMonth(customer.last_order_month)} ({customer.months_since_last_order} months ago)
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-info">
                  {formatNumber(customer.current_month_units)}
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
