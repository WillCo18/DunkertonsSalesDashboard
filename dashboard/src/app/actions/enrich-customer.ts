'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { findVenueContact, enrichInstagram } from '@/lib/services/enrichment'

// Top-level client removed to prevent initialization errors.
// Clients are created per-request inside actions.


export async function enrichCustomerAction(customer: any) {
    if (!customer || !customer.del_account) return { success: false, message: "Invalid customer" }

    try {
        console.log(`[Action] Enriching ${customer.customer_name}...`)

        // 1. Google Maps Search
        console.log(`[Action] Input Data: Name="${customer.customer_name}", City="${customer.delivery_city}", Postcode="${customer.delivery_postcode}"`)

        const mapsData = await findVenueContact(
            customer.customer_name,
            customer.delivery_city,
            customer.delivery_postcode,
            customer.delivery_address
        )

        if (!mapsData) return { success: false, message: "No venue found on Google Maps" }

        // 2. Prepare Enrichment Data
        const enrichment: any = {
            ...customer.enrichment, // Keep existing notes/tags
            contacts: customer.enrichment?.contacts || [],
            socials: customer.enrichment?.socials || {}
        }

        // Add Contact Info if missing
        if (mapsData.phone && !enrichment.phone) enrichment.phone = mapsData.phone
        if (mapsData.website && !enrichment.website) {
            // Ensure website has protocol prefix
            const site = mapsData.website
            enrichment.website = site.startsWith('http') ? site : `https://${site}`
        }

        // Add Social Links - handle both object and array formats from Google Maps
        if (mapsData.social_profiles) {
            console.log('[Action] Raw social_profiles:', JSON.stringify(mapsData.social_profiles))
            if (Array.isArray(mapsData.social_profiles)) {
                // Array format: [{ platform: "instagram", url: "..." }, ...]
                for (const profile of mapsData.social_profiles) {
                    const platform = (profile.platform || profile.type || '').toLowerCase()
                    const url = profile.url || profile.link || ''
                    if (platform && url) {
                        enrichment.socials[platform] = url
                    }
                    // Also check URL for platform hints
                    if (url.includes('instagram.com')) enrichment.socials.instagram = url
                    if (url.includes('facebook.com')) enrichment.socials.facebook = url
                }
            } else if (typeof mapsData.social_profiles === 'object') {
                enrichment.socials = { ...enrichment.socials, ...mapsData.social_profiles }
            }
        }

        // Also check website URL for Instagram link as fallback
        if (mapsData.website && mapsData.website.includes('instagram.com') && !enrichment.socials.instagram) {
            enrichment.socials.instagram = mapsData.website
        }

        // 2b. Fallback: scrape website for Instagram link if not found via Google Maps
        if (!enrichment.socials?.instagram && enrichment.website) {
            try {
                console.log('[Action] No Instagram from Google Maps, checking website:', enrichment.website)
                const res = await fetch(enrichment.website, { signal: AbortSignal.timeout(5000) })
                const html = await res.text()
                const igMatch = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i)
                if (igMatch && igMatch[1] && !['p', 'reel', 'explore', 'accounts'].includes(igMatch[1])) {
                    enrichment.socials.instagram = `https://instagram.com/${igMatch[1]}`
                    console.log('[Action] Found Instagram from website:', igMatch[1])
                }
            } catch (e) {
                console.log('[Action] Website scrape failed (non-blocking):', (e as Error).message)
            }
        }

        // 3. Instagram Enrichment (if handle found)
        let instagramHandle = enrichment.socials?.instagram || enrichment.socials?.instagram_id || null

        console.log('[Action] Instagram handle found:', instagramHandle)

        // If we found a handle/URL, deep dive
        if (instagramHandle) {
            // Extract handle from URL if needed
            const handle = instagramHandle.includes('instagram.com')
                ? instagramHandle.split('instagram.com/')[1]?.replace(/\/$/, '').split('?')[0]
                : instagramHandle.replace('@', '')
            if (handle) {
                console.log('[Action] Enriching Instagram handle:', handle)
                const instaData = await enrichInstagram(handle)
                if (instaData) {
                    enrichment.instagram_cnt = instaData.followersCount
                    enrichment.instagram_bio = instaData.biography
                    enrichment.latest_posts = instaData.latestPosts
                    enrichment.socials.instagram_id = handle
                }
            }
        }

        // 4. Update Database
        // We need a way to verify we have write access. 
        // Assuming we use the SERVICE_ROLE key for backend updates or the client allows it.
        // Let's rely on the anonymous key if RLS allows update, otherwise we need service key.
        // Given this is a dashboard, we likely have a service key in env or we should use it.
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        console.log('[Action] Keys Check:', {
            hasServiceKey: !!serviceKey,
            hasAnonKey: !!anonKey,
            serviceKeyLen: serviceKey?.length,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL
        });

        const keyToUse = serviceKey || anonKey;

        if (!keyToUse) {
            throw new Error("Missing Supabase Key: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            keyToUse,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        )

        const { error } = await supabaseAdmin
            .from('dim_customer')
            .update({ enrichment: enrichment })
            .eq('del_account', customer.del_account)

        if (error) throw error

        revalidatePath('/accounts')
        return { success: true, data: enrichment }

    } catch (error: any) {
        console.error('Enrichment Action Error:', error)
        return { success: false, message: error.message }
    }
}
