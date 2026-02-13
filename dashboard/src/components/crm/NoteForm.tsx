'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface NoteFormProps {
    initialData?: {
        type: 'call' | 'email' | 'meeting' | 'note'
        content: string
        tags?: string[]
    }
    onSubmit: (data: { type: 'call' | 'email' | 'meeting' | 'note'; content: string; tags: string[] }) => Promise<void>
    onCancel: () => void
}

export function NoteForm({ initialData, onSubmit, onCancel }: NoteFormProps) {
    const [type, setType] = useState<'call' | 'email' | 'meeting' | 'note'>(initialData?.type || 'call')
    const [content, setContent] = useState(initialData?.content || '')
    const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!content.trim()) {
            alert('Please enter note content')
            return
        }

        setIsSubmitting(true)
        try {
            const tags = tagsInput
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0)

            await onSubmit({ type, content: content.trim(), tags })
        } catch (error) {
            console.error('Submit error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="p-4 bg-surface-elevated border border-accent/30 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-foreground">
                    {initialData ? 'Edit Note' : 'Add New Note'}
                </h4>
                <button
                    onClick={onCancel}
                    className="p-1 hover:bg-surface rounded text-foreground-muted hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Type Selector */}
                <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                        Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {(['call', 'email', 'meeting', 'note'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`px-3 py-2 rounded-md text-xs font-medium capitalize transition-colors ${type === t
                                        ? 'bg-accent text-background'
                                        : 'bg-surface border border-border text-foreground-muted hover:border-accent/30'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                        Content
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter note details..."
                        rows={4}
                        className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent resize-none"
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                        Tags (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="e.g., upsell, craft, follow-up"
                        className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="px-4 py-1.5 bg-accent text-background rounded-md text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Add Note'}
                    </button>
                </div>
            </form>
        </div>
    )
}
