'use client'

import useSWR from 'swr'
import {
  getMonthlySummary,
  getPreviousMonthSummary,
  getNewCustomers,
  getReturningCustomers,
  getNewCustomersRecent,
  getLapsedCustomers,
  getAtRiskCustomers,
  getTopCustomers,
  getTopProducts,
  getBrandFamilyTrend,
  getFormatMix,
  getGapAnalysisFormat,
  getGapAnalysisBrand,
  getMonthlyBreakdown,
  getRawShipments,
  getAllCustomersWithLastOrder,
} from '@/lib/queries'
import { calculateDelta, getBrandColor, BRAND_COLORS } from '@/lib/utils'
import type { FilterState, KPIData, TrendDataPoint, BrandDistribution } from '@/types'

export function useDashboardData(filters: FilterState) {
  const months = filters.reportMonth

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

  // New customers this month (only for single month selection)
  const { data: newCustomers = [], isLoading: newCustomersLoading } = useSWR(
    months.length === 1 ? ['new-customers', months[0]] : null,
    () => months.length === 1 ? getNewCustomers(months[0], 20) : Promise.resolve([])
  )

  // Returning customers this month (only for single month selection)
  const { data: returningCustomers = [], isLoading: returningCustomersLoading } = useSWR(
    months.length === 1 ? ['returning-customers', months[0]] : null,
    () => months.length === 1 ? getReturningCustomers(months[0], 20) : Promise.resolve([])
  )

  // New customers in last 2 months (relative to selected month or latest)
  const { data: newCustomersRecent = [], isLoading: newCustomersRecentLoading } = useSWR(
    months.length === 1 ? ['new-customers-recent', months[0]] : 'new-customers-recent',
    () => getNewCustomersRecent(2, 20, months.length === 1 ? months[0] : undefined)
  )

  // Lapsed customers (ordered last month but not this month)
  const { data: lapsedCustomers = [], isLoading: lapsedCustomersLoading } = useSWR(
    months.length === 1 ? ['lapsed-customers', months[0]] : null,
    () => months.length === 1 ? getLapsedCustomers(months[0], 20) : Promise.resolve([])
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

  // Monthly breakdown for brand distribution (works for single or multi-month)
  const { data: monthlyBreakdown = [] } = useSWR(
    months.length > 0 ? ['monthly-breakdown', months, filters] : null,
    () => months.length > 0 ? getMonthlyBreakdown(months, filters) : Promise.resolve([])
  )

  // Raw shipments data
  const { data: rawShipments = [], isLoading: rawLoading } = useSWR(
    ['raw-shipments', filters],
    () => getRawShipments(filters, 2000)
  )

  // All customers with last order date
  const { data: allCustomers = [], isLoading: allCustomersLoading } = useSWR(
    ['all-customers', filters],
    () => getAllCustomersWithLastOrder(filters)
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
    isReturningCustomersLoading: returningCustomersLoading,
    isNewCustomersRecentLoading: newCustomersRecentLoading,
    isLapsedCustomersLoading: lapsedCustomersLoading,
    isAtRiskLoading: atRiskLoading,
    isTopCustomersLoading: topCustomersLoading,
    isTopProductsLoading: topProductsLoading,
    isTrendLoading: trendLoading,

    // Data
    kpiData,
    newCustomers,
    returningCustomers,
    newCustomersRecent,
    lapsedCustomers,
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
    allCustomers,

    // Metadata
    currentMonth: months.length === 1 ? months[0] : months.length > 0 ? `${months.length} months` : null,
    mappingCoverage: currentSummary?.mapping_coverage_pct || 0,
    isRawLoading: rawLoading,
    isAllCustomersLoading: allCustomersLoading,
  }
}
