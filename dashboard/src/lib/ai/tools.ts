import { tool } from 'ai'
import { z } from 'zod'
import {
    searchCustomers,
    getCustomerDetails,
    getCustomerShipments,
    getCrossProductGapAnalysis,
    getMonthlySummary
} from '@/lib/queries'

// Tool Definitions for Vercel AI SDK
// These wrap the existing queries with Zod schemas for the LLM

export const tools = {
    search_customers: tool({
        description: 'Search for a SPECIFIC CUSTOMER, PUB, or VENUE. Use this FIRST if the user asks about a specific place (e.g. "The Crown", "Red Lion"). Do NOT use for products.',
        parameters: z.object({
            query: z.string().describe('The name of the customer/pub to search for'),
        }),
        execute: async ({ query }: { query: string }) => {
            const results = await searchCustomers(query)
            return {
                count: results.length,
                results: results.slice(0, 5) // Limit to 5 for token efficiency
            }
        }
    }),

    get_customer_details: tool({
        description: 'Get full profile of a customer including address, segment, and recent activity.',
        parameters: z.object({
            accountId: z.string().describe('The customer ID (del_account) often found via search_customers'),
        }),
        execute: async ({ accountId }: { accountId: string }) => {
            return await getCustomerDetails(accountId)
        }
    }),

    get_customer_history: tool({
        description: 'Get list of past shipments/orders for a customer. Useful for seeing what they buy.',
        parameters: z.object({
            accountId: z.string().describe('The customer ID (del_account)'),
        }),
        execute: async ({ accountId }: { accountId: string }) => {
            const shipments = await getCustomerShipments(accountId)
            // Return summary to save tokens, or last 10
            return shipments.slice(0, 10).map((s: any) => ({
                date: s.delivery_date,
                product: s.product_description,
                qty: s.quantity,
                brand: s.brand_family,
                format: s.pack_format
            }))
        }
    }),

    check_product_gaps: tool({
        description: 'Find customers who stock one product (Base) but NOT another (Target). "Upsell Opportunity".',
        parameters: z.object({
            stocksBrand: z.string().describe('Brand they ALREADY buy (e.g. "Black Fox")'),
            missingBrand: z.string().describe('Brand they SHOULD buy (e.g. "Craft")'),
            format: z.string().optional().describe('Format filter e.g. "Keg 30L" or "Small Pack"')
        }),
        execute: async ({ stocksBrand, missingBrand, format }: { stocksBrand: string, missingBrand: string, format?: string }) => {
            const results = await getCrossProductGapAnalysis({
                stocksBrand,
                stocksFormat: format,
                missingBrand,
                missingFormat: format
            })
            return {
                count: results.length,
                opportunities: results.slice(0, 5) // Return top 5 opportunities
            }
        }
    }),

    get_monthly_kpis: tool({
        description: 'Get high-level sales KPIs (Volume, Revenue, etc). Use this for COMPANY-WIDE or BRAND-LEVEL data. Do NOT use for specific customers.',
        parameters: z.object({
            month: z.string().optional().describe('Month in YYYY-MM format. If omitted, returns all-time.'),
            brandFamily: z.string().optional().describe('Brand name to filter by (e.g. "Black Fox", "Dunkertons").'),
            salesperson: z.string().optional()
        }),
        execute: async ({ month, brandFamily, salesperson }: { month?: string, brandFamily?: string, salesperson?: string }) => {
            const filters: any = {}
            if (month) {
                // Ensure YYYY-MM becomes YYYY-MM-01 for exact date matching if DB requires it
                // Or if DB stores just month strings, keep as is.
                // Based on error "invalid input syntax for type date: 2023-12", DB expects a date.
                const formattedMonth = month.length === 7 ? `${month}-01` : month
                filters.reportMonth = [formattedMonth]
            }
            if (brandFamily) filters.brandFamily = [brandFamily]
            if (salesperson) filters.salesperson = [salesperson]

            return await getMonthlySummary(filters)
        }
    }),

    find_venue_contact: tool({
        description: 'Search Google Maps for a venue to find Phone Number, Website, and Social Links. Use when data is missing.',
        parameters: z.object({
            venueName: z.string().describe('Name of the venue (e.g. "The Red Lion")'),
            city: z.string().describe('City or Town'),
            postcode: z.string().optional().describe('Postcode if known')
        }),
        execute: async ({ venueName, city, postcode }: { venueName: string, city: string, postcode?: string }) => {
            const { findVenueContact } = await import('@/lib/services/enrichment');
            try {
                const result = await findVenueContact(venueName, city, postcode);
                if (!result) return "No results found on Google Maps.";
                return result;
            } catch (error: any) {
                return `Error searching Google Maps: ${error.message}`;
            }
        }
    }),

    enrich_instagram: tool({
        description: 'Get deep profile insights from Instagram (Bio, Followers, Posts). REQUIREMENT: You must have a valid Instagram username/handle first.',
        parameters: z.object({
            username: z.string().describe('Instagram username (handle) without @')
        }),
        execute: async ({ username }: { username: string }) => {
            const { enrichInstagram } = await import('@/lib/services/enrichment');
            try {
                const result = await enrichInstagram(username);
                if (!result) return "No profile found or private account.";
                return result;
            } catch (error: any) {
                return `Error scraping Instagram: ${error.message}`;
            }
        }
    })
}
