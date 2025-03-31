import { createUserPrompt } from '@/plugins/default/config/prompts/user'
import { getSystemPrompt } from '@/plugins/default/config/prompts/system'
import OpenAI from 'openai'
let client: OpenAI | null = null

const getClient = () => {
  if (client) return client
  return new OpenAI({
    dangerouslyAllowBrowser: true,
    baseURL: 'https://api.deepseek.com/v1'
  })
}

export async function* generateCode(uiInfo: any, projectId: string) {
  client = getClient()
  console.log(createUserPrompt(projectId, uiInfo))
  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: getSystemPrompt(projectId) },
      { role: 'user', content: createUserPrompt(projectId, uiInfo) }
    ],
    stream: true,
    temperature: 1
    // max_tokens: 10000,
  })

  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content || ''
  }
}
