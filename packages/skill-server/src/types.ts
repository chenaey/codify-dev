import type { WebSocket } from 'ws'

// Extension connection
export interface ExtensionConnection {
  id: string
  ws: WebSocket
  active: boolean
  info?: ExtensionInfo
}

export interface ExtensionInfo {
  platform?: string
  fileKey?: string
  fileName?: string
}

export interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: NodeJS.Timeout
  extensionId: string
}

// WebSocket messages: Server → Extension
export interface RegisteredMessage {
  type: 'registered'
  id: string
}

export interface StateMessage {
  type: 'state'
  activeId: string | null
  count: number
}

export interface SkillCallMessage {
  type: 'skillCall'
  id: string
  action: SkillAction
  params: unknown
}

export type MessageToExtension = RegisteredMessage | StateMessage | SkillCallMessage

// WebSocket messages: Extension → Server
export interface ActivateMessage {
  type: 'activate'
  info?: ExtensionInfo
}

export interface SkillResultMessage {
  type: 'skillResult'
  id: string
  payload?: unknown
  error?: SkillError
}

export type MessageFromExtension = ActivateMessage | SkillResultMessage

// Skill actions (matching API endpoints)
export type SkillAction = 'get_design' | 'get_screenshot' | 'get_assets'

// Error types
export type SkillErrorCode =
  | 'NOT_CONNECTED'
  | 'NO_SELECTION'
  | 'NODE_NOT_FOUND'
  | 'EXPORT_FAILED'
  | 'TIMEOUT'

export interface SkillError {
  code: SkillErrorCode
  message: string
}

// API request/response types
export interface GetDesignRequest {
  nodeId?: string
}

export interface GetDesignResponse {
  design: unknown
  assets: AssetInfo[]
}

export interface AssetInfo {
  nodeId: string
  name: string
  type: 'IMAGE' | 'VECTOR'
}

export interface GetScreenshotRequest {
  nodeId?: string
}

export interface GetScreenshotResponse {
  image: string // data:image/png;base64,...
  width: number
  height: number
}

export interface AssetExportRequest {
  nodeId: string
  format?: 'png' | 'svg'
  scale?: number
}

export interface GetAssetsRequest {
  nodes: AssetExportRequest[]
}

export interface ExportedAsset {
  nodeId: string
  name: string
  format: 'png' | 'svg'
  width: number
  height: number
  data: string // base64 for png, svg string for svg
}

export interface GetAssetsResponse {
  assets: ExportedAsset[]
}

// Status response
export interface StatusResponse {
  ready: boolean
  platform?: string
  activeId?: string
  count: number
}
