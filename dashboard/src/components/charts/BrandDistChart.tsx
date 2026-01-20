'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import type { BrandDistribution } from '@/types'

interface BrandDistChartProps {
  data: BrandDistribution[]
  loading?: boolean
}

export function BrandDistChart({ data, loading = false }: BrandDistChartProps) {
  if (loading) {
    return (
      <div className="card h-[300px] flex items-center justify-center">
        <div className="text-foreground-muted">Loading chart...</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="card h-[300px] flex items-center justify-center">
        <div className="text-foreground-muted">No data available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="card-header">Brand Distribution</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(238, 238, 238, 0.1)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(value) => formatNumber(value)}
              stroke="rgba(238, 238, 238, 0.45)"
              tick={{ fill: 'rgba(238, 238, 238, 0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(238, 238, 238, 0.1)' }}
            />
            <YAxis
              type="category"
              dataKey="brand_family"
              stroke="rgba(238, 238, 238, 0.45)"
              tick={{ fill: 'rgba(238, 238, 238, 0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(238, 238, 238, 0.1)' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2A2A2A',
                border: '1px solid rgba(238, 238, 238, 0.1)',
                borderRadius: '8px',
                color: '#EEEEEE',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${formatNumber(value)} units (${formatPercent(props.payload.percentage)})`,
                'Volume',
              ]}
            />
            <Bar dataKey="total_units" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
