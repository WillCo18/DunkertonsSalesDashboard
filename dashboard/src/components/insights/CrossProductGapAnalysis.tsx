'use client'

import { useState, useMemo } from 'react'
import { Search, TrendingUp, Users, Package, ArrowRight } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import useSWR from 'swr'
import { getCrossProductGapAnalysis } from '@/lib/queries'

interface GapCustomer {
    del_account: string
    customer_name: string
    delivery_city: string | null
    delivery_postcode: string | null
    salesperson: string | null
    stocks_units: number
    missing_units: number
}

interface CrossProductGapAnalysisProps {
    availableBrands: string[]
    availableFormats: string[]
    availableSalespeople: string[]
    currentMonth?: string[] // Changed to array for multi-month support
    onRowClick?: (id: string) => void
}

export function CrossProductGapAnalysis({
    availableBrands,
    availableFormats,
    availableSalespeople,
    currentMonth,
    onRowClick
}: CrossProductGapAnalysisProps) {
    // Condition 1: STOCKS
    const [stocksBrand, setStocksBrand] = useState<string>('')
    const [stocksFormat, setStocksFormat] = useState<string>('')

    // Condition 2: MISSING
    const [missingBrand, setMissingBrand] = useState<string>('')
    const [missingFormat, setMissingFormat] = useState<string>('')

    // Optional filters
    const [selectedSalesperson, setSelectedSalesperson] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch cross-product gap data
    const { data: gapData = [], isLoading } = useSWR<GapCustomer[]>(
        stocksBrand && missingBrand ? [
            'cross-gap',
            stocksBrand,
            stocksFormat,
            missingBrand,
            missingFormat,
            selectedSalesperson,
            currentMonth
        ] : null,
        () => getCrossProductGapAnalysis({
            stocksBrand,
            stocksFormat: stocksFormat || undefined,
            missingBrand,
            missingFormat: missingFormat || undefined,
            salesperson: selectedSalesperson || undefined,
            reportMonth: currentMonth || []
        })
    )

    // Filter by search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return gapData
        const term = searchTerm.toLowerCase()
        return gapData.filter((item: GapCustomer) =>
            item.customer_name.toLowerCase().includes(term) ||
            item.del_account.toLowerCase().includes(term)
        )
    }, [gapData, searchTerm])

    const hasFilters = stocksBrand && missingBrand

    return (
        <div className="card">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Cross-Product Opportunities</h3>
                        <p className="text-xs text-foreground-muted">Find customers stocking X but not Y</p>
                    </div>
                </div>
            </div>

            {/* Filters - Two Rows */}
            <div className="space-y-4 mb-6">
                {/* Row 1: STOCKS */}
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-xs font-semibold text-success uppercase tracking-wider">Condition 1: Stocks</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-2">
                                Brand Family <span className="text-danger">*</span>
                            </label>
                            <select
                                value={stocksBrand}
                                onChange={(e) => setStocksBrand(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-success transition-colors"
                            >
                                <option value="">Select brand...</option>
                                {availableBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-2">
                                Pack Format
                            </label>
                            <select
                                value={stocksFormat}
                                onChange={(e) => setStocksFormat(e.target.value)}
                                disabled={!stocksBrand}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-success transition-colors disabled:opacity-50"
                            >
                                <option value="">All formats</option>
                                {availableFormats.map(format => (
                                    <option key={format} value={format}>{format}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Arrow Indicator */}
                <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 text-foreground-muted">
                        <div className="h-px w-12 bg-border"></div>
                        <span className="text-xs font-medium uppercase">But Not</span>
                        <div className="h-px w-12 bg-border"></div>
                    </div>
                </div>

                {/* Row 2: MISSING */}
                <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-danger rounded-full"></div>
                        <span className="text-xs font-semibold text-danger uppercase tracking-wider">Condition 2: Missing</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-2">
                                Brand Family <span className="text-danger">*</span>
                            </label>
                            <select
                                value={missingBrand}
                                onChange={(e) => setMissingBrand(e.target.value)}
                                disabled={!stocksBrand}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-danger transition-colors disabled:opacity-50"
                            >
                                <option value="">Select brand...</option>
                                {availableBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-2">
                                Pack Format
                            </label>
                            <select
                                value={missingFormat}
                                onChange={(e) => setMissingFormat(e.target.value)}
                                disabled={!missingBrand}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-danger transition-colors disabled:opacity-50"
                            >
                                <option value="">All formats</option>
                                {availableFormats.map(format => (
                                    <option key={format} value={format}>{format}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Optional Salesperson Filter */}
                {hasFilters && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-foreground-secondary mb-2">
                                Filter by Salesperson (Optional)
                            </label>
                            <select
                                value={selectedSalesperson}
                                onChange={(e) => setSelectedSalesperson(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                            >
                                <option value="">All salespeople</option>
                                {availableSalespeople.map(person => (
                                    <option key={person} value={person}>{person}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Search */}
            {hasFilters && (
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* Results */}
            <div>
                {!hasFilters ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 bg-info/10 rounded-full mb-4">
                            <Package className="w-8 h-8 text-info" />
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">Set Both Conditions</h4>
                        <p className="text-sm text-foreground-muted max-w-md">
                            Select what customers STOCK and what they're MISSING to find cross-selling opportunities
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-surface-elevated rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 bg-surface-elevated rounded-full mb-4">
                            <Users className="w-8 h-8 text-foreground-muted" />
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">No Opportunities Found</h4>
                        <p className="text-sm text-foreground-muted max-w-md">
                            No customers stock {stocksBrand} but not {missingBrand} in the selected period
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-foreground-muted" />
                                <span className="text-sm font-medium text-foreground">
                                    {filteredData.length} Opportunit{filteredData.length !== 1 ? 'ies' : 'y'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-1 bg-success/10 text-success rounded">Stocks {stocksBrand}</span>
                                <ArrowRight className="w-3 h-3 text-foreground-muted" />
                                <span className="px-2 py-1 bg-danger/10 text-danger rounded">Missing {missingBrand}</span>
                            </div>
                        </div>

                        {/* Customer List */}
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredData.map((customer: GapCustomer) => (
                                <div
                                    key={customer.del_account}
                                    onClick={() => onRowClick?.(customer.del_account)}
                                    className="p-4 bg-surface-elevated rounded-lg border border-transparent hover:border-accent/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                                                {customer.customer_name}
                                            </h5>
                                            <p className="text-xs text-foreground-muted mt-0.5">
                                                {customer.delivery_city && customer.delivery_postcode
                                                    ? `${customer.delivery_city}, ${customer.delivery_postcode}`
                                                    : customer.delivery_city || customer.delivery_postcode || 'No location'}
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <div className="font-mono text-sm font-bold text-success">
                                                    {formatNumber(customer.stocks_units)}
                                                </div>
                                                <div className="text-xs text-foreground-muted">{stocksBrand}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-sm font-bold text-danger">
                                                    0
                                                </div>
                                                <div className="text-xs text-foreground-muted">{missingBrand}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <span className="text-foreground-muted">Account:</span>
                                            <span className="font-mono text-foreground">{customer.del_account}</span>
                                        </div>
                                        {customer.salesperson && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="text-foreground-muted">Rep:</span>
                                                <span className="text-foreground">{customer.salesperson}</span>
                                            </div>
                                        )}
                                        <div className="ml-auto">
                                            <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded">
                                                Upsell Opportunity
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
