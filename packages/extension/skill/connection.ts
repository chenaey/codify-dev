// Skill WebSocket connection (independent from MCP)

import { shallowRef } from 'vue'

import { logger } from '@/utils/log'
import { getCurrentPlatform, Platform } from '@/utils/platform'

import type { MessageFromServer, SkillCallMessage, SkillResultMessage } from './types'

import { executeSkillAction } from './handlers'

const SKILL_WS_PORT = 13581
const RECONNECT_DELAY_MS = 3000

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let enabled = false

// Reactive state for external access
export const skillSelfId = shallowRef<string | null>(null)
export const skillActiveId = shallowRef<string | null>(null)
export const skillCount = shallowRef(0)

function getPlatformName(): string {
  const platform = getCurrentPlatform()
  switch (platform) {
    case Platform.Figma:
      return 'figma'
    case Platform.MasterGo:
      return 'mastergo'
    default:
      return 'unknown'
  }
}

function parseMessage(data: string): MessageFromServer | null {
  try {
    const msg = JSON.parse(data)
    if (msg && typeof msg === 'object' && 'type' in msg) {
      return msg as MessageFromServer
    }
  } catch {
    // ignore
  }
  return null
}

function send(message: SkillResultMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

async function handleSkillCall(msg: SkillCallMessage): Promise<void> {
  logger.log(`[Skill] Received: ${msg.action}`, msg.params)

  const result = await executeSkillAction(msg.action, msg.params)

  const response: SkillResultMessage = {
    type: 'skillResult',
    id: msg.id,
    ...result
  }

  send(response)
  console.log('response', result)
  logger.log(`[Skill] Sent result for: ${msg.action}`, result.error ? 'error' : 'ok')
}

function handleMessage(event: MessageEvent<string>): void {
  const msg = parseMessage(event.data)
  if (!msg) return

  switch (msg.type) {
    case 'registered':
      skillSelfId.value = msg.id
      logger.log(`[Skill] Registered with id: ${skillSelfId.value}`)
      // Auto-activate on registration
      socket?.send(
        JSON.stringify({
          type: 'activate',
          info: { platform: getPlatformName() }
        })
      )
      break

    case 'state':
      skillActiveId.value = msg.activeId
      skillCount.value = msg.count
      logger.log(
        `[Skill] State: active=${msg.activeId === skillSelfId.value}, count=${msg.count}`
      )
      break

    case 'skillCall':
      handleSkillCall(msg)
      break
  }
}

function handleClose(): void {
  logger.log('[Skill] Connection closed')
  socket = null
  resetState()
  scheduleReconnect()
}

function handleError(): void {
  logger.warn('[Skill] Connection error')
}

function resetState(): void {
  skillSelfId.value = null
  skillActiveId.value = null
  skillCount.value = 0
}

function scheduleReconnect(): void {
  if (!enabled) return
  if (reconnectTimer) return

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY_MS)
}

function connect(): void {
  if (!enabled || socket) return

  try {
    socket = new WebSocket(`ws://127.0.0.1:${SKILL_WS_PORT}`)
    socket.addEventListener('message', handleMessage)
    socket.addEventListener('close', handleClose)
    socket.addEventListener('error', handleError)
    logger.log('[Skill] Connecting...')
  } catch {
    scheduleReconnect()
  }
}

function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (socket) {
    socket.removeEventListener('message', handleMessage)
    socket.removeEventListener('close', handleClose)
    socket.removeEventListener('error', handleError)
    socket.close()
    socket = null
  }

  resetState()
}

export function startSkillConnection(): void {
  if (enabled) return
  enabled = true
  connect()
  logger.log('[Skill] Started')
}

export function stopSkillConnection(): void {
  if (!enabled) return
  enabled = false
  disconnect()
  logger.log('[Skill] Stopped')
}

export function isSkillConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN
}

export function activateSkill(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    logger.log('[Skill] Activating...')
    socket.send(JSON.stringify({ type: 'activate', info: { platform: getPlatformName() } }))
  }
}