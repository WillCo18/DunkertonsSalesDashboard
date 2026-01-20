import { supabase } from './supabase'
import type {
  MonthlySummary,
  NewCustomer,
  AtRiskCustomer,
  TopCustomer,
  TopProduct,
  BrandFamilyTrend,
  GapAnalysisFormat,
  GapAnalysisBrand,
  FilterState,
  Shipment,
} from '@/types'

// Get available months for filter dropdown
export async function getAvailableMonths(): Promise<string[]> {
  const { data, error } = await supabase
    .from('fact_shipments')
    .select('report_month')
    .order('report_month', { ascending: false })

  if (error) {
    console.error('getAvailableMonths Error:', error)
    throw error
  }

  // Deduplicate months
  const months = [...new Set(data?.map((d) => d.report_month) || [])]
  return months
}

// Get monthly summary KPIs (reactive to filters)
export async function getMonthlySummary(
  filters: Partial<FilterState>
): Promise<MonthlySummary | null> {
  const months = filters.reportMonth || []

  // If we have filters (beyond just month), we calculate from fact_shipments directly
  // to ensure reactivity (pivoting)
  const hasExtraFilters =
    (filters.brandFamily && filters.brandFamily.length > 0) ||
    (filters.salesperson && filters.salesperson.length > 0) ||
    filters.customer !== null ||
    (filters.packFormat && filters.packFormat.length > 0)

  if (hasExtraFilters || months.length > 0) {
    // If filtering by pack format, first get the product codes from dim_product_internal
    let productCodes: string[] | null = null
    if (filters.packFormat?.length) {
      const { data: products } = await supabase
        .from('dim_product_internal')
        .select('product_code')
        .in('pack_format', filters.packFormat)
        .eq('is_active', true)

      productCodes = products?.map(p => p.product_code) || []
      if (productCodes.length === 0) return null // No products match this format
    }

    let query = supabase
      .from('fact_shipments')
      .select('del_account, source_sku, internal_product_code, quantity, salesperson, detected_family, detected_format')

    // Multi-month support: use .in() if months selected, otherwise get all
    if (months.length > 0) {
      query = query.in('report_month', months)
    }

    if (filters.brandFamily?.length) {
      query = query.in('detected_family', filters.brandFamily)
    }

    // Use product codes for pack format filtering instead of detected_format
    if (productCodes) {
      query = query.in('internal_product_code', productCodes)
    }

    if (filters.salesperson?.length) query = query.in('salesperson', filters.salesperson)
    if (filters.customer) query = query.eq('del_account', filters.customer)

    const { data, error } = await query

    if (error) {
      console.error('getMonthlySummary (ExtraFilters) Error:', error)
      throw error
    }
    if (!data || data.length === 0) return null

    const uniqueCustomers = new Set(data.map(d => d.del_account)).size
    const uniqueSkus = new Set(data.map(d => d.source_sku)).size
    const uniqueInternal = new Set(data.filter(d => d.internal_product_code).map(d => d.internal_product_code)).size
    const totalUnits = data.reduce((sum, d) => sum + Number(d.quantity), 0)
    const mappedUnits = data.filter(d => d.internal_product_code).reduce((sum, d) => sum + Number(d.quantity), 0)
    const mappingCoverage = totalUnits > 0 ? (mappedUnits / totalUnits) * 100 : 0

    // Format month display
    const monthDisplay = months.length === 0
      ? 'All Months'
      : months.length === 1
        ? months[0]
        : `${months.length} Months Selected`

    return {
      report_month: monthDisplay,
      active_customers: uniqueCustomers,
      unique_skus: uniqueSkus,
      unique_internal_products: uniqueInternal,
      total_units: totalUnits,
      mapped_units: mappedUnits,
      mapping_coverage_pct: Number(mappingCoverage.toFixed(2))
    }
  }

  // Otherwise use the pre-calculated view for performance/default state
  // When no months selected, aggregate all months
  if (months.length === 0) {
    // Get all-time aggregate
    const { data, error } = await supabase
      .from('fact_shipments')
      .select('del_account, source_sku, internal_product_code, quantity')

    if (error) throw error
    if (!data || data.length === 0) return null

    const uniqueCustomers = new Set(data.map(d => d.del_account)).size
    const uniqueSkus = new Set(data.map(d => d.source_sku)).size
    const uniqueInternal = new Set(data.filter(d => d.internal_product_code).map(d => d.internal_product_code)).size
    const totalUnits = data.reduce((sum, d) => sum + Number(d.quantity), 0)
    const mappedUnits = data.filter(d => d.internal_product_code).reduce((sum, d) => sum + Number(d.quantity), 0)
    const mappingCoverage = totalUnits > 0 ? (mappedUnits / totalUnits) * 100 : 0

    return {
      report_month: 'All Months',
      active_customers: uniqueCustomers,
      unique_skus: uniqueSkus,
      unique_internal_products: uniqueInternal,
      total_units: totalUnits,
      mapped_units: mappedUnits,
      mapping_coverage_pct: Number(mappingCoverage.toFixed(2))
    }
  }

  // Single or multiple months selected - aggregate them
  const { data, error } = await supabase
    .from('fact_shipments')
    .select('del_account, source_sku, internal_product_code, quantity')
    .in('report_month', months)

  if (error) throw error
  if (!data || data.length === 0) return null

  const uniqueCustomers = new Set(data.map(d => d.del_account)).size
  const uniqueSkus = new Set(data.map(d => d.source_sku)).size
  const uniqueInternal = new Set(data.filter(d => d.internal_product_code).map(d => d.internal_product_code)).size
  const totalUnits = data.reduce((sum, d) => sum + Number(d.quantity), 0)
  const mappedUnits = data.filter(d => d.internal_product_code).reduce((sum, d) => sum + Number(d.quantity), 0)
  const mappingCoverage = totalUnits > 0 ? (mappedUnits / totalUnits) * 100 : 0

  const monthDisplay = months.length === 1 ? months[0] : `${months.length} Months Selected`

  return {
    report_month: monthDisplay,
    active_customers: uniqueCustomers,
    unique_skus: uniqueSkus,
    unique_internal_products: uniqueInternal,
    total_units: totalUnits,
    mapped_units: mappedUnits,
    mapping_coverage_pct: Number(mappingCoverage.toFixed(2))
  }
}

