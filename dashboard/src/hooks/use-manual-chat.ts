import { useState, useCallback } from 'react'

export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt?: Date
}

export function useManualChat(apiEndpoint: string = '/api/chat') {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const append = useCallback(async (message: { role: 'user', content: string }) => {
        setIsLoading(true)
        setError(null)

        // Add user message immediately
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: message.content,
            createdAt: new Date()
        }
        setMessages(prev => [...prev, userMsg])

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
                })
            })

            if (!response.ok) throw new Error('Failed to fetch chat response')
            if (!response.body) throw new Error('No response body')

            // Create placeholder for assistant message
            const assistantId = (Date.now() + 1).toString()
            const assistantMsg: Message = {
                id: assistantId,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            }
            setMessages(prev => [...prev, assistantMsg])

            // Stream reader
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let done = false
            let fullContent = ''

            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value, { stream: true })
                fullContent += chunkValue

                // Update the last message (assistant) with accumulated content
                setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMsg = newMessages[newMessages.length - 1]
                    if (lastMsg.id === assistantId) {
                        lastMsg.content = fullContent
                    }
                    return newMessages
                })
            }

        } catch (err: any) {
            console.error('Chat error:', err)
            setError(err)
        } finally {
            setIsLoading(false)
        }
    }, [apiEndpoint, messages])

    return {
        messages,
        append,
        isLoading,
        error,
        setMessages // Helper if needed
    }
}
