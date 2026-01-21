'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface FormatMixChartProps {
    data: Array<{ format: string; units: number }>
    loading?: boolean
}

const FORMAT_COLORS: Record<string, string> = {
    'Can': '#10b981',      // green
    'Bottle': '#3b82f6',   // blue
    'BIB': '#f59e0b',      // amber
    'Keg': '#8b5cf6',      // purple
    'Unknown': '#6b7280'   // gray
}

export function FormatMixChart({ data, loading = false }: FormatMixChartProps) {
    if (loading) {
        return (
            <div className="kpi-tile">
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-24 bg-surface-elevated rounded" />
                    <div className="h-32 bg-surface-elevated rounded" />
                </div>
            </div>
        )
    }

    // Aggregate by format category (Can, Bottle, BIB, Keg)
    const aggregated: Record<string, number> = {}

    data.forEach(item => {
        let category = 'Unknown'
        const format = item.format.toLowerCase()

        // Skip 'none' or empty formats
        if (format === 'none' || !format) return

        if (format.includes('can')) category = 'Can'
        else if (format.includes('bottle')) category = 'Bottle'
        else if (format.includes('bib') || format.includes('bag')) category = 'BIB'
        else if (format.includes('keg') || format.includes('mini')) category = 'Keg'

        aggregated[category] = (aggregated[category] || 0) + item.units
    })

    const chartData = Object.entries(aggregated).map(([format, units]) => ({
        name: format,
        value: units,
        fill: FORMAT_COLORS[format] || FORMAT_COLORS['Unknown']
    }))

    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    return (
        <div className="kpi-tile">
            <div className="flex items-center justify-between mb-2">
                <span className="kpi-label">Format Mix</span>
            </div>

            <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--surface-elevated))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            color: 'hsl(var(--foreground))',
                            fontWeight: 'bold'
                        }}
                        itemStyle={{
                            color: 'hsl(var(--foreground))',
                            fontWeight: 'bold'
                        }}
                        formatter={(value: number) => [
                            `${value} units (${((value / total) * 100).toFixed(1)}%)`,
                            ''
                        ]}
                    />
                </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                {chartData.map(item => {
                    const percentage = ((item.value / total) * 100).toFixed(0)
                    return (
                        <div key={item.name} className="flex items-center gap-1">
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-foreground-muted truncate">
                                {item.name} {percentage}%
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
