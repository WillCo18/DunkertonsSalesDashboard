'use client'

import { formatNumber, truncate, formatMonth } from '@/lib/utils'
import { UserMinus, Download } from 'lucide-react'

interface LapsedCustomer {
    del_account: string
    customer_name: string
    delivery_city: string | null
    delivery_postcode: string | null
    salesperson: string | null
    last_month_units: number
}

interface LapsedCustomersListProps {
    data: LapsedCustomer[]
    loading?: boolean
    currentMonth?: string
    onExport?: () => void
}

export function LapsedCustomersList({
    data,
    loading = false,
    currentMonth,
    onExport,
}: LapsedCustomersListProps) {
    // Calculate previous month for display
    const getPrevMonthLabel = () => {
        if (!currentMonth) return 'last month'
        const date = new Date(currentMonth)
        date.setMonth(date.getMonth() - 1)
        return formatMonth(date.toISOString().slice(0, 10))
    }

    if (loading) {
        return (
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="card-header mb-0">Lapsed This Month</h3>
                </div>
                <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-surface-elevated rounded" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <UserMinus className="w-4 h-4 text-warning" />
                    <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
                        Lapsed This Month
                    </h3>
                    <span className="bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">
                        {data.length}
                    </span>
                </div>
                {onExport && data.length > 0 && (
                    <button
                        onClick={onExport}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                        title="Export to CSV"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Description */}
            <div className="mb-3 text-xs text-foreground-muted bg-surface-elevated p-2 rounded">
                <span>⚠️ Customers who ordered in {getPrevMonthLabel()} but not this month</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.length === 0 ? (
                    <div className="text-center text-foreground-muted py-4">
                        No lapsed customers this period
                    </div>
                ) : (
                    data.map((customer) => (
                        <div
                            key={customer.del_account}
                            className="flex items-center justify-between py-2 px-3 bg-surface-elevated rounded-lg hover:bg-border transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground text-sm">
                                    {truncate(customer.customer_name, 25)}
                                </div>
                                <div className="text-xs text-foreground-muted">
                                    {customer.delivery_city || customer.delivery_postcode || 'No location'}
                                </div>
                                {customer.salesperson && (
                                    <div className="text-xs text-foreground-muted mt-0.5">
                                        Rep: {customer.salesperson}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-sm text-warning">
                                    {formatNumber(customer.last_month_units)}
                                </div>
                                <div className="text-xs text-foreground-muted">units prev</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
