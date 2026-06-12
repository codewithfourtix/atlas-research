import { tool } from 'langchain/tools'
import { TavilySearch } from '@langchain/tavily'
import { ChatOpenAI } from '@langchain/openai'
import { createDeepAgent } from 'deepagents'
import { z } from 'zod'

const internetSearch = tool(
    async ({ query, maxResults = 5, topic = 'general' }: {
        query: string
        maxResults?: number
        topic?: 'general' | 'news' | 'finance'
    }) => {
        const tavilySearch = new TavilySearch({
            maxResults,
            tavilyApiKey: process.env.TAVILY_API_KEY,
            topic,
        })
        return await tavilySearch._call({ query })
    },
    {
        name: 'internet_search',
        description: 'Search the web for information on a given query',
        schema: z.object({
            query: z.string().describe('The search query'),
            maxResults: z.number().optional().default(5),
            topic: z.enum(['general', 'news', 'finance']).optional().default('general'),
        }),
    }
)

const researchPrompt = `You are an expert deep researcher. Your job is to:
1. Plan your research thoroughly using write_todos
2. Search the web multiple times with different queries to gather comprehensive information
3. Synthesize findings into a well-structured, detailed report
4. Write the final report with clear sections: Summary, Key Findings, Details, Sources

Always cite your sources. Be thorough — search at least 5-8 times before writing the report.`

export function createResearchAgent() {
    const model = new ChatOpenAI({
        model: 'google/gemini-2.5-flash-lite',        // openrouter model string
        temperature: 0,
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
        },
    })

    return createDeepAgent({
        model,
        tools: [internetSearch],
        systemPrompt: researchPrompt,
    })
}