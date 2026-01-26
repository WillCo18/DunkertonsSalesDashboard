'use server'

import { createClient } from '@supabase/supabase-js'
import { Customer } from '@/types'

// Initialize Supabase Client dynamically to avoid top-level env access issues
// and match the working pattern in enrich-customer.ts

export async function saveCustomerEnrichmentAction(customer: Customer, newEnrichmentData: any) {
    try {
        if (!customer?.del_account) {
            throw new Error('Customer ID (del_account) is required')
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        })

        console.log(`[Save Action] Saving enrichment for ${customer.customer_name} (${customer.del_account})`)

        // 1. Merge with existing data to ensure we don't lose anything (though UI typically sends full state)
        // We'll trust the UI sent the complete new state for the enrichment column
        const payload = {
            ...newEnrichmentData,
            last_updated: new Date().toISOString(),
            source: 'manual_edit'
        }

        // 2. Update Supabase
        const { error } = await supabase
            .from('dim_customer') // Corrected table name from dim_customers
            .update({ enrichment: payload })
            .eq('del_account', customer.del_account)


        if (error) {
            console.error('[Save Action] Supabase Update Error:', error)
            throw new Error(error.message)
        }

        console.log('[Save Action] Success')
        return { success: true, data: payload }

    } catch (error: any) {
        console.error('[Save Action] Failed:', error)
        return { success: false, message: error.message || 'Unknown error' }
    }
}
