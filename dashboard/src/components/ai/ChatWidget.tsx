'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { Bot, Send, Sparkles, ChevronDown, Mic, Loader2 } from 'lucide-react'

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)

    // Voice State
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    // Use standard SDK hook
    const { messages, input, setInput, append, isLoading, error } = useChat({
        api: '/api/chat',
        initialInput: '', // Ensure input is not undefined
        onError: (err) => console.error('Chat Error:', err)
    })

    // Local state only for the visual input field if needed, but SDK manages 'input'
    // using setInput from SDK is better for binding

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // --- Voice Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            mediaRecorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(track => track.stop()) // Stop mic

                await handleTranscription(audioBlob)
            }

            recorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error('Mic access denied:', err)
            alert('Could not access microphone. Please allow permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setIsTranscribing(true)
        }
    }

    const handleTranscription = async (blob: Blob) => {
        try {
            const formData = new FormData()
            formData.append('file', blob, 'audio.webm')

            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Transcription failed')

            const data = await res.json()
            if (data.text) {
                // Update SDK input state
                setInput(prev => (prev + ' ' + data.text).trim())
            }
        } catch (err) {
            console.error('Transcription error:', err)
        } finally {
            setIsTranscribing(false)
        }
    }
    // -------------------

    const handleSubmitWrapper = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input?.trim() || isLoading) return

        // SDK handles submission automatically if strict binding? 
        // Actually standard usage is just calling append or handleSubmit.
        // Let's use append to be safe given our manual/mixed input mode.

        await append({ role: 'user', content: input })
        setInput('')
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[380px] h-[600px] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">

                    <div className="p-4 border-b border-border bg-surface-elevated flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-accent/10 rounded-lg">
                                <Bot className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Agent D</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                    <span className="text-xs text-foreground-muted">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-border rounded-lg transition-colors text-foreground-muted hover:text-foreground"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface/50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-foreground-muted opacity-60">
                                <Sparkles className="w-12 h-12 mb-4 text-accent/50" />
                                <p className="text-sm">I&apos;m Agent D, your sales intelligence unit.</p>
                                <p className="text-xs mt-2">Ask me about sales trends, customer gaps, or drafting emails.</p>
                            </div>
                        )}

                        {messages.map(m => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm
                    ${m.role === 'user'
                                            ? 'bg-accent/10 text-accent-foreground border border-accent/20 rounded-br-none'
                                            : 'bg-surface-elevated text-foreground border border-border rounded-bl-none'
                                        }
                  `}
                                >
                                    {/* Tool Invocations Display */}
                                    {m.toolInvocations?.map(toolInvocation => {
                                        const toolCallId = toolInvocation.toolCallId;
                                        const addResult = 'result' in toolInvocation ? '✅ ' : '⏳ ';
                                        // Minimal UI for tool calls to show activity
                                        return (
                                            <div key={toolCallId} className="text-xs text-foreground-muted mb-1 italic">
                                                {addResult} Checking {toolInvocation.toolName}...
                                            </div>
                                        )
                                    })}

                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                                Error: {error.message}
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-surface-elevated border border-border rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                                    <span className="w-2 h-2 bg-foreground-muted/40 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-foreground-muted/40 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-foreground-muted/40 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-surface border-t border-border">
                        <form onSubmit={handleSubmitWrapper} className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isRecording ? "Listening..." : "Ask intelligence..."}
                                disabled={isRecording || isTranscribing}
                                className={`
                  flex-1 bg-surface-elevated border border-border rounded-lg px-4 py-2 text-sm text-foreground 
                  focus:outline-none focus:border-accent transition-colors placeholder:text-foreground-muted
                  ${isRecording ? 'border-destructive/50 animate-pulse bg-destructive/5' : ''}
                `}
                                autoFocus
                            />

                            <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isTranscribing || isLoading}
                                className={`
                  p-2 rounded-lg transition-colors flex items-center justify-center
                  ${isRecording
                                        ? 'bg-destructive text-white hover:bg-destructive/90'
                                        : 'bg-surface-elevated text-foreground-muted hover:text-foreground hover:bg-border'
                                    }
                  ${isTranscribing ? 'animate-spin' : ''}
                `}
                            >
                                {isTranscribing ? <Loader2 className="w-5 h-5" /> : <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />}
                            </button>

                            <button
                                type="submit"
                                disabled={isLoading || !input?.trim() || isRecording}
                                className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Send Message"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center justify-center w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-accent/25 transition-all duration-300 hover:scale-105"
                >
                    <div className="relative">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                        </span>
                    </div>
                </button>
            )}
        </div>
    )
}
