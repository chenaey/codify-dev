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

export interface WindowInfo {
  id: string
  title: string      // document.title（文件名）
  pageName: string   // 当前 Page 名称
  platform: string   // 'figma' | 'mastergo'
}

export interface StateMessage {
  type: 'state'
  activeId: string | null
  count: number
  windows?: WindowInfo[] // 所有已连接窗口列表（多窗口时由服务端下发）
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
    title?: string     // document.title（文件名）
    pageName?: string  // 当前 Page 名称
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
  node_id?: string
  windowId?: string          // 多窗口时指定目标窗口 ID
  window_id?: string         // snake_case 别名
  mode?: 'full' | 'skeleton' // 默认 'full'
}

export interface AssetInfo {
  nodeId: string
  name: string
  type: 'IMAGE' | 'VECTOR'
}

// skeleton 模式返回的精简节点结构（内部使用）
export interface SkeletonNode {
  id: string
  type: string
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' // 自动布局方向
  repeatCount?: number
  characters?: string // TEXT 节点的文本内容
  children?: SkeletonNode[]
}

// mode: 'full' 返回 design (JSON) + assets
// mode: 'skeleton' 返回 structure (缩进文本)，不含 assets
export interface GetDesignResult {
  rootNodeId: string
  design?: unknown // full 模式
  structure?: string // skeleton 模式：缩进式文本树
  assets?: AssetInfo[] // full 模式返回，skeleton 模式不返回
}

export interface GetScreenshotParams {
  nodeId?: string
  node_id?: string
  windowId?: string  // 多窗口时指定目标窗口 ID
  window_id?: string
}

export interface GetScreenshotResult {
  image: string
  width: number
  height: number
}

export interface AssetExportParams {
  nodeId: string
  node_id?: string
  format?: 'png' | 'svg'
  scale?: number
}

export interface GetAssetsParams {
  nodes: AssetExportParams[]
  windowId?: string  // 多窗口时指定目标窗口 ID
  window_id?: string
}

export interface ExportedAsset {
  nodeId: string
  name: string
  format: 'png' | 'svg'
  width: number
  height: number
  data: string
  // 单个资源导出失败时的错误信息
  error?: {
    code: string
    message: string
  }
}

export interface GetAssetsResult {
  assets: ExportedAsset[]
  // 汇总信息
  summary?: {
    total: number
    success: number
    failed: number
  }
}
