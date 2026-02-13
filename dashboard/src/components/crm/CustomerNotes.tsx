'use client'

import { useState } from 'react'
import { Plus, Phone, Mail, MessageSquare, Calendar, Tag, Edit2, Trash2, X } from 'lucide-react'
import { addCustomerNote, updateCustomerNote, deleteCustomerNote } from '@/app/actions/customer-notes'
import { NoteForm } from './NoteForm'

interface CustomerNote {
    id: string
    timestamp: string
    author: string
    type: 'call' | 'email' | 'meeting' | 'note'
    content: string
    tags?: string[]
}

interface CustomerNotesProps {
    accountId: string
    notes: CustomerNote[]
    onUpdate: () => void
}

const NOTE_TYPE_CONFIG = {
    call: { icon: Phone, label: 'Call', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    email: { icon: Mail, label: 'Email', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    meeting: { icon: Calendar, label: 'Meeting', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    note: { icon: MessageSquare, label: 'Note', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
}

export function CustomerNotes({ accountId, notes = [], onUpdate }: CustomerNotesProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingNote, setEditingNote] = useState<CustomerNote | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const handleAddNote = async (noteData: { type: 'call' | 'email' | 'meeting' | 'note'; content: string; tags: string[] }) => {
        const result = await addCustomerNote({
            accountId,
            ...noteData,
            author: 'Will Coates' // TODO: Get from auth context
        })

        if (result.success) {
            setIsFormOpen(false)
            onUpdate()
        } else {
            alert('Failed to add note: ' + result.message)
        }
    }

    const handleUpdateNote = async (noteData: { type: 'call' | 'email' | 'meeting' | 'note'; content: string; tags: string[] }) => {
        if (!editingNote) return

        const result = await updateCustomerNote({
            accountId,
            noteId: editingNote.id,
            ...noteData
        })

        if (result.success) {
            setEditingNote(null)
            onUpdate()
        } else {
            alert('Failed to update note: ' + result.message)
        }
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return

        setIsDeleting(noteId)
        const result = await deleteCustomerNote(accountId, noteId)

        if (result.success) {
            onUpdate()
        } else {
            alert('Failed to delete note: ' + result.message)
        }
        setIsDeleting(null)
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // Sort notes by timestamp (newest first)
    const sortedNotes = [...notes].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Call Logs & Notes</h3>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent text-background rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Note
                </button>
            </div>

            {/* Add/Edit Form */}
            {(isFormOpen || editingNote) && (
                <NoteForm
                    initialData={editingNote || undefined}
                    onSubmit={editingNote ? handleUpdateNote : handleAddNote}
                    onCancel={() => {
                        setIsFormOpen(false)
                        setEditingNote(null)
                    }}
                />
            )}

            {/* Notes List */}
            {sortedNotes.length === 0 && !isFormOpen && !editingNote ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface-elevated">
                    <MessageSquare className="w-12 h-12 text-foreground-muted mx-auto mb-3 opacity-50" />
                    <p className="text-foreground-muted text-sm">No notes yet</p>
                    <p className="text-foreground-muted text-xs mt-1">Add your first call log or note above</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedNotes.map((note) => {
                        const config = NOTE_TYPE_CONFIG[note.type]
                        const Icon = config.icon

                        return (
                            <div
                                key={note.id}
                                className="p-4 bg-surface-elevated border border-border rounded-xl hover:border-accent/30 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${config.color}`}>
                                            <Icon className="w-3 h-3" />
                                            {config.label}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            {formatTimestamp(note.timestamp)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingNote(note)}
                                            className="p-1 hover:bg-surface rounded text-foreground-muted hover:text-accent transition-colors"
                                            title="Edit note"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            disabled={isDeleting === note.id}
                                            className="p-1 hover:bg-surface rounded text-foreground-muted hover:text-danger transition-colors disabled:opacity-50"
                                            title="Delete note"
                                        >
                                            {isDeleting === note.id ? (
                                                <div className="w-3.5 h-3.5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                                    {note.content}
                                </p>

                                {note.tags && note.tags.length > 0 && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                                        <Tag className="w-3 h-3 text-foreground-muted" />
                                        <div className="flex flex-wrap gap-1">
                                            {note.tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 bg-surface border border-border rounded text-xs text-foreground-muted"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-foreground-muted mt-2 pt-2 border-t border-border">
                                    Added by {note.author}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