// Get previous month summary for delta calculations
// Note: Delta calculations only work for single-month selections
export async function getPreviousMonthSummary(
  filters: Partial<FilterState>
): Promise<MonthlySummary | null> {
  const months = filters.reportMonth || []

  // Only calculate delta for single month selection
  if (months.length !== 1) return null

  const currentDate = new Date(months[0])
  currentDate.setMonth(currentDate.getMonth() - 1)
  const prevMonth = currentDate.toISOString().slice(0, 10)

  return getMonthlySummary({ ...filters, reportMonth: [prevMonth] })
}

// Get new customers for a specific month
// Get new customers for a specific month
// New = ordered in this month AND never ordered before
export async function getNewCustomers(
  month: string,
  limit = 100
): Promise<NewCustomer[]> {
  // Step 1: Get all customers who ordered THIS month
  const { data: currentMonthCustomers } = await supabase
    .from('fact_shipments')
    .select('del_account, quantity')
    .eq('report_month', month)

  if (!currentMonthCustomers || currentMonthCustomers.length === 0) return []

  // Aggregate units for current month
  const currentMonthUnits: Record<string, number> = {}
  for (const row of currentMonthCustomers) {
    currentMonthUnits[row.del_account] = (currentMonthUnits[row.del_account] || 0) + row.quantity
  }

  const currentMonthAccounts = Object.keys(currentMonthUnits)

  // Step 2: Check which of these customers ordered in ANY previous month
  const { data: previousOrders } = await supabase
    .from('fact_shipments')
    .select('del_account')
    .in('del_account', currentMonthAccounts)
    .lt('report_month', month)

  const previousCustomerAccounts = new Set(previousOrders?.map(r => r.del_account) || [])

  // Step 3: Filter to only customers who have NO previous orders (truly new)
  const newCustomerAccounts = currentMonthAccounts.filter(acc => !previousCustomerAccounts.has(acc))

  if (newCustomerAccounts.length === 0) return []

  // Step 4: Get customer details
  const { data: customers } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name, delivery_city, delivery_postcode')
    .in('del_account', newCustomerAccounts)

  // Build result
  const result: NewCustomer[] = (customers || []).map(customer => ({
    del_account: customer.del_account,
    customer_name: customer.customer_name,
    delivery_city: customer.delivery_city,
    delivery_postcode: customer.delivery_postcode,
    first_order_month: month,
    first_month_units: currentMonthUnits[customer.del_account]
  }))

  return result
    .sort((a, b) => b.first_month_units - a.first_month_units)
    .slice(0, limit)
}

