'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatMonth, formatNumber, BRAND_COLORS } from '@/lib/utils'
import type { TrendDataPoint } from '@/types'

interface VolumeTrendChartProps {
  data: TrendDataPoint[]
  brandFamilies: string[]
  loading?: boolean
}

export function VolumeTrendChart({
  data,
  brandFamilies,
  loading = false,
}: VolumeTrendChartProps) {
  if (loading) {
    return (
      <div className="card h-[400px] flex items-center justify-center">
        <div className="text-foreground-muted">Loading chart...</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="card h-[400px] flex items-center justify-center">
        <div className="text-foreground-muted">No data available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="card-header">Volume Trend by Brand Family</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {brandFamilies.map((brand) => (
                <linearGradient
                  key={brand}
                  id={`gradient-${brand.replace(/\s/g, '')}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={BRAND_COLORS[brand] || BRAND_COLORS.Unknown}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={BRAND_COLORS[brand] || BRAND_COLORS.Unknown}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(238, 238, 238, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={(value) => formatMonth(value)}
              stroke="rgba(238, 238, 238, 0.45)"
              tick={{ fill: 'rgba(238, 238, 238, 0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(238, 238, 238, 0.1)' }}
            />
            <YAxis
              tickFormatter={(value) => formatNumber(value)}
              stroke="rgba(238, 238, 238, 0.45)"
              tick={{ fill: 'rgba(238, 238, 238, 0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(238, 238, 238, 0.1)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2A2A2A',
                border: '1px solid rgba(238, 238, 238, 0.1)',
                borderRadius: '8px',
                color: '#EEEEEE',
              }}
              labelFormatter={(value) => formatMonth(value as string)}
              formatter={(value: number, name: string) => [
                formatNumber(value),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              formatter={(value) => (
                <span style={{ color: 'rgba(238, 238, 238, 0.65)' }}>{value}</span>
              )}
            />
            {brandFamilies.map((brand) => (
              <Area
                key={brand}
                type="monotone"
                dataKey={brand}
                stackId="1"
                stroke={BRAND_COLORS[brand] || BRAND_COLORS.Unknown}
                fill={`url(#gradient-${brand.replace(/\s/g, '')})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
