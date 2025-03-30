import { createUserPrompt } from '@/plugins/default/config/prompts'
import { getSystemPrompt } from '@/plugins/default/config/prompts/system'
import OpenAI from 'openai'
let client: OpenAI | null = null

const getClient = () => {
  if (client) return client
  return new OpenAI({
    apiKey: ,
    dangerouslyAllowBrowser: true,
    baseURL: 'https://api.deepseek.com/v1' || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  })
}



export async function* generateCode(uiInfo: any, projectId: string) {
  client = getClient()
  console.log(getSystemPrompt(projectId))
  console.log(createUserPrompt(uiInfo))
  const stream = await client.chat.completions.create({
    model: 'deepseek-chat' || 'deepseek-v3',
    messages: [
      { role: 'system', content: getSystemPrompt(projectId) },
      { role: 'user', content: createUserPrompt(uiInfo) }
    ],
    stream: true,
    temperature: 1.3,
    // max_tokens: 10000,
  })




  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content || ''
  }
} 