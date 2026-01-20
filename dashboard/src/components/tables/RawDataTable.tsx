'use client'

import { Shipment } from '@/types'
import { formatMonth } from '@/lib/utils'

interface RawDataTableProps {
    data: Shipment[]
    loading: boolean
}

export function RawDataTable({ data, loading }: RawDataTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-elevated z-10 shadow-sm">
                    <tr className="border-b border-border">
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Account</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Customer Name</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Description</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Qty</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Format</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Family</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Salesperson</th>
                        <th className="py-3 px-4 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Month</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="py-8 text-center text-foreground-muted">No data available</td>
                        </tr>
                    ) : (
                        data.map((row, i) => (
                            <tr key={row.line_key || i} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="py-2 px-4 text-sm font-mono text-accent">{row.del_account}</td>
                                <td className="py-2 px-4 text-sm text-foreground">{row.customer_name}</td>
                                <td className="py-2 px-4 text-sm text-foreground-secondary italic">{row.source_description}</td>
                                <td className="py-2 px-4 text-sm font-bold text-foreground">{row.quantity}</td>
                                <td className="py-2 px-4 text-sm text-foreground-muted">{row.detected_format || '-'}</td>
                                <td className="py-2 px-4 text-sm text-foreground-muted">{row.detected_family || '-'}</td>
                                <td className="py-2 px-4 text-sm text-foreground-secondary">{row.salesperson || '-'}</td>
                                <td className="py-2 px-4 text-sm text-foreground-muted font-mono">{formatMonth(row.report_month)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
