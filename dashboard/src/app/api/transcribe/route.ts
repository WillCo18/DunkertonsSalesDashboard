import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        console.log('[Transcribe] Processing file:', file.name, file.type, file.size)

        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        })

        console.log('[Transcribe] Success:', response.text)
        return NextResponse.json({ text: response.text })
    } catch (error: any) {
        console.error('[Transcribe] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
