// Skill WebSocket message types (independent from MCP)

export type SkillAction = 'get_design' | 'get_screenshot' | 'get_assets'

export interface SkillError {
  code: string
  message: string
}

// Messages from server
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

export type MessageFromServer = RegisteredMessage | StateMessage | SkillCallMessage

// Messages to server
export interface ActivateMessage {
  type: 'activate'
  info?: {
    platform?: string
    fileKey?: string
    fileName?: string
  }
}

export interface SkillResultMessage {
  type: 'skillResult'
  id: string
  payload?: unknown
  error?: SkillError
}

export type MessageToServer = ActivateMessage | SkillResultMessage

// Request/Response types for handlers
export interface GetDesignParams {
  nodeId?: string
}

export interface AssetInfo {
  nodeId: string
  name: string
  type: 'IMAGE' | 'VECTOR'
}

export interface GetDesignResult {
  design: unknown
  assets: AssetInfo[]
}

export interface GetScreenshotParams {
  nodeId?: string
}

export interface GetScreenshotResult {
  image: string
  width: number
  height: number
}

export interface AssetExportParams {
  nodeId: string
  format?: 'png' | 'svg'
  scale?: number
}

export interface GetAssetsParams {
  nodes: AssetExportParams[]
}

export interface ExportedAsset {
  nodeId: string
  name: string
  format: 'png' | 'svg'
  width: number
  height: number
  data: string
}

export interface GetAssetsResult {
  assets: ExportedAsset[]
}