// Get new customers from last N months (relative to selected month or latest month)
export async function getNewCustomersRecent(
  months: number = 2,
  limit = 100,
  currentMonth?: string
): Promise<NewCustomer[]> {
  // Determine the reference month (selected month or latest month in data)
  let referenceMonth: string

  if (currentMonth) {
    referenceMonth = currentMonth
  } else {
    const { data: monthsData } = await supabase
      .from('fact_shipments')
      .select('report_month')
      .order('report_month', { ascending: false })
      .limit(1)

    if (!monthsData || monthsData.length === 0) return []
    referenceMonth = monthsData[0].report_month
  }

  // Calculate the cutoff date (N months before reference month)
  const referenceDate = new Date(referenceMonth)
  const cutoffDate = new Date(referenceDate)
  cutoffDate.setMonth(cutoffDate.getMonth() - months + 1) // +1 to include the current month
  const cutoff = cutoffDate.toISOString().slice(0, 10)

  // Get all customers who ordered in the last N months (including reference month)
  const { data: recentCustomers } = await supabase
    .from('fact_shipments')
    .select('del_account, report_month, quantity')
    .gte('report_month', cutoff)
    .lte('report_month', referenceMonth)

  if (!recentCustomers || recentCustomers.length === 0) return []

  // Group by customer and find their first order month in this period
  const customerFirstOrders: Record<string, { firstMonth: string; units: number }> = {}

  for (const row of recentCustomers) {
    if (!customerFirstOrders[row.del_account]) {
      customerFirstOrders[row.del_account] = {
        firstMonth: row.report_month,
        units: 0
      }
    }
    // Track earliest month
    if (row.report_month < customerFirstOrders[row.del_account].firstMonth) {
      customerFirstOrders[row.del_account].firstMonth = row.report_month
    }
    // Sum units from first month only
    if (row.report_month === customerFirstOrders[row.del_account].firstMonth) {
      customerFirstOrders[row.del_account].units += row.quantity
    }
  }

  const customerAccounts = Object.keys(customerFirstOrders)

  // Check which customers ordered BEFORE the cutoff (not truly new)
  const { data: previousOrders } = await supabase
    .from('fact_shipments')
    .select('del_account')
    .in('del_account', customerAccounts)
    .lt('report_month', cutoff)

  const previousCustomerAccounts = new Set(previousOrders?.map(r => r.del_account) || [])

  // Filter to only truly new customers (no orders before cutoff)
  const newCustomerAccounts = customerAccounts.filter(acc => !previousCustomerAccounts.has(acc))

  if (newCustomerAccounts.length === 0) return []

  // Get customer details
  const { data: customers } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name, delivery_city, delivery_postcode')
    .in('del_account', newCustomerAccounts)

  // Build result
  const result: NewCustomer[] = (customers || []).map(customer => ({
    del_account: customer.del_account,
    customer_name: customer.customer_name,
    delivery_city: customer.delivery_city,
    delivery_postcode: customer.delivery_postcode,
    first_order_month: customerFirstOrders[customer.del_account].firstMonth,
    first_month_units: customerFirstOrders[customer.del_account].units
  }))

  return result
    .sort((a, b) => b.first_month_units - a.first_month_units)
    .slice(0, limit)
}

// Get returning customers for a specific month
// Returning = ordered this month, but NOT in last 3 months, but DID order before that
export async function getReturningCustomers(
  month: string,
  limit = 100
): Promise<Array<{
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  current_month_units: number
  last_order_month: string
  months_since_last_order: number
}>> {
  // Calculate the 3-month lookback window
  const currentDate = new Date(month)
  const threeMonthsAgo = new Date(currentDate)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const lookbackStart = threeMonthsAgo.toISOString().slice(0, 10)

  // Step 1: Get customers who ordered THIS month
  const { data: currentMonthCustomers } = await supabase
    .from('fact_shipments')
    .select('del_account, quantity')
    .eq('report_month', month)

  if (!currentMonthCustomers || currentMonthCustomers.length === 0) return []

  // Aggregate units for current month
  const currentMonthUnits: Record<string, number> = {}
  for (const row of currentMonthCustomers) {
    currentMonthUnits[row.del_account] = (currentMonthUnits[row.del_account] || 0) + row.quantity
  }

  const currentMonthAccounts = Object.keys(currentMonthUnits)

  // Step 2: Get customers who ordered in the LAST 3 MONTHS (excluding current month)
  const { data: recentCustomers } = await supabase
    .from('fact_shipments')
    .select('del_account')
    .in('del_account', currentMonthAccounts)
    .gte('report_month', lookbackStart)
    .lt('report_month', month)

  const recentAccounts = new Set(recentCustomers?.map(r => r.del_account) || [])

  // Step 3: Filter to customers who ordered THIS month but NOT in last 3 months
  const potentialReturningAccounts = currentMonthAccounts.filter(acc => !recentAccounts.has(acc))

  if (potentialReturningAccounts.length === 0) return []

  // Step 4: Get their order history to find last order date and confirm they ordered BEFORE the 3-month window
  const { data: orderHistory } = await supabase
    .from('fact_shipments')
    .select('del_account, report_month')
    .in('del_account', potentialReturningAccounts)
    .lt('report_month', lookbackStart)
    .order('report_month', { ascending: false })

  // Group by account to find last order before the 3-month window
  const lastOrders: Record<string, string> = {}
  for (const row of orderHistory || []) {
    if (!lastOrders[row.del_account]) {
      lastOrders[row.del_account] = row.report_month
    }
  }

  // Filter to only accounts that have a previous order (true returning customers)
  const returningAccounts = potentialReturningAccounts.filter(acc => lastOrders[acc])

  if (returningAccounts.length === 0) return []

  // Step 5: Get customer details
  const { data: customers } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name, delivery_city, delivery_postcode')
    .in('del_account', returningAccounts)

  // Build result
  const result = (customers || []).map(customer => {
    const lastOrderMonth = lastOrders[customer.del_account]
    const lastOrderDate = new Date(lastOrderMonth)
    const currentMonthDate = new Date(month)
    const monthsDiff = (currentMonthDate.getFullYear() - lastOrderDate.getFullYear()) * 12 +
      (currentMonthDate.getMonth() - lastOrderDate.getMonth())

    return {
      del_account: customer.del_account,
      customer_name: customer.customer_name,
      delivery_city: customer.delivery_city,
      delivery_postcode: customer.delivery_postcode,
      current_month_units: currentMonthUnits[customer.del_account],
      last_order_month: lastOrderMonth,
      months_since_last_order: monthsDiff
    }
  })

  return result
    .sort((a, b) => b.current_month_units - a.current_month_units)
    .slice(0, limit)
}

