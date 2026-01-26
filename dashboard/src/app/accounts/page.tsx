'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerDetailsDrawer } from '@/components/crm/CustomerDetailsDrawer'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types'
import { Search, Filter, ArrowUpDown } from 'lucide-react'
import { truncate } from '@/lib/utils'
import { getCustomerDetails } from '@/lib/queries'

// Fetch all customers function
async function getAllCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
        .from('dim_customer')
        .select('*')
        .order('customer_name', { ascending: true })

    if (error) throw error
    return data || []
}

export default function AccountsPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    // Fetch data
    const { data: customers = [], isLoading } = useSWR<Customer[]>(
        'all-customers',
        getAllCustomers
    )

    // Filter logic
    const filteredCustomers = customers.filter((c: Customer) =>
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.del_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.delivery_city && c.delivery_city.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleRowClick = async (customer: Customer) => {
        // If we need fresh details (e.g. latest enrichment), fetch it. 
        // Otherwise we can use the list data if it includes enrichment.
        // The list query above is 'select *' so it includes enrichment.
        setSelectedCustomer(customer)
        setIsDrawerOpen(true)
    }

    return (
        <AppShell>
            <div className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
                        <p className="text-sm text-foreground-muted">Manage customer records and details</p>
                    </div>
                    <div className="text-sm text-foreground-muted">
                        {filteredCustomers.length} Accounts
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder="Search customers, account numbers, or cities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                    {/* Future: Add more filters here */}
                </div>

                {/* Table */}
                <div className="flex-1 bg-surface border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-surface-elevated sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 border-b border-border text-xs font-semibold text-foreground-muted uppercase tracking-wider w-[300px]">Customer</th>
                                    <th className="p-4 border-b border-border text-xs font-semibold text-foreground-muted uppercase tracking-wider">Account #</th>
                                    <th className="p-4 border-b border-border text-xs font-semibold text-foreground-muted uppercase tracking-wider">Location</th>
                                    <th className="p-4 border-b border-border text-xs font-semibold text-foreground-muted uppercase tracking-wider">Type</th>
                                    <th className="p-4 border-b border-border text-xs font-semibold text-foreground-muted uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    // Skeleton
                                    [...Array(10)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="p-4"><div className="h-5 w-48 bg-surface-elevated rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-5 w-24 bg-surface-elevated rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-5 w-32 bg-surface-elevated rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-5 w-20 bg-surface-elevated rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-5 w-16 bg-surface-elevated rounded animate-pulse" /></td>
                                        </tr>
                                    ))
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-foreground-muted">
                                            No customers found matching &quot;{searchTerm}&quot;
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer: Customer) => (
                                        <tr
                                            key={customer.del_account}
                                            onClick={() => handleRowClick(customer)}
                                            className="hover:bg-surface-elevated transition-colors cursor-pointer group"
                                        >
                                            <td className="p-4">
                                                <div className="font-medium text-foreground group-hover:text-accent transition-colors">
                                                    {customer.customer_name}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-foreground-secondary">
                                                {customer.del_account}
                                            </td>
                                            <td className="p-4 text-sm text-foreground-secondary">
                                                {customer.delivery_city || '-'}
                                            </td>
                                            <td className="p-4 text-sm text-foreground-secondary">
                                                <span className="bg-surface-elevated border border-border px-2 py-1 rounded text-xs">
                                                    {customer.customer_type || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <CustomerDetailsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                customer={selectedCustomer}
            />
        </AppShell>
    )
}
