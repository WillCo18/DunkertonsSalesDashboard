'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { generateCSV, downloadCSV, formatMonth } from '@/lib/utils'
import type {
  NewCustomer,
  AtRiskCustomer,
  TopCustomer,
  TopProduct,
  GapAnalysisFormat,
  GapAnalysisBrand,
} from '@/types'

interface ExportPanelProps {
  currentMonth?: string
  newCustomers: NewCustomer[]
  atRiskCustomers: AtRiskCustomer[]
  topCustomers: TopCustomer[]
  topProducts: TopProduct[]
  gapFormat: GapAnalysisFormat[]
  gapBrand: GapAnalysisBrand[]
}

export function ExportPanel({
  currentMonth,
  newCustomers,
  atRiskCustomers,
  topCustomers,
  topProducts,
  gapFormat,
  gapBrand,
}: ExportPanelProps) {
  const monthSuffix = currentMonth ? `_${currentMonth.slice(0, 7)}` : ''

  const exports = [
    {
      label: 'New Customers',
      filename: `new_customers${monthSuffix}.csv`,
      count: newCustomers.length,
      onClick: () => {
        const csv = generateCSV(newCustomers, [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'delivery_city', label: 'City' },
          { key: 'delivery_postcode', label: 'Postcode' },
          { key: 'first_order_month', label: 'First Order' },
          { key: 'first_month_units', label: 'First Month Units' },
        ])
        downloadCSV(csv, `new_customers${monthSuffix}.csv`)
      },
    },
    {
      label: 'At-Risk Customers',
      filename: `at_risk_customers${monthSuffix}.csv`,
      count: atRiskCustomers.length,
      onClick: () => {
        const csv = generateCSV(atRiskCustomers, [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'delivery_city', label: 'City' },
          { key: 'delivery_postcode', label: 'Postcode' },
          { key: 'last_order_month', label: 'Last Order' },
          { key: 'months_since_last_order', label: 'Months Since' },
          { key: 'total_units_all_time', label: 'Total Units' },
        ])
        downloadCSV(csv, `at_risk_customers${monthSuffix}.csv`)
      },
    },
    {
      label: 'Top Customers',
      filename: `top_customers${monthSuffix}.csv`,
      count: topCustomers.length,
      onClick: () => {
        const csv = generateCSV(topCustomers, [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'delivery_city', label: 'City' },
          { key: 'delivery_postcode', label: 'Postcode' },
          { key: 'total_units', label: 'Total Units' },
          { key: 'months_active', label: 'Months Active' },
          { key: 'avg_units_per_order', label: 'Avg Units/Order' },
          { key: 'last_order_month', label: 'Last Order' },
        ])
        downloadCSV(csv, `top_customers${monthSuffix}.csv`)
      },
    },
    {
      label: 'Top Products',
      filename: `top_products${monthSuffix}.csv`,
      count: topProducts.length,
      onClick: () => {
        const csv = generateCSV(topProducts, [
          { key: 'product_code', label: 'Product Code' },
          { key: 'product_name', label: 'Product Name' },
          { key: 'brand_family', label: 'Brand Family' },
          { key: 'pack_format', label: 'Pack Format' },
          { key: 'total_units', label: 'Total Units' },
          { key: 'customer_count', label: 'Customers' },
        ])
        downloadCSV(csv, `top_products${monthSuffix}.csv`)
      },
    },
    {
      label: 'Format Gap Opportunities',
      filename: `gap_format${monthSuffix}.csv`,
      count: gapFormat.length,
      onClick: () => {
        const csv = generateCSV(gapFormat, [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'delivery_city', label: 'City' },
          { key: 'total_units', label: 'Total Units' },
          { key: 'formats_purchased', label: 'Formats Purchased' },
          { key: 'formats_bought', label: 'Formats Bought' },
          { key: 'formats_missing', label: 'Formats Missing' },
        ])
        downloadCSV(csv, `gap_format${monthSuffix}.csv`)
      },
    },
    {
      label: 'Brand Gap Opportunities',
      filename: `gap_brand${monthSuffix}.csv`,
      count: gapBrand.length,
      onClick: () => {
        const csv = generateCSV(gapBrand, [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'delivery_city', label: 'City' },
          { key: 'total_units', label: 'Total Units' },
          { key: 'brands_purchased', label: 'Brands Purchased' },
          { key: 'brands_bought', label: 'Brands Bought' },
          { key: 'brands_missing', label: 'Brands Missing' },
        ])
        downloadCSV(csv, `gap_brand${monthSuffix}.csv`)
      },
    },
  ]

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
          Export Data
        </h3>
      </div>

      <div className="space-y-2">
        {exports.map((exp) => (
          <button
            key={exp.filename}
            onClick={exp.onClick}
            disabled={exp.count === 0}
            className="w-full flex items-center justify-between py-2 px-3 bg-surface-elevated hover:bg-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm text-foreground">{exp.label}</span>
            </div>
            <span className="text-xs text-foreground-muted font-mono">
              {exp.count} rows
            </span>
          </button>
        ))}
      </div>

      {currentMonth && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-foreground-muted text-center">
            Data for {formatMonth(currentMonth)}
          </p>
        </div>
      )}
    </div>
  )
}