// Get at-risk customers
export async function getAtRiskCustomers(limit = 20): Promise<AtRiskCustomer[]> {
  const { data, error } = await supabase
    .from('v_at_risk_customers')
    .select('*')
    .order('total_units_all_time', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get top customers
// Get top customers
export async function getTopCustomers(
  filters?: Partial<FilterState>,
  limit = 20
): Promise<TopCustomer[]> {
  const hasFilters =
    filters?.reportMonth ||
    (filters?.brandFamily && filters.brandFamily.length > 0) ||
    (filters?.packFormat && filters.packFormat.length > 0) ||
    (filters?.salesperson && filters.salesperson.length > 0)

  // If filtered, we mustaggregate from raw data
  if (hasFilters) {
    let query = supabase
      .from('fact_shipments')
      .select('del_account, customer_name, delivery_city, delivery_postcode, quantity, detected_family, detected_format, salesperson, internal_product_code')

    if (filters?.reportMonth && filters.reportMonth.length > 0) query = query.in('report_month', filters.reportMonth)

    // For brand/format, we should filter by internal_product_code if available to match the "Truth" 
    // from dim_product_internal, especially since detected_family might be inaccurate for Mulled etc.
    let productCodesToFilter: string[] | null = null

    if ((filters?.brandFamily?.length || 0) > 0 || (filters?.packFormat?.length || 0) > 0) {
      // Fetch relevant product codes first
      let prodQuery = supabase.from('dim_product_internal').select('internal_product_code')
      if (filters?.brandFamily?.length) prodQuery = prodQuery.in('brand_family', filters.brandFamily)
      if (filters?.packFormat?.length) prodQuery = prodQuery.in('pack_format', filters.packFormat)

      const { data: prodData } = await prodQuery
      if (prodData) {
        productCodesToFilter = prodData.map(p => p.internal_product_code)
      }
    }

    // Apply filters
    if (productCodesToFilter) {
      query = query.in('internal_product_code', productCodesToFilter)
    } else {
      // Fallback to detected columns if no product codes found (or filter was empty)
      if (filters?.brandFamily?.length) query = query.in('detected_family', filters.brandFamily)
      if (filters?.packFormat?.length) query = query.in('detected_format', filters.packFormat)
    }

    if (filters?.salesperson?.length) query = query.in('salesperson', filters.salesperson)

    const { data, error } = await query

    if (error) throw error
    if (!data) return []

    // Aggregate in Client (simplest for now without new RPC)
    const agg: Record<string, TopCustomer> = {}

    for (const row of data) {
      if (!agg[row.del_account]) {
        agg[row.del_account] = {
          del_account: row.del_account,
          customer_name: row.customer_name,
          delivery_city: row.delivery_city,
          delivery_postcode: row.delivery_postcode,
          total_units: 0,
          months_active: 1, // Approximation for dynamic view
          avg_units_per_order: 0,
          last_order_month: filters?.reportMonth && filters.reportMonth.length > 0 ? filters.reportMonth[filters.reportMonth.length - 1] : '-',
          first_order_month: filters?.reportMonth && filters.reportMonth.length > 0 ? filters.reportMonth[0] : '-'
        }
      }
      agg[row.del_account].total_units += Number(row.quantity)
    }

    return Object.values(agg)
      .sort((a, b) => b.total_units - a.total_units)
      .slice(0, limit)
  }

  // Fallback to static view for performance
  const { data, error } = await supabase
    .from('v_top_customers')
    .select('*')
    .order('total_units', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get top products
export async function getTopProducts(
  filters?: Partial<FilterState>,
  limit = 20
): Promise<TopProduct[]> {
  // If month filter is active, aggregate dynamically from fact_shipments
  if (filters?.reportMonth) {
    let query = supabase
      .from('fact_shipments')
      .select('internal_product_code, source_description, detected_family, detected_format, quantity')
      .in('report_month', filters.reportMonth)
      .not('internal_product_code', 'is', null)

    if (filters?.brandFamily?.length) query = query.in('detected_family', filters.brandFamily)
    if (filters?.packFormat?.length) query = query.in('detected_format', filters.packFormat)

    const { data, error } = await query

    if (error) throw error
    if (!data) return []

    // Aggregate by product
    const agg: Record<string, TopProduct> = {}
    for (const row of data) {
      const code = row.internal_product_code!
      if (!agg[code]) {
        agg[code] = {
          product_code: code,
          product_name: row.source_description,
          brand_family: row.detected_family || 'Unknown',
          pack_format: row.detected_format || 'Unknown',
          category: null,
          total_units: 0,
          customer_count: 0, // Approximation for month view
          months_with_sales: 1
        }
      }
      agg[code].total_units += Number(row.quantity)
    }

    return Object.values(agg)
      .sort((a, b) => b.total_units - a.total_units)
      .slice(0, limit)
  }

  // Otherwise use pre-aggregated view for all-time data
  let query = supabase
    .from('v_top_products')
    .select('*')
    .order('total_units', { ascending: false })
    .limit(limit)

  if (filters?.brandFamily && filters.brandFamily.length > 0) {
    query = query.in('brand_family', filters.brandFamily)
  }

  if (filters?.packFormat && filters.packFormat.length > 0) {
    query = query.in('pack_format', filters.packFormat)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get brand family trend data for charts
export async function getBrandFamilyTrend(): Promise<BrandFamilyTrend[]> {
  const { data, error } = await supabase
    .from('v_brand_family_trend')
    .select('*')
    .order('report_month', { ascending: true })

  if (error) throw error
  return data || []
}

// Get format mix data
export async function getFormatMix(
  filters?: Partial<FilterState>
): Promise<Array<{ format: string; units: number }>> {
  let query = supabase
    .from('fact_shipments')
    .select('detected_format, quantity')
    .not('detected_format', 'is', null)

  if (filters?.reportMonth && filters.reportMonth.length > 0) {
    query = query.in('report_month', filters.reportMonth)
  }

  if (filters?.brandFamily?.length) {
    query = query.in('detected_family', filters.brandFamily)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data) return []

  // Aggregate by format
  const agg: Record<string, number> = {}
  for (const row of data) {
    const format = row.detected_format || 'Unknown'
    agg[format] = (agg[format] || 0) + Number(row.quantity)
  }

  return Object.entries(agg).map(([format, units]) => ({ format, units }))
}

// Get gap analysis - format
export async function getGapAnalysisFormat(limit = 20): Promise<GapAnalysisFormat[]> {
  const { data, error } = await supabase
    .from('v_gap_analysis_format')
    .select('*')
    .order('total_units', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get gap analysis - brand
export async function getGapAnalysisBrand(limit = 20): Promise<GapAnalysisBrand[]> {
  const { data, error } = await supabase
    .from('v_gap_analysis_brand')
    .select('*')
    .order('total_units', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Enhanced gap analysis - find customers stocking or not stocking specific products
export async function getEnhancedGapAnalysis(params: {
  brandFamily: string
  packFormat?: string
  salesperson?: string
  showStocked: boolean
  reportMonth?: string[] // Changed to array for multi-month support
}): Promise<Array<{
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  salesperson: string | null
  total_units: number
}>> {
  const { brandFamily, packFormat, salesperson, showStocked, reportMonth } = params

  // Step 1: Get product codes for the specified brand/format from dim_product_internal
  let productQuery = supabase
    .from('dim_product_internal')
    .select('product_code')
    .eq('brand_family', brandFamily)
    .eq('is_active', true)

  if (packFormat) {
    productQuery = productQuery.eq('pack_format', packFormat)
  }

  const { data: products } = await productQuery
  const productCodes = products?.map(p => p.product_code) || []

  // Step 2: Get all active customers (from shipments in the selected period)
  let activeCustomersQuery = supabase
    .from('fact_shipments')
    .select('del_account')

  if (reportMonth && reportMonth.length > 0) {
    activeCustomersQuery = activeCustomersQuery.in('report_month', reportMonth)
  }

  const { data: activeShipments } = await activeCustomersQuery
  const activeCustomerIds = [...new Set(activeShipments?.map(s => s.del_account) || [])]

  if (activeCustomerIds.length === 0) return []

  // Get customer details
  const { data: allCustomers } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name, delivery_city, delivery_postcode')
    .in('del_account', activeCustomerIds)

  if (!allCustomers) return []

  // Step 3: Get customers who HAVE bought these products in the selected period
  // Use BOTH product codes (mapped) AND detected_family (unmapped) to catch all products
  let shipmentQuery = supabase
    .from('fact_shipments')
    .select('del_account, salesperson, quantity, internal_product_code, detected_family, detected_format')

  if (reportMonth && reportMonth.length > 0) {
    shipmentQuery = shipmentQuery.in('report_month', reportMonth)
  }

  if (salesperson) {
    shipmentQuery = shipmentQuery.eq('salesperson', salesperson)
  }

  const { data: allShipments } = await shipmentQuery

  // Filter shipments to match our criteria
  const matchingShipments = allShipments?.filter(s => {
    // Match by product code (mapped products)
    if (s.internal_product_code && productCodes.includes(s.internal_product_code)) {
      return true
    }
    // Match by detected_family (unmapped products)
    if (s.detected_family === brandFamily) {
      // If format filter is specified, check detected_format
      if (packFormat) {
        return s.detected_format === packFormat
      }
      return true
    }
    return false
  }) || []

  // Aggregate by customer
  const customerPurchases: Record<string, { total_units: number; salesperson: string | null }> = {}

  matchingShipments.forEach(s => {
    if (!customerPurchases[s.del_account]) {
      customerPurchases[s.del_account] = { total_units: 0, salesperson: s.salesperson }
    }
    customerPurchases[s.del_account].total_units += Number(s.quantity)
  })

  const stockingCustomers = new Set(Object.keys(customerPurchases))

  // Step 4: Return either stocking or not-stocking customers
  if (showStocked) {
    // Return customers WHO ARE stocking
    return allCustomers
      .filter(c => stockingCustomers.has(c.del_account))
      .map(c => ({
        ...c,
        salesperson: customerPurchases[c.del_account].salesperson,
        total_units: customerPurchases[c.del_account].total_units
      }))
      .sort((a, b) => b.total_units - a.total_units)
  } else {
    // Return customers WHO ARE NOT stocking (gaps)
    // Get their total purchase volume for context in the selected period
    let allShipmentsQuery = supabase
      .from('fact_shipments')
      .select('del_account, quantity, salesperson')

    if (reportMonth && reportMonth.length > 0) {
      allShipmentsQuery = allShipmentsQuery.in('report_month', reportMonth)
    }

    const { data: totalShipments } = await allShipmentsQuery

    const totalPurchases: Record<string, { total_units: number; salesperson: string | null }> = {}
    totalShipments?.forEach(s => {
      if (!totalPurchases[s.del_account]) {
        totalPurchases[s.del_account] = { total_units: 0, salesperson: s.salesperson }
      }
      totalPurchases[s.del_account].total_units += Number(s.quantity)
    })

    return allCustomers
      .filter(c => !stockingCustomers.has(c.del_account) && totalPurchases[c.del_account]) // Active customers not stocking this product
      .map(c => ({
        ...c,
        salesperson: totalPurchases[c.del_account]?.salesperson || null,
        total_units: totalPurchases[c.del_account]?.total_units || 0
      }))
      .filter(c => c.total_units > 0) // Only show customers who buy other products
      .sort((a, b) => b.total_units - a.total_units)
  }
}

// Cross-product gap analysis - find customers who stock X but not Y
export async function getCrossProductGapAnalysis(params: {
  stocksBrand: string
  stocksFormat?: string
  missingBrand: string
  missingFormat?: string
  salesperson?: string
  reportMonth?: string[] // Changed to array for multi-month support
}): Promise<Array<{
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  salesperson: string | null
  stocks_units: number
  missing_units: number
}>> {
  const { stocksBrand, stocksFormat, missingBrand, missingFormat, salesperson, reportMonth } = params

  // Step 1: Get product codes for both brands
  const stocksProductsQuery = supabase
    .from('dim_product_internal')
    .select('product_code')
    .eq('brand_family', stocksBrand)
    .eq('is_active', true)
    .then(res => stocksFormat ?
      supabase.from('dim_product_internal')
        .select('product_code')
        .eq('brand_family', stocksBrand)
        .eq('pack_format', stocksFormat)
        .eq('is_active', true)
      : res
    )

  const missingProductsQuery = supabase
    .from('dim_product_internal')
    .select('product_code')
    .eq('brand_family', missingBrand)
    .eq('is_active', true)
    .then(res => missingFormat ?
      supabase.from('dim_product_internal')
        .select('product_code')
        .eq('brand_family', missingBrand)
        .eq('pack_format', missingFormat)
        .eq('is_active', true)
      : res
    )

  const [stocksProductsRes, missingProductsRes] = await Promise.all([
    stocksProductsQuery,
    missingProductsQuery
  ])

  const stocksProductCodes = stocksProductsRes.data?.map(p => p.product_code) || []
  const missingProductCodes = missingProductsRes.data?.map(p => p.product_code) || []

  // Step 2: Get all shipments in the period
  let shipmentsQuery = supabase
    .from('fact_shipments')
    .select('del_account, salesperson, quantity, internal_product_code, detected_family, detected_format')

  if (reportMonth && reportMonth.length > 0) {
    shipmentsQuery = shipmentsQuery.in('report_month', reportMonth)
  }

  if (salesperson) {
    shipmentsQuery = shipmentsQuery.eq('salesperson', salesperson)
  }

  const { data: allShipments } = await shipmentsQuery

  if (!allShipments) return []

  // Step 3: Categorize shipments
  const customerStocks: Record<string, { units: number; salesperson: string | null }> = {}
  const customerMissing: Set<string> = new Set()

  allShipments.forEach(s => {
    // Check if this shipment is for the "stocks" product
    const isStocksProduct =
      (s.internal_product_code && stocksProductCodes.includes(s.internal_product_code)) ||
      (s.detected_family === stocksBrand && (!stocksFormat || s.detected_format === stocksFormat))

    // Check if this shipment is for the "missing" product
    const isMissingProduct =
      (s.internal_product_code && missingProductCodes.includes(s.internal_product_code)) ||
      (s.detected_family === missingBrand && (!missingFormat || s.detected_format === missingFormat))

    if (isStocksProduct) {
      if (!customerStocks[s.del_account]) {
        customerStocks[s.del_account] = { units: 0, salesperson: s.salesperson }
      }
      customerStocks[s.del_account].units += Number(s.quantity)
    }

    if (isMissingProduct) {
      customerMissing.add(s.del_account)
    }
  })

  // Step 4: Find customers who stock X but NOT Y
  const gapCustomerIds = Object.keys(customerStocks).filter(
    customerId => !customerMissing.has(customerId)
  )

  if (gapCustomerIds.length === 0) return []

  // Step 5: Get customer details
  const { data: customers } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name, delivery_city, delivery_postcode')
    .in('del_account', gapCustomerIds)

  if (!customers) return []

  return customers
    .map(c => ({
      ...c,
      salesperson: customerStocks[c.del_account].salesperson,
      stocks_units: customerStocks[c.del_account].units,
      missing_units: 0
    }))
    .sort((a, b) => b.stocks_units - a.stocks_units)
}

// Get filter options
export async function getFilterOptions() {
  const [brandFamiliesRes, packFormatsRes, salespeopleRes] = await Promise.all([
    supabase
      .from('dim_product_internal')
      .select('brand_family')
      .eq('is_active', true),
    supabase
      .from('dim_product_internal')
      .select('pack_format')
      .eq('is_active', true),
    supabase
      .from('fact_shipments')
      .select('salesperson')
      .not('salesperson', 'is', null)
  ])

  if (brandFamiliesRes.error) console.error('getFilterOptions [brand] Error:', brandFamiliesRes.error)
  if (packFormatsRes.error) console.error('getFilterOptions [format] Error:', packFormatsRes.error)
  if (salespeopleRes.error) console.error('getFilterOptions [sales] Error:', salespeopleRes.error)

  const brandFamilies = [...new Set(brandFamiliesRes.data?.map((d) => d.brand_family) || [])]
  const packFormats = [...new Set(packFormatsRes.data?.map((d) => d.pack_format) || [])]
  const salespeople = [...new Set(salespeopleRes.data?.map((d) => d.salesperson) || [])]

  return {
    brandFamilies: brandFamilies.sort(),
    packFormats: packFormats.sort(),
    salespeople: salespeople.sort(),
  }
}

// Get shipments with filters (for data table and export)
export async function getShipments(
  filters: Partial<FilterState>,
  limit = 100
): Promise<Shipment[]> {
  let query = supabase.from('fact_shipments').select('*')

  if (filters.reportMonth) {
    query = query.eq('report_month', filters.reportMonth)
  }

  if (filters.brandFamily && filters.brandFamily.length > 0) {
    query = query.in('detected_family', filters.brandFamily)
  }

  if (filters.packFormat && filters.packFormat.length > 0) {
    query = query.in('detected_format', filters.packFormat)
  }

  if (filters.salesperson && filters.salesperson.length > 0) {
    query = query.in('salesperson', filters.salesperson)
  }

  if (filters.customer) {
    query = query.eq('del_account', filters.customer)
  }

  const { data, error } = await query
    .order('quantity', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get customer search results
export async function searchCustomers(
  searchTerm: string,
  limit = 10
): Promise<{ del_account: string; customer_name: string }[]> {
  const { data, error } = await supabase
    .from('dim_customer')
    .select('del_account, customer_name')
    .ilike('customer_name', `%${searchTerm}%`)
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get aggregated data for a specific month
// Get aggregated data for a specific month
export async function getMonthlyBreakdown(months: string | string[], filters: Partial<FilterState> = {}) {
  // Normalize to array
  const monthArray = Array.isArray(months) ? months : [months]

  let query = supabase
    .from('fact_shipments')
    .select('detected_family, quantity')

  // Use .in() for array support
  if (monthArray.length > 0) {
    query = query.in('report_month', monthArray)
  }

  if (filters.salesperson?.length) query = query.in('salesperson', filters.salesperson)
  if (filters.customer) query = query.eq('del_account', filters.customer)

  const { data: byBrand, error: brandError } = await query

  if (brandError) throw brandError

  // Aggregate by brand
  const brandTotals: Record<string, number> = {}
  for (const row of byBrand || []) {
    const family = row.detected_family || 'Unknown'
    brandTotals[family] = (brandTotals[family] || 0) + row.quantity
  }

  return Object.entries(brandTotals)
    .map(([brand_family, total_units]) => ({ brand_family, total_units }))
    .sort((a, b) => b.total_units - a.total_units)
}

// Get all shipments (raw data view)
export async function getRawShipments(
  filters: Partial<FilterState>,
  limit = 2000
): Promise<Shipment[]> {
  let query = supabase.from('fact_shipments').select('*')

  if (filters.reportMonth && filters.reportMonth.length > 0) {
    query = query.in('report_month', filters.reportMonth)
  }

  if (filters.brandFamily && filters.brandFamily.length > 0) {
    query = query.in('detected_family', filters.brandFamily)
  }

  if (filters.packFormat && filters.packFormat.length > 0) {
    query = query.in('detected_format', filters.packFormat)
  }

  if (filters.salesperson && filters.salesperson.length > 0) {
    query = query.in('salesperson', filters.salesperson)
  }

  if (filters.customer) {
    query = query.eq('del_account', filters.customer)
  }

  const { data, error } = await query
    .order('quantity', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as Shipment[]
}

// Custom Gap Analysis logic (Stocks Base but not Target)
export async function getCustomGapAnalysis(
  baseType: string,
  targetType: string,
  type: 'format' | 'brand' = 'format',
  limit = 50
) {
  const column = type === 'format' ? 'detected_format' : 'detected_family'

  // This is best done via raw SQL or a complex query
  // Since we are using Supabase JS client, we'll fetch aggregated data and filter in JS for flexibility
  // for small datasets like this. 

  const { data, error } = await supabase
    .from('fact_shipments')
    .select('del_account, customer_name, quantity, ' + column)

  if (error) throw error
  if (!data) return []

  // Aggregate by customer and type
  const customerStats: Record<string, { name: string; types: Set<string>; units: number }> = {}

  for (const row of (data as any[])) {
    const val = row[column] as string
    if (!customerStats[row.del_account]) {
      customerStats[row.del_account] = {
        name: row.customer_name,
        types: new Set(),
        units: 0
      }
    }
    customerStats[row.del_account].units += Number(row.quantity)
    if (val) customerStats[row.del_account].types.add(val)
  }

  // Apply logic: Has Base but Missing Target
  return Object.entries(customerStats)
    .filter(([_, stats]) => stats.types.has(baseType) && !stats.types.has(targetType))
    .map(([id, stats]) => ({
      del_account: id,
      customer_name: stats.name,
      total_units: stats.units,
      has_type: baseType,
      missing_type: targetType
    }))
    .sort((a, b) => b.total_units - a.total_units)
    .slice(0, limit)
}

