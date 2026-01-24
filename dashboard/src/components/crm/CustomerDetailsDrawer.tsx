'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, User, Phone, Mail, Instagram, Edit2, Save, FileText, History, Package, Search } from 'lucide-react'
import { Customer, Shipment } from '@/types'
import { formatNumber } from '@/lib/utils'
import { StockingMatrix } from './StockingMatrix'
import { getCustomerShipments } from '@/lib/queries'
import useSWR from 'swr'

interface CustomerDetailsDrawerProps {
    isOpen: boolean
    onClose: () => void
    customer: Customer | null
    onSave?: (customer: Customer, enrichment: any) => Promise<void>
}

export function CustomerDetailsDrawer({
    isOpen,
    onClose,
    customer,
    onSave
}: CustomerDetailsDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'details' | 'history'>('overview')
    const [enrichmentData, setEnrichmentData] = useState<any>({
        contacts: [],
        socials: {},
        tags: [],
        notes: ''
    })

    // History Filter State
    const [historySearch, setHistorySearch] = useState('')

    // Fetch real shipment history when drawer is open and customer is selected
    const { data: shipments = [], isLoading: isLoadingHistory } = useSWR<Shipment[]>(
        isOpen && customer ? ['customer-shipments', customer.del_account] : null,
        () => customer ? getCustomerShipments(customer.del_account) : Promise.resolve([])
    )

    // Initialize enrichment data
    useEffect(() => {
        if (customer) {
            setEnrichmentData(customer.enrichment || {
                contacts: [],
                socials: {},
                tags: [],
                notes: ''
            })
            setActiveTab('overview')
            setHistorySearch('') // Reset filter
        }
    }, [customer])

    // Filter Shipments Logic
    const filteredShipments = useMemo(() => {
        if (!historySearch) return shipments
        const term = historySearch.toLowerCase()
        return shipments.filter(s =>
            (s.detected_family && s.detected_family.toLowerCase().includes(term)) ||
            (s.source_description && s.source_description.toLowerCase().includes(term))
        )
    }, [shipments, historySearch])

    if (!isOpen || !customer) return null

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[700px] bg-surface border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-border bg-surface-elevated">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{customer.customer_name}</h2>
                            <div className="flex items-center gap-2 text-sm text-foreground-muted mt-1">
                                <span className="font-mono bg-surface border border-border px-2 py-0.5 rounded text-xs">
                                    {customer.del_account}
                                </span>
                                <span>•</span>
                                <span>{customer.delivery_city || 'Unknown City'}</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface rounded-full text-foreground-muted hover:text-foreground transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-surface p-3 rounded-lg border border-border">
                            <div className="text-xs text-foreground-muted mb-1">Status</div>
                            <div className="font-semibold text-success">Active</div>
                        </div>
                        <div className="bg-surface p-3 rounded-lg border border-border">
                            <div className="text-xs text-foreground-muted mb-1">Last Order</div>
                            <div className="font-medium text-foreground">{customer.last_seen || '-'}</div>
                        </div>
                        <div className="bg-surface p-3 rounded-lg border border-border">
                            <div className="text-xs text-foreground-muted mb-1">Contacts</div>
                            <div className="font-medium text-foreground">
                                {enrichmentData.contacts?.length || 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 px-6 border-b border-border overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'matrix' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground'
                            }`}
                    >
                        Stocking Matrix
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground'
                            }`}
                    >
                        Order History
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'details' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground'
                            }`}
                    >
                        Contacts & Info
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-surface-elevated p-4 rounded-xl border border-border">
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Instagram className="w-4 h-4" />
                                    Social Snapshot
                                </h3>
                                {enrichmentData.socials?.instagram_id ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-0.5">
                                            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                                                <Instagram className="w-6 h-6 text-foreground" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{enrichmentData.socials.instagram_id}</div>
                                            <a href={`https://instagram.com/${enrichmentData.socials.instagram_id.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                                                View Profile
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-foreground-muted text-sm border-2 border-dashed border-border rounded-lg">
                                        No Instagram linked
                                    </div>
                                )}
                            </div>

                            <div className="bg-surface-elevated p-4 rounded-xl border border-border">
                                <h3 className="text-sm font-semibold text-foreground mb-3">Address</h3>
                                <p className="text-sm text-foreground-secondary leading-relaxed">
                                    {customer.customer_name}<br />
                                    {customer.delivery_address}<br />
                                    {customer.delivery_city}, {customer.delivery_postcode}
                                </p>
                                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                                    <span className="px-2 py-1 bg-surface rounded text-xs font-mono text-foreground-muted">
                                        Lat: {customer.latitude?.toFixed(4)}
                                    </span>
                                    <span className="px-2 py-1 bg-surface rounded text-xs font-mono text-foreground-muted">
                                        Long: {customer.longitude?.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MATRIX TAB */}
                    {activeTab === 'matrix' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground mb-2">Product Stocking Matrix</h3>
                            <p className="text-xs text-foreground-muted mb-4">
                                Visual overview of what this customer stocks based on order history.
                            </p>
                            <div className="bg-surface-elevated border border-border rounded-xl p-4">
                                {isLoadingHistory ? (
                                    <div className="animate-pulse space-y-4">
                                        <div className="h-8 bg-surface rounded w-full"></div>
                                        <div className="h-48 bg-surface rounded w-full"></div>
                                    </div>
                                ) : (
                                    <StockingMatrix shipments={shipments} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-foreground">Order History</h3>
                            </div>

                            {/* Filter */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                <input
                                    type="text"
                                    placeholder="Filter by brand (e.g. Black Fox)..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                                />
                            </div>

                            {isLoadingHistory ? (
                                <div className="text-center py-8 text-foreground-muted">Loading history...</div>
                            ) : filteredShipments.length === 0 ? (
                                <div className="text-center py-12 text-foreground-muted border-2 border-dashed border-border rounded-xl">
                                    No orders found using current filters.
                                </div>
                            ) : (
                                <div className="space-y-0 divide-y divide-border border border-border rounded-xl bg-surface-elevated overflow-hidden">
                                    {filteredShipments.map((shipment, idx) => (
                                        <div key={idx} className="p-4 hover:bg-surface transition-colors flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-foreground text-sm">
                                                    {shipment.source_description || shipment.source_sku}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-foreground-muted font-mono">{shipment.report_month}</span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-foreground-secondary">
                                                        {shipment.detected_family || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-accent">{Number(shipment.quantity).toFixed(0)}</div>
                                                <div className="text-xs text-foreground-muted">units</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* DETAILS TAB (Previously Contacts) */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-foreground">Key Contacts</h3>
                                <button className="text-sm text-accent hover:underline flex items-center gap-1">
                                    <Edit2 className="w-3 h-3" /> Edit
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(enrichmentData.contacts || []).map((contact: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-surface-elevated border border-border rounded-xl">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-foreground">{contact.name}</div>
                                                <div className="text-xs text-foreground-muted mb-2">{contact.role}</div>
                                                <div className="space-y-1">
                                                    {contact.email && (
                                                        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                                            <Mail className="w-3 h-3" /> {contact.email}
                                                        </div>
                                                    )}
                                                    {contact.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                                            <Phone className="w-3 h-3" /> {contact.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!enrichmentData.contacts || enrichmentData.contacts.length === 0) && (
                                    <button className="w-full py-8 border-2 border-dashed border-border rounded-xl text-foreground-muted hover:text-foreground hover:border-accent/50 hover:bg-accent/5 transition-all text-sm flex flex-col items-center gap-2">
                                        <User className="w-6 h-6" />
                                        Add Primary Contact
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    )
}
