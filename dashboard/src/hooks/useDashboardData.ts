'use client'

import useSWR from 'swr'
import {
  getMonthlySummary,
  getPreviousMonthSummary,
  getNewCustomers,
  getNewCustomersRecent,
  getAtRiskCustomers,
  getTopCustomers,
  getTopProducts,
  getBrandFamilyTrend,
  getFormatMix,
  getGapAnalysisFormat,
  getGapAnalysisBrand,
  getMonthlyBreakdown,
  getRawShipments,
} from '@/lib/queries'
import { calculateDelta, getBrandColor, BRAND_COLORS } from '@/lib/utils'
import type { FilterState, KPIData, TrendDataPoint, BrandDistribution } from '@/types'

export function useDashboardData(filters: FilterState) {
  const month = filters.reportMonth

  // Current month summary
  const { data: currentSummary, isLoading: summaryLoading } = useSWR(
    ['monthly-summary', filters],
    () => getMonthlySummary(filters)
  )

  // Previous month summary for deltas
  const { data: prevSummary } = useSWR(
    ['prev-monthly-summary', filters],
    () => getPreviousMonthSummary(filters)
  )

  // New customers this month
  const { data: newCustomers = [], isLoading: newCustomersLoading } = useSWR(
    month ? ['new-customers', month] : null,
    () => getNewCustomers(month!, 20)
  )

  // New customers in last 2 months
  const { data: newCustomersRecent = [], isLoading: newCustomersRecentLoading } = useSWR(
    'new-customers-recent',
    () => getNewCustomersRecent(2, 20)
  )

  // At-risk customers
  const { data: atRiskCustomers = [], isLoading: atRiskLoading } = useSWR(
    ['at-risk-customers', filters.salesperson],
    () => getAtRiskCustomers(100)
  )

  // Top customers
  const { data: topCustomers = [], isLoading: topCustomersLoading } = useSWR(
    ['top-customers', filters],
    () => getTopCustomers(filters, 20)
  )

  // Top products
  const { data: topProducts = [], isLoading: topProductsLoading } = useSWR(
    ['top-products', filters],
    () => getTopProducts(filters, 20)
  )

  // Brand family trend
  const { data: brandTrend = [], isLoading: trendLoading } = useSWR(
    'brand-trend',
    getBrandFamilyTrend
  )

  // Format mix
  const { data: formatMix = [] } = useSWR(
    ['format-mix', filters],
    () => getFormatMix(filters)
  )

  // Gap analysis
  const { data: gapFormat = [] } = useSWR(
    'gap-format',
    () => getGapAnalysisFormat(20)
  )

  const { data: gapBrand = [] } = useSWR(
    'gap-brand',
    () => getGapAnalysisBrand(20)
  )

  // Monthly breakdown for current month
  const { data: monthlyBreakdown = [] } = useSWR(
    month ? ['monthly-breakdown', month, filters] : null,
    () => getMonthlyBreakdown(month!, filters)
  )

  // Raw shipments data
  const { data: rawShipments = [], isLoading: rawLoading } = useSWR(
    ['raw-shipments', filters],
    () => getRawShipments(filters, 2000)
  )

  // Calculate KPIs
  const kpiData: KPIData | null = currentSummary
    ? {
      totalUnits: currentSummary.total_units,
      totalUnitsDelta: prevSummary
        ? calculateDelta(currentSummary.total_units, prevSummary.total_units)
        : 0,
      activeCustomers: currentSummary.active_customers,
      activeCustomersDelta: prevSummary
        ? calculateDelta(
          currentSummary.active_customers,
          prevSummary.active_customers
        )
        : 0,
      newCustomers: newCustomers.length,
      atRiskCustomers: atRiskCustomers.length,
      topBrandFamily: monthlyBreakdown[0]?.brand_family || '-',
      topBrandFamilyUnits: monthlyBreakdown[0]?.total_units || 0,
      topSku: topProducts[0]?.product_name || '-',
      topSkuUnits: topProducts[0]?.total_units || 0,
    }
    : null

  // Transform trend data for Recharts
  const trendData: TrendDataPoint[] = (() => {
    if (!brandTrend.length) return []

    // Group by month
    const monthMap = new Map<string, any>()

    for (const row of brandTrend) {
      if (!monthMap.has(row.report_month)) {
        monthMap.set(row.report_month, { month: row.report_month } as any)
      }
      monthMap.get(row.report_month)![row.brand_family] = row.total_units
    }

    return Array.from(monthMap.values()).sort(
      (a, b) => new Date(a.month as string).getTime() - new Date(b.month as string).getTime()
    )
  })()

  // Brand distribution for pie/bar chart
  const brandDistribution: BrandDistribution[] = monthlyBreakdown.map((item) => ({
    brand_family: item.brand_family,
    total_units: item.total_units,
    percentage:
      (item.total_units / monthlyBreakdown.reduce((sum, i) => sum + i.total_units, 0)) * 100,
    color: getBrandColor(item.brand_family),
  }))

  // Get all brand families for chart legend
  const brandFamilies = Object.keys(BRAND_COLORS).filter((b) => b !== 'Unknown')

  return {
    // Loading states
    isLoading: summaryLoading,
    isNewCustomersLoading: newCustomersLoading,
    isNewCustomersRecentLoading: newCustomersRecentLoading,
    isAtRiskLoading: atRiskLoading,
    isTopCustomersLoading: topCustomersLoading,
    isTopProductsLoading: topProductsLoading,
    isTrendLoading: trendLoading,

    // Data
    kpiData,
    newCustomers,
    newCustomersRecent,
    atRiskCustomers,
    topCustomers,
    topProducts,
    trendData,
    brandDistribution,
    brandFamilies,
    formatMix,
    gapFormat,
    gapBrand,
    rawShipments,

    // Metadata
    currentMonth: month,
    mappingCoverage: currentSummary?.mapping_coverage_pct || 0,
    isRawLoading: rawLoading,
  }
}
