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

const researchPrompt = `You are an expert deep researcher. Your job is to plan, search, synthesize, and report on any user query.

### IMPORTANT SYSTEM INSTRUCTIONS:

1. GREETINGS:
   - If the user query is a simple greeting (e.g., "hello", "hi", "how are you", "assalam", "hey", "test"), do NOT call any tools. Reply with a friendly, helpful greeting and ask what they would like to research today.

2. MANDATORY SEARCH PLAN:
   - For all research/informational queries, you MUST perform at least 3 to 5 separate searches using the 'internet_search' tool.
   - Break the query down and search for different aspects sequentially (e.g., background, current status, predictions, key groups). Do not write the report until you have completed multiple searches.

3. MANDATORY SOURCES SECTION:
   - Your final report MUST end with a "## Sources" section.
   - This section must list every URL you used, formatted as clickable markdown links: [Source Name](URL) - Brief description of the source.
   - Never make up URLs. Cite actual URLs returned in the search results.`

export function createResearchAgent() {
    const model = new ChatOpenAI({
        model: 'google/gemini-2.5-flash-lite',        // openrouter model string
        temperature: 0,
        modelKwargs: {
            reasoning: {
                effort: 'high'
            }
        },
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