import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createResearchAgent } from '@/lib/agent/research'

export async function POST(req: NextRequest) {
    const { query } = await req.json()

    if (!query?.trim()) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // create session
    const { data: session, error } = await supabase
        .from('research_sessions')
        .insert({ query, status: 'running' })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // run agent in background (don't await)
    runAgent(session.id, query, supabase)

    return NextResponse.json({ sessionId: session.id })
}

function extractText(content: any): string {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
        return content
            .map((block) => {
                if (typeof block === 'string') return block
                if (block && typeof block === 'object') {
                    if ('text' in block && typeof block.text === 'string') {
                        return block.text
                    }
                }
                return ''
            })
            .join('')
    }
    return ''
}

async function runAgent(sessionId: string, query: string, supabase: any) {
    try {
        const agent = createResearchAgent()

        const addStep = async (step_type: string, content: string) => {
            await supabase.from('research_steps').insert({ session_id: sessionId, step_type, content })
        }

        await addStep('planning', `Starting deep research on: "${query}"`)

        let finalReport = ''
        let files: Record<string, any> = {}

        const stream = await agent.stream(
            { messages: [{ role: 'user', content: query }] },
            { recursionLimit: 50 }
        )

        for await (const chunk of stream) {
            // track files in graph state
            const chunkFiles = chunk.agent?.files || chunk.model_request?.files || chunk.tools?.files
            if (chunkFiles) {
                files = { ...files, ...chunkFiles }
            }

            // handle different chunk types from deepagents (checking both agent and model_request nodes)
            const agentMessages = chunk.agent?.messages || chunk.model_request?.messages
            if (agentMessages) {
                for (const msg of agentMessages) {
                    const text = extractText(msg.content)
                    if (text && text.trim()) {
                        finalReport = text
                        const msgAny = msg as any
                        const hasToolCalls = msgAny.tool_calls && msgAny.tool_calls.length > 0
                        const isFinalReport = !hasToolCalls && (text.includes('Summary') || text.includes('Key Findings') || text.includes('Sources') || text.length > 300)
                        const stepType = isFinalReport ? 'writing' : 'synthesizing'
                        await addStep(stepType, text.slice(0, 200) + (text.length > 200 ? '...' : ''))
                    }
                }
            }

            if (chunk.tools?.messages) {
                for (const msg of chunk.tools.messages) {
                    if (msg.name === 'internet_search') {
                        let queryVal = '...'
                        try {
                            const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                            queryVal = JSON.parse(contentStr || '{}')?.query || '...'
                        } catch (e) {
                            // ignore
                        }
                        await addStep('searching', `Searched: ${queryVal}`)
                        await addStep('synthesizing', `Analyzing search results for "${queryVal}"...`)
                    }
                }
            }
        }

        // Look for markdown or text files in the state to use as the final report if written
        let fileReport = ''
        const fileKeys = Object.keys(files)
        if (fileKeys.length > 0) {
            const preferredKeys = ['report.md', 'summary.md', 'research.md', 'research_report.md']
            let selectedKey = fileKeys.find(k => preferredKeys.includes(k.toLowerCase()))
            
            if (!selectedKey) {
                selectedKey = fileKeys.find(k => k.endsWith('.md') || k.endsWith('.txt'))
            }
            if (!selectedKey) {
                selectedKey = fileKeys[0]
            }
            
            if (selectedKey && files[selectedKey]) {
                const fileData = files[selectedKey]
                const content = fileData.content
                if (typeof content === 'string') {
                    fileReport = content
                } else if (content instanceof Uint8Array) {
                    fileReport = new TextDecoder().decode(content)
                } else if (content && typeof content === 'object') {
                    if (Array.isArray(content)) {
                        fileReport = content.join('\n')
                    } else if (Array.isArray(content.content)) {
                        fileReport = content.content.join('\n')
                    }
                }
            }
        }

        if (fileReport) {
            finalReport = fileReport
        }

        await addStep('done', 'Research complete.')

        await supabase
            .from('research_sessions')
            .update({ status: 'completed', report: finalReport, updated_at: new Date().toISOString() })
            .eq('id', sessionId)

    } catch (err: any) {
        console.error('Agent error:', err)
        await supabase
            .from('research_sessions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
    }
}