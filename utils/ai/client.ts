import { options } from '@/ui/state'
import OpenAI from 'openai'

import { 
  Message,
  prepareConversation,
  addAssistantMessage,
  getConversation,
  clearConversation,
  sendUserMessage
} from './conversation'

// OpenAI 客户端单例
let client: OpenAI | null = null

/**
 * 获取API客户端
 */
const getClient = () => {
  if (client) return client
  
  // 使用存储在state中的API设置，如果不存在则使用默认值
  const apiSettings = options.value.apiSettings || {};
  const apiKey = apiSettings.apiKey;
  const baseURL = apiSettings.baseURL || 'https://api.deepseek.com/v1';
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
    baseURL
  })
}

/**
 * 生成代码 - 使用流式API响应
 */
export async function* generateCode(uiInfo: any, projectId: string, nodeId?: string, userMessage?: string) {
  // 获取API客户端
  client = getClient()
  
  // 准备对话消息
  const messages = prepareConversation(nodeId, projectId, uiInfo, userMessage)
  
  // 日志记录
  console.log('Sending messages:', messages)
  
  // 创建流式请求
  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    stream: true,
    temperature: 1.0
  })

  // 保存完整响应
  let fullResponse = ''
  
  // 流式处理响应
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    fullResponse += content
    yield content
  }
  
  // 将AI回复添加到历史
  if (nodeId && fullResponse) {
    addAssistantMessage(nodeId, projectId, fullResponse)
  }
}

/**
 * 创建消息生成器函数
 * 用于sendUserMessage
 */
export function createResponseGenerator(uiInfo: any, projectId: string, nodeId: string) {
  return async function* (messages: Message[]) {
    // 获取API客户端
    client = getClient()
    
    // 创建流式请求
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      stream: true,
      temperature: 1.0
    })
    
    // 流式处理响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      yield content
    }
  }
}

// 重新导出会话管理模块的函数
export { getConversation, clearConversation, sendUserMessage }
