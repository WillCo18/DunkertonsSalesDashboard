'use client'

import { useMemo } from 'react'
import { Shipment } from '@/types'
import { BRAND_COLORS } from '@/lib/utils'
import { Check, X, AlertCircle, Clock } from 'lucide-react'

interface StockingMatrixProps {
    shipments: Shipment[]
}

const TARGET_FORMATS = ['Keg', 'Bib', 'Bottle', 'Can']
const TARGET_BRANDS = Object.keys(BRAND_COLORS).filter(b => b !== 'Unknown')

type StockStatus = 'active' | 'lapsed' | 'historic' | 'none' // Green | Amber | Red | None

export function StockingMatrix({ shipments }: StockingMatrixProps) {

    // Process data to find last order date for each Brand x Format
    // AND dynamically find all brands present in this customer's history
    const { matrixData, availableBrands } = useMemo(() => {
        console.log('STOCKING MATRIX INPUT:', shipments.length, 'shipments')

        const map = new Map<string, string>() // key: "Brand-Format" -> value: lastOrderDate (ISO)
        const brands = new Set<string>()

        // Pre-populate with target brands to ensure correct order/visibility
        Object.keys(BRAND_COLORS).forEach(b => {
            if (b !== 'Unknown') brands.add(b)
        })

        const normalizeFormat = (fmt: string): string | null => {
            const lower = fmt.toLowerCase()
            if (lower.includes('keg')) return 'Keg'
            if (lower.includes('bib')) return 'Bib'
            if (lower.includes('bottle')) return 'Bottle'
            if (lower.includes('can')) return 'Can'
            return null
        }

        shipments.forEach(s => {
            if (s.detected_family && s.detected_format) {
                // Track the brand
                brands.add(s.detected_family)

                const normalizedFormat = normalizeFormat(s.detected_format)

                if (normalizedFormat) {
                    const key = `${s.detected_family}-${normalizedFormat}`
                    const currentLast = map.get(key)

                    // Keep the MOST RECENT date
                    if (!currentLast || s.report_month > currentLast) {
                        map.set(key, s.report_month)
                    }
                }
            }
        })

        return {
            matrixData: map,
            availableBrands: Array.from(brands).sort()
        }
    }, [shipments])

    // Helper to determine status color
    const getStatus = (lastOrderDate?: string): StockStatus => {
        if (!lastOrderDate) return 'none'

        const now = new Date()
        const last = new Date(lastOrderDate)
        const diffTime = Math.abs(now.getTime() - last.getTime())
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44) // Approx months

        if (diffMonths <= 3) return 'active'   // Green
        if (diffMonths <= 6) return 'lapsed'   // Amber
        return 'historic'                      // Red
    }

    // HEATMAP GRID STYLING
    const getCellClass = (status: StockStatus) => {
        const base = "h-12 w-full flex items-center justify-center transition-all border border-border/50"
        switch (status) {
            case 'active': return `${base} bg-success/80 text-white hover:bg-success`
            case 'lapsed': return `${base} bg-warning/80 text-white hover:bg-warning`
            case 'historic': return `${base} bg-danger/80 text-white hover:bg-danger`
            default: return `${base} bg-surface-elevated/30 text-transparent` // Empty cell
        }
    }

    const getTooltip = (status: StockStatus, lastOrder?: string) => {
        if (!lastOrder) return 'Never stocked'
        const dateStr = new Date(lastOrder).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        switch (status) {
            case 'active': return `Active (Last: ${dateStr})`
            case 'lapsed': return `Warning: 3-6 months (Last: ${dateStr})`
            case 'historic': return `Lapsed: >6 months (Last: ${dateStr})`
            default: return ''
        }
    }

    // Filter out 'Unknown' if desired
    const displayBrands = availableBrands.filter(b => b !== 'Unknown')

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="p-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-surface border-b border-border w-32">
                            Brand Family
                        </th>
                        {TARGET_FORMATS.map(format => (
                            <th key={format} className="p-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider border-b border-border bg-surface w-24">
                                {format}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                    {displayBrands.map(brand => (
                        <tr key={brand}>
                            <td className="p-3 font-medium text-foreground bg-surface border-r border-border text-xs">
                                {brand}
                            </td>
                            {TARGET_FORMATS.map(format => {
                                const lastDate = matrixData.get(`${brand}-${format}`)
                                const status = getStatus(lastDate)
                                return (
                                    <td key={`${brand}-${format}`} className="p-0">
                                        <div
                                            className={getCellClass(status)}
                                            title={getTooltip(status, lastDate)}
                                        >
                                            {status !== 'none' && (
                                                status === 'active' ? <Check className="w-5 h-5" /> :
                                                    status === 'lapsed' ? <Clock className="w-5 h-5" /> :
                                                        <AlertCircle className="w-5 h-5" />
                                            )}
                                        </div>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Legend */}
            <div className="flex gap-4 mt-4 px-2 text-xs text-foreground-secondary justify-end">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success/80"></div>
                    <span>&lt; 3 Months</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-warning/80"></div>
                    <span>3-6 Months</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-danger/80"></div>
                    <span>&gt; 6 Months</span>
                </div>
            </div>
        </div>
    )
}
