import { getSystemPrompt } from '@/plugins/default/config/prompts/system'
import { createUserPrompt } from '@/plugins/default/config/prompts/user'

// 消息类型
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 会话存储
const conversations: Record<string, Message[]> = {}

/**
 * 消息处理函数类型
 * 用于处理发送消息后的响应
 */
export type MessageHandler = (response: string) => void

/**
 * 获取会话的唯一键
 */
export function getConversationKey(nodeId: string, projectId: string): string {
  return `${nodeId}:${projectId}`
}

/**
 * 检查会话是否存在
 */
export function hasConversation(nodeId: string, projectId: string): boolean {
  const key = getConversationKey(nodeId, projectId)
  return Boolean(conversations[key] && conversations[key].length > 0)
}

/**
 * 创建会话的初始消息
 */
export function createInitialMessages(projectId: string, uiInfo: any): Message[] {
  return [
    { role: 'system', content: getSystemPrompt(projectId) },
    { role: 'user', content: createUserPrompt(projectId, uiInfo) }
  ]
}

/**
 * 初始化新会话
 */
export function initializeConversation(nodeId: string, projectId: string, uiInfo: any): Message[] {
  const key = getConversationKey(nodeId, projectId)
  const messages = createInitialMessages(projectId, uiInfo)
  conversations[key] = [...messages]
  return messages
}

/**
 * 获取会话消息
 * 与getMessages保持兼容
 */
export function getConversation(nodeId: string, projectId: string): Message[] {
  const key = getConversationKey(nodeId, projectId)
  return conversations[key] || []
}
/**
 * 添加用户消息到会话
 */
export function addUserMessage(nodeId: string, projectId: string, content: string): void {
  if (!content) return

  const key = getConversationKey(nodeId, projectId)
  if (!conversations[key]) {
    conversations[key] = []
  }

  conversations[key].push({ role: 'user', content })
}

/**
 * 添加AI回复到会话
 */
export function addAssistantMessage(nodeId: string, projectId: string, content: string): void {
  if (!content) return

  const key = getConversationKey(nodeId, projectId)
  if (!conversations[key]) {
    conversations[key] = []
  }

  conversations[key].push({ role: 'assistant', content })
}

/**
 * 清除会话历史
 */
export function clearConversation(nodeId: string, projectId: string): void {
  const key = getConversationKey(nodeId, projectId)
  conversations[key] = []
}

/**
 * 获取或创建会话消息
 * 统一的会话准备函数 - 处理所有会话相关逻辑
 */
export function prepareConversation(
  nodeId: string | undefined,
  projectId: string,
  uiInfo: any,
  userMessage?: string
): Message[] {
  // 如果没有nodeId，不使用历史记录，直接返回新消息
  if (!nodeId) {
    return createInitialMessages(projectId, uiInfo)
  }

  // 检查是否存在会话
  const hasExisting = hasConversation(nodeId, projectId)

  // 如果不存在会话且提供了uiInfo，初始化新会话
  if (!hasExisting && uiInfo) {
    return initializeConversation(nodeId, projectId, uiInfo)
  }

  // 如果存在会话且有新消息，添加到历史
  if (hasExisting && userMessage) {
    addUserMessage(nodeId, projectId, userMessage)
  }

  // 返回当前会话消息
  return getConversation(nodeId, projectId)
}

/**
 * 向会话发送用户消息
 * 统一处理用户发送消息的逻辑
 *
 * @param nodeId 节点ID
 * @param projectId 项目ID
 * @param message 用户消息
 * @param uiInfo UI信息，用于初始化会话(如果需要)
 * @param generateResponse 生成响应的函数，通常是调用AI接口
 * @param onStreamUpdate 流式更新回调，用于实时显示生成内容
 * @returns 生成的AI响应
 */
export async function sendUserMessage(
  nodeId: string,
  projectId: string,
  message: string,
  uiInfo: any,
  generateResponse: (messages: Message[]) => AsyncGenerator<string, void, unknown>,
  onStreamUpdate?: (content: string) => void
): Promise<string> {
  if (!message.trim()) {
    return ''
  }

  // 添加用户消息到历史
  addUserMessage(nodeId, projectId, message)

  // 获取当前会话消息
  const messages = getConversation(nodeId, projectId)

  // 如果会话为空，可能需要初始化
  if (messages.length === 0 && uiInfo) {
    initializeConversation(nodeId, projectId, uiInfo)
  }

  // 调用生成响应的函数
  let fullResponse = ''

  try {
    // 通过生成器获取流式响应
    const responseGenerator = generateResponse(messages)

    for await (const chunk of responseGenerator) {
      fullResponse += chunk

      // 如果提供了流式更新回调，调用它
      if (onStreamUpdate) {
        onStreamUpdate(fullResponse)
      }
    }

    // 添加AI响应到历史
    if (fullResponse) {
      addAssistantMessage(nodeId, projectId, fullResponse)
    }

    return fullResponse
  } catch (error) {
    console.error('发送消息失败:', error)
    throw error
  }
}
