'use client'

import { KPICard } from './KPICard'
import { FormatMixChart } from './FormatMixChart'
import type { KPIData } from '@/types'
import {
  Package,
  Users,
  UserPlus,
  AlertTriangle,
  Star,
} from 'lucide-react'

interface KPIDeckProps {
  data: KPIData | null
  loading?: boolean
  formatMix?: Array<{ format: string; units: number }>
  onNewCustomersClick?: () => void
  onAtRiskClick?: () => void
}

export function KPIDeck({
  data,
  loading = false,
  formatMix = [],
  onNewCustomersClick,
  onAtRiskClick
}: KPIDeckProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Units - NO delta */}
      <KPICard
        label="Total Units"
        value={data?.totalUnits || 0}
        icon={<Package className="w-4 h-4" />}
        loading={loading}
      />

      {/* Active Customers */}
      <KPICard
        label="Active Customers"
        value={data?.activeCustomers || 0}
        delta={data?.activeCustomersDelta}
        deltaLabel="vs prev"
        icon={<Users className="w-4 h-4" />}
        loading={loading}
      />

      {/* New Customers - Clickable */}
      <KPICard
        label="New Customers"
        value={data?.newCustomers || 0}
        icon={<UserPlus className="w-4 h-4" />}
        variant="success"
        loading={loading}
        onClick={onNewCustomersClick}
      />

      {/* At-Risk Customers - Clickable */}
      <KPICard
        label="At-Risk"
        value={data?.atRiskCustomers || 0}
        icon={<AlertTriangle className="w-4 h-4" />}
        variant={data?.atRiskCustomers && data.atRiskCustomers > 5 ? 'warning' : 'default'}
        loading={loading}
        onClick={onAtRiskClick}
      />

      {/* Format Mix - Replaces Top Brand */}
      <FormatMixChart data={formatMix} loading={loading} />

      {/* Top SKU */}
      <KPICard
        label="Top SKU"
        value={data?.topSku || '-'}
        format="text"
        icon={<Star className="w-4 h-4" />}
        loading={loading}
      />
    </div>
  )
}
