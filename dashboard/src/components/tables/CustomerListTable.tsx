'use client'

import { useState } from 'react'
import { formatMonth, truncate } from '@/lib/utils'
import type { CustomerListItem } from '@/types'

interface CustomerListTableProps {
  data: CustomerListItem[]
  loading?: boolean
  onRowClick?: (customerId: string) => void
}

export function CustomerListTable({
  data,
  loading = false,
  onRowClick,
}: CustomerListTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter data by search term
  const filteredData = searchTerm
    ? data.filter(c =>
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-header">All Customers</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="card-header mb-0">All Customers</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground-muted">
            {filteredData.length} {filteredData.length === 1 ? 'customer' : 'customers'}
          </span>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-foreground placeholder:text-foreground-muted"
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="data-table">
          <thead className="sticky top-0 bg-surface z-10">
            <tr>
              <th>Account Name</th>
              <th className="text-right">Last Order Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((customer) => (
              <tr
                key={customer.del_account}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-elevated' : ''}`}
                onClick={() => onRowClick?.(customer.del_account)}
              >
                <td>
                  <span className="font-medium text-foreground">
                    {truncate(customer.customer_name, 50)}
                  </span>
                </td>
                <td className="text-right text-foreground-secondary">
                  {formatMonth(customer.last_order_month)}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-foreground-muted py-8">
                  {searchTerm ? 'No customers match your search' : 'No customers found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
