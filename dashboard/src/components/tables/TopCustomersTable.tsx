'use client'

import { formatNumber, formatMonth, truncate } from '@/lib/utils'
import type { TopCustomer } from '@/types'

interface TopCustomersTableProps {
  data: TopCustomer[]
  loading?: boolean
  limit?: number
}

export function TopCustomersTable({
  data,
  loading = false,
  limit = 10,
}: TopCustomersTableProps) {
  const displayData = data.slice(0, limit)

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-header">Top Customers</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="card-header">Top Customers</h3>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>City</th>
              <th className="text-right">Total Units</th>
              <th className="text-right">Months</th>
              <th className="text-right">Last Order</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((customer, idx) => (
              <tr key={customer.del_account} className="hover:bg-surface-elevated transition-colors">
                <td>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted font-mono w-5">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground">
                      {truncate(customer.customer_name, 30)}
                    </span>
                  </div>
                </td>
                <td className="text-foreground-secondary">
                  {customer.delivery_city || '-'}
                </td>
                <td className="text-right font-mono text-accent">
                  {formatNumber(customer.total_units)}
                </td>
                <td className="text-right text-foreground-secondary">
                  {customer.months_active}
                </td>
                <td className="text-right text-foreground-secondary">
                  {formatMonth(customer.last_order_month)}
                </td>
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-foreground-muted py-8">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
