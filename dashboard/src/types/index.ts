// Database types for Dunkerton Sales Dashboard

export interface Product {
  product_code: string
  product_name: string
  brand_family: string
  pack_format: string
  duoi: string | null
  category: string | null
  is_active: boolean
}

export interface Customer {
  del_account: string
  customer_name: string
  delivery_address: string | null
  delivery_city: string | null
  delivery_postcode: string | null
  latitude: number | null
  longitude: number | null
  region: string | null
  customer_type: string | null
  first_seen: string
  last_seen: string
  parent_account_id: string | null
  enrichment: {
    contacts?: Array<{
      name: string
      role?: string
      email?: string
      phone?: string
    }>
    socials?: {
      instagram_id?: string
    }
    tags?: string[]
    notes?: string
  } | null
}

export interface Shipment {
  line_key: string
  report_month: string
  del_account: string
  customer_name: string
  delivery_address: string | null
  delivery_city: string | null
  delivery_postcode: string | null
  source_sku: string
  source_description: string
  duoi: string | null
  internal_product_code: string | null
  quantity: number
  salesperson: string | null
  distributor: string
  detected_family: string | null
  detected_format: string | null
  detected_category: string | null
  mapping_method: string | null
  mapping_confidence: number | null
}

// View types
export interface MonthlySummary {
  report_month: string
  active_customers: number
  unique_skus: number
  unique_internal_products: number
  total_units: number
  mapped_units: number
  mapping_coverage_pct: number
}

export interface NewCustomer {
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  first_order_month: string
  first_month_units: number
}

export interface AtRiskCustomer {
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  last_order_month: string
  current_month: string
  months_since_last_order: number
  total_units_all_time: number
}

export interface TopCustomer {
  del_account: string
  customer_name: string
  delivery_city: string | null
  delivery_postcode: string | null
  months_active: number
  total_units: number
  avg_units_per_order: number
  last_order_month: string
  first_order_month: string
}

export interface TopProduct {
  product_code: string
  product_name: string
  brand_family: string
  pack_format: string
  category: string | null
  customer_count: number
  months_with_sales: number
  total_units: number
}

export interface BrandFamilyTrend {
  report_month: string
  brand_family: string
  total_units: number
  customer_count: number
}

export interface GapAnalysisFormat {
  del_account: string
  customer_name: string
  delivery_city: string | null
  formats_purchased: number
  total_units: number
  formats_bought: string
  formats_missing: string | null
}

export interface GapAnalysisBrand {
  del_account: string
  customer_name: string
  delivery_city: string | null
  brands_purchased: number
  total_units: number
  brands_bought: string
  brands_missing: string | null
}

// Dashboard filter state
export interface FilterState {
  reportMonth: string[] // Changed from string | null to string[] for multi-month support
  brandFamily: string[]
  packFormat: string[]
  salesperson: string[]
  customer: string | null
}

// KPI data
export interface KPIData {
  totalUnits: number
  totalUnitsDelta: number
  activeCustomers: number
  activeCustomersDelta: number
  newCustomers: number
  atRiskCustomers: number
  topBrandFamily: string
  topBrandFamilyUnits: number
  topSku: string
  topSkuUnits: number
}

// Chart data
export interface TrendDataPoint {
  month: string
  [brandFamily: string]: number | string
}

export interface BrandDistribution {
  brand_family: string
  total_units: number
  percentage: number
  color: string
}
export interface CustomGapOpportunity {
  del_account: string
  customer_name: string
  total_units: number
  has_type: string
  missing_type: string
}

export interface CustomerListItem {
  del_account: string
  customer_name: string
  last_order_month: string
}
