import { nanoid } from 'nanoid'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

import type {
  ActivateMessage,
  ExtensionConnection,
  MessageFromExtension,
  PendingRequest,
  RegisteredMessage,
  SkillAction,
  SkillCallMessage,
  SkillResultMessage,
  StateMessage
} from './types'

import { log, TOOL_TIMEOUT_MS } from './config'

const extensions: ExtensionConnection[] = []
const pendingRequests = new Map<string, PendingRequest>()

let wss: WebSocketServer | null = null

export function getExtensions(): readonly ExtensionConnection[] {
  return extensions
}

export function getActiveExtension(): ExtensionConnection | undefined {
  return extensions.find((e) => e.active)
}

function setActive(targetId: string | null): void {
  extensions.forEach((e) => {
    e.active = targetId !== null && e.id === targetId
  })
}

function broadcastState(): void {
  const activeId = getActiveExtension()?.id ?? null
  const message: StateMessage = {
    type: 'state',
    activeId,
    count: extensions.length
  }
  const payload = JSON.stringify(message)
  extensions.forEach((ext) => ext.ws.send(payload))
}

function rawDataToString(raw: RawData): string {
  if (typeof raw === 'string') return raw
  if (Buffer.isBuffer(raw)) return raw.toString('utf-8')
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf-8')
  return Buffer.concat(raw).toString('utf-8')
}

function parseMessage(raw: RawData): MessageFromExtension | null {
  try {
    const data = JSON.parse(rawDataToString(raw))
    if (data && typeof data === 'object' && 'type' in data) {
      return data as MessageFromExtension
    }
    return null
  } catch {
    return null
  }
}

function handleActivate(ext: ExtensionConnection, msg: ActivateMessage): void {
  if (msg.info) {
    ext.info = msg.info
  }
  setActive(ext.id)
  log.info({ id: ext.id, info: ext.info }, 'Extension activated')
  broadcastState()
}

function handleSkillResult(msg: SkillResultMessage): void {
  const pending = pendingRequests.get(msg.id)
  if (!pending) {
    log.warn({ id: msg.id }, 'Received result for unknown request')
    return
  }

  clearTimeout(pending.timer)
  pendingRequests.delete(msg.id)

  // Preserve original error structure instead of throwing
  if (msg.error) {
    pending.resolve({ error: msg.error })
  } else {
    pending.resolve(msg.payload)
  }
}

function handleMessage(ext: ExtensionConnection, raw: RawData): void {
  const msg = parseMessage(raw)
  if (!msg) {
    log.warn({ extId: ext.id }, 'Invalid message format')
    return
  }

  switch (msg.type) {
    case 'activate':
      handleActivate(ext, msg)
      break
    case 'skillResult':
      handleSkillResult(msg)
      break
  }
}

function handleClose(ext: ExtensionConnection): void {
  const index = extensions.findIndex((e) => e.id === ext.id)
  if (index > -1) extensions.splice(index, 1)

  log.info({ id: ext.id }, `Extension disconnected. Remaining: ${extensions.length}`)

  // Reject pending requests for this extension
  for (const [reqId, pending] of pendingRequests.entries()) {
    if (pending.extensionId === ext.id) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Extension disconnected'))
      pendingRequests.delete(reqId)
    }
  }

  if (ext.active) {
    setActive(null)
  }

  broadcastState()

  // Auto-activate if only one extension left
  if (extensions.length === 1 && !getActiveExtension()) {
    setActive(extensions[0].id)
    broadcastState()
  }
}

function handleConnection(ws: WebSocket): void {
  const ext: ExtensionConnection = { id: nanoid(), ws, active: false }
  extensions.push(ext)
  log.info({ id: ext.id }, `Extension connected. Total: ${extensions.length}`)

  // Send registration
  const regMsg: RegisteredMessage = { type: 'registered', id: ext.id }
  ws.send(JSON.stringify(regMsg))

  // Auto-activate if this is the only extension
  if (extensions.length === 1) {
    setActive(ext.id)
  }

  broadcastState()

  ws.on('message', (raw) => handleMessage(ext, raw))
  ws.on('close', () => handleClose(ext))
  ws.on('error', (err) => log.error({ extId: ext.id, err }, 'WebSocket error'))
}

export function startWebSocketServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    wss = new WebSocketServer({ host: '127.0.0.1', port })

    wss.once('error', (err) => {
      reject(err)
    })

    wss.once('listening', () => {
      log.info({ port }, 'WebSocket server ready')
      wss!.on('connection', handleConnection)
      resolve()
    })
  })
}

export function stopWebSocketServer(): void {
  if (wss) {
    wss.close()
    wss = null
  }
}

export function callExtension<T = unknown>(action: SkillAction, params: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const ext = getActiveExtension()
    if (!ext) {
      reject(new Error('No active extension connected'))
      return
    }

    const requestId = nanoid()
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId)
      reject(new Error(`Request timed out after ${TOOL_TIMEOUT_MS}ms`))
    }, TOOL_TIMEOUT_MS)

    pendingRequests.set(requestId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timer,
      extensionId: ext.id
    })

    const message: SkillCallMessage = {
      type: 'skillCall',
      id: requestId,
      action,
      params
    }

    ext.ws.send(JSON.stringify(message))
    log.info({ action, requestId, extId: ext.id }, 'Forwarded skill call')
  })
}
