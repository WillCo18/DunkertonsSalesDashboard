'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Users, Package, UserCheck, Download } from 'lucide-react'
import { formatNumber, truncate } from '@/lib/utils'
import useSWR from 'swr'
import { getEnhancedGapAnalysis } from '@/lib/queries'

interface GapCustomer {
    del_account: string
    customer_name: string
    delivery_city: string | null
    delivery_postcode: string | null
    salesperson: string | null
    total_units: number
}

interface EnhancedGapAnalysisProps {
    availableBrands: string[]
    availableFormats: string[]
    availableSalespeople: string[]
    currentMonth?: string[] // Changed to array for multi-month support
}

export function EnhancedGapAnalysis({
    availableBrands,
    availableFormats,
    availableSalespeople,
    currentMonth
}: EnhancedGapAnalysisProps) {
    // Filter state
    const [selectedBrand, setSelectedBrand] = useState<string>('')
    const [selectedFormat, setSelectedFormat] = useState<string>('')
    const [selectedSalesperson, setSelectedSalesperson] = useState<string>('')
    const [showStocked, setShowStocked] = useState(false) // false = show NOT stocked (gaps)
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch gap analysis data
    const { data: gapData = [], isLoading } = useSWR<GapCustomer[]>(
        selectedBrand ? ['gap-analysis', selectedBrand, selectedFormat, selectedSalesperson, showStocked, currentMonth] : null,
        () => getEnhancedGapAnalysis({
            brandFamily: selectedBrand,
            packFormat: selectedFormat || undefined,
            salesperson: selectedSalesperson || undefined,
            showStocked,
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

    const hasFilters = selectedBrand || selectedFormat || selectedSalesperson

    return (
        <div className="card">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-info/10 rounded-lg">
                        <Filter className="w-5 h-5 text-info" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Gap Analysis</h3>
                        <p className="text-xs text-foreground-muted">Identify customer stocking opportunities</p>
                    </div>
                </div>
                {filteredData.length > 0 && (
                    <button
                        className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-border border border-border rounded-md transition-all text-sm"
                        title="Export Results"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Brand Family - Required */}
                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-2">
                        Brand Family <span className="text-danger">*</span>
                    </label>
                    <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                    >
                        <option value="">Select brand...</option>
                        {availableBrands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                </div>

                {/* Pack Format - Optional */}
                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-2">
                        Pack Format
                    </label>
                    <select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        disabled={!selectedBrand}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">All formats</option>
                        {availableFormats.map(format => (
                            <option key={format} value={format}>{format}</option>
                        ))}
                    </select>
                </div>

                {/* Salesperson - Optional */}
                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-2">
                        Salesperson
                    </label>
                    <select
                        value={selectedSalesperson}
                        onChange={(e) => setSelectedSalesperson(e.target.value)}
                        disabled={!selectedBrand}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">All salespeople</option>
                        {availableSalespeople.map(person => (
                            <option key={person} value={person}>{person}</option>
                        ))}
                    </select>
                </div>

                {/* Stocked Toggle */}
                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-2">
                        Show
                    </label>
                    <div className="flex gap-2 h-[42px]">
                        <button
                            onClick={() => setShowStocked(false)}
                            disabled={!selectedBrand}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${!showStocked && selectedBrand
                                ? 'bg-danger/20 border-danger text-danger'
                                : 'bg-surface border-border text-foreground-muted hover:bg-surface-elevated'
                                }`}
                        >
                            Not Stocked
                        </button>
                        <button
                            onClick={() => setShowStocked(true)}
                            disabled={!selectedBrand}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${showStocked && selectedBrand
                                ? 'bg-success/20 border-success text-success'
                                : 'bg-surface border-border text-foreground-muted hover:bg-surface-elevated'
                                }`}
                        >
                            Stocked
                        </button>
                    </div>
                </div>
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
                {!selectedBrand ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-info/10 rounded-full mb-4">
                            <Package className="w-8 h-8 text-info" />
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">Select a Brand Family</h4>
                        <p className="text-sm text-foreground-muted max-w-md">
                            Choose a brand family above to see which customers are stocking it and which aren't
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-surface-elevated rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-surface-elevated rounded-full mb-4">
                            <UserCheck className="w-8 h-8 text-foreground-muted" />
                        </div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">
                            {showStocked ? 'No Customers Stocking' : 'No Gaps Found'}
                        </h4>
                        <p className="text-sm text-foreground-muted max-w-md">
                            {showStocked
                                ? `No customers are currently stocking ${selectedBrand}${selectedFormat ? ` in ${selectedFormat}` : ''}`
                                : `All active customers are already stocking ${selectedBrand}${selectedFormat ? ` in ${selectedFormat}` : ''}`
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-foreground-muted" />
                                <span className="text-sm font-medium text-foreground">
                                    {filteredData.length} Customer{filteredData.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="text-xs text-foreground-muted">
                                {showStocked ? 'Currently stocking' : 'Not stocking'} {selectedBrand}
                                {selectedFormat && ` (${selectedFormat})`}
                            </div>
                        </div>

                        {/* Customer List */}
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredData.map((customer) => (
                                <div
                                    key={customer.del_account}
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
                                        {customer.total_units > 0 && (
                                            <div className="text-right">
                                                <div className="font-mono text-lg font-bold text-accent">
                                                    {formatNumber(customer.total_units)}
                                                </div>
                                                <div className="text-xs text-foreground-muted">total units</div>
                                            </div>
                                        )}
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
                                        {!showStocked && (
                                            <div className="ml-auto">
                                                <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-medium rounded">
                                                    Opportunity
                                                </span>
                                            </div>
                                        )}
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
