'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

/**
 * Customer Notes Actions
 * 
 * Manages notes/call logs stored in dim_customer.enrichment.notes
 * 
 * Note structure:
 * {
 *   id: string (uuid)
 *   timestamp: string (ISO 8601)
 *   author: string
 *   type: 'call' | 'email' | 'meeting' | 'note'
 *   content: string
 *   tags: string[]
 * }
 */

type NoteType = 'call' | 'email' | 'meeting' | 'note'

interface CustomerNote {
    id: string
    timestamp: string
    author: string
    type: NoteType
    content: string
    tags?: string[]
}

interface AddNoteInput {
    accountId: string
    type: NoteType
    content: string
    author?: string
    tags?: string[]
}

interface UpdateNoteInput {
    accountId: string
    noteId: string
    content?: string
    type?: NoteType
    tags?: string[]
}

/**
 * Creates a Supabase client with service role key for backend operations
 */
function getSupabaseAdmin() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const keyToUse = serviceKey || anonKey

    if (!keyToUse) {
        throw new Error('Missing Supabase Key: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.')
    }

    return createClient(
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
}

/**
 * Add a new note to a customer's enrichment data
 */
export async function addCustomerNote(input: AddNoteInput) {
    try {
        const { accountId, type, content, author = 'System', tags = [] } = input

        if (!accountId || !content) {
            return { success: false, message: 'Account ID and content are required' }
        }

        const supabase = getSupabaseAdmin()

        // 1. Fetch current customer data
        const { data: customer, error: fetchError } = await supabase
            .from('dim_customer')
            .select('enrichment')
            .eq('del_account', accountId)
            .single()

        if (fetchError) throw fetchError
        if (!customer) return { success: false, message: 'Customer not found' }

        // 2. Prepare new note
        const newNote: CustomerNote = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            author,
            type,
            content,
            tags
        }

        // 3. Update enrichment data
        const enrichment = customer.enrichment || {}
        const notes = enrichment.notes || []
        notes.push(newNote)

        const updatedEnrichment = {
            ...enrichment,
            notes
        }

        // 4. Save to database
        const { error: updateError } = await supabase
            .from('dim_customer')
            .update({ enrichment: updatedEnrichment })
            .eq('del_account', accountId)

        if (updateError) throw updateError

        revalidatePath('/dunkertons')
        return { success: true, data: newNote }

    } catch (error: any) {
        console.error('Add Note Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Update an existing note
 */
export async function updateCustomerNote(input: UpdateNoteInput) {
    try {
        const { accountId, noteId, content, type, tags } = input

        if (!accountId || !noteId) {
            return { success: false, message: 'Account ID and note ID are required' }
        }

        const supabase = getSupabaseAdmin()

        // 1. Fetch current customer data
        const { data: customer, error: fetchError } = await supabase
            .from('dim_customer')
            .select('enrichment')
            .eq('del_account', accountId)
            .single()

        if (fetchError) throw fetchError
        if (!customer) return { success: false, message: 'Customer not found' }

        // 2. Find and update the note
        const enrichment = customer.enrichment || {}
        const notes = enrichment.notes || []
        const noteIndex = notes.findIndex((n: CustomerNote) => n.id === noteId)

        if (noteIndex === -1) {
            return { success: false, message: 'Note not found' }
        }

        // Update only provided fields
        if (content !== undefined) notes[noteIndex].content = content
        if (type !== undefined) notes[noteIndex].type = type
        if (tags !== undefined) notes[noteIndex].tags = tags

        const updatedEnrichment = {
            ...enrichment,
            notes
        }

        // 3. Save to database
        const { error: updateError } = await supabase
            .from('dim_customer')
            .update({ enrichment: updatedEnrichment })
            .eq('del_account', accountId)

        if (updateError) throw updateError

        revalidatePath('/dunkertons')
        return { success: true, data: notes[noteIndex] }

    } catch (error: any) {
        console.error('Update Note Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Delete a note
 */
export async function deleteCustomerNote(accountId: string, noteId: string) {
    try {
        if (!accountId || !noteId) {
            return { success: false, message: 'Account ID and note ID are required' }
        }

        const supabase = getSupabaseAdmin()

        // 1. Fetch current customer data
        const { data: customer, error: fetchError } = await supabase
            .from('dim_customer')
            .select('enrichment')
            .eq('del_account', accountId)
            .single()

        if (fetchError) throw fetchError
        if (!customer) return { success: false, message: 'Customer not found' }

        // 2. Remove the note
        const enrichment = customer.enrichment || {}
        const notes = enrichment.notes || []
        const filteredNotes = notes.filter((n: CustomerNote) => n.id !== noteId)

        if (filteredNotes.length === notes.length) {
            return { success: false, message: 'Note not found' }
        }

        const updatedEnrichment = {
            ...enrichment,
            notes: filteredNotes
        }

        // 3. Save to database
        const { error: updateError } = await supabase
            .from('dim_customer')
            .update({ enrichment: updatedEnrichment })
            .eq('del_account', accountId)

        if (updateError) throw updateError

        revalidatePath('/dunkertons')
        return { success: true, message: 'Note deleted' }

    } catch (error: any) {
        console.error('Delete Note Error:', error)
        return { success: false, message: error.message }
    }
}
