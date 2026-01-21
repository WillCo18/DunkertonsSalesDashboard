'use client'

import { formatNumber, getBrandColor } from '@/lib/utils'
import type { TopProduct } from '@/types'

interface TopProductsTableProps {
  data: TopProduct[]
  loading?: boolean
  limit?: number
}

export function TopProductsTable({
  data,
  loading = false,
  limit = 10,
}: TopProductsTableProps) {
  const displayData = data.slice(0, limit)

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-header">Top Products</h3>
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
      <h3 className="card-header">Top Products</h3>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Format</th>
              <th className="text-right">Units</th>
              <th className="text-right">Customers</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((product, idx) => (
              <tr key={product.product_code} className="hover:bg-surface-elevated transition-colors">
                <td>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-foreground-muted font-mono w-5 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm leading-tight break-words">
                        {product.product_name}
                      </div>
                      <div className="text-xs text-foreground-muted font-mono mt-0.5">
                        {product.product_code}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${getBrandColor(product.brand_family)}20`,
                      color: getBrandColor(product.brand_family),
                    }}
                  >
                    {product.brand_family}
                  </span>
                </td>
                <td className="text-foreground-secondary text-sm">
                  {product.pack_format}
                </td>
                <td className="text-right font-mono text-accent">
                  {formatNumber(product.total_units)}
                </td>
                <td className="text-right text-foreground-secondary">
                  {product.customer_count}
                </td>
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-foreground-muted py-8">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
