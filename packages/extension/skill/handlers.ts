// Skill action handlers (independent from MCP)

import { options } from '@/ui/state'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'
import { getCurrentPlatform, Platform } from '@/utils/platform'

import type {
  AssetExportParams,
  AssetInfo,
  ExportedAsset,
  GetAssetsParams,
  GetAssetsResult,
  GetDesignParams,
  GetDesignResult,
  GetScreenshotParams,
  GetScreenshotResult,
  SkillAction,
  SkillError
} from './types'

// Error codes
const ERROR_CODES = {
  NO_SELECTION: 'NO_SELECTION',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  EXPORT_FAILED: 'EXPORT_FAILED'
} as const

function createError(code: string, message: string): SkillError {
  return { code, message }
}

function isSkillError(err: unknown): err is SkillError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as SkillError).code === 'string' &&
    typeof (err as SkillError).message === 'string'
  )
}

function isSceneNode(node: BaseNode | null): node is SceneNode {
  return !!node && 'visible' in node && 'type' in node
}

// Get current selection directly from platform API (not cached state)
function getCurrentSelection(): readonly SceneNode[] {
  const platform = getCurrentPlatform()
  
  if (platform === Platform.MasterGo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mg = (window as any).mg
    if (!mg?.document?.currentPage) {
      return []
    }
    return mg.document.currentPage.selection || []
  }
  
  // Figma: figma.currentPage.selection
  if (!window.figma?.currentPage) {
    return []
  }
  return window.figma.currentPage.selection || []
}

// Get node by ID using platform-specific API
function getNodeById(nodeId: string): BaseNode | null {
  const platform = getCurrentPlatform()
  
  if (platform === Platform.MasterGo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mg = (window as any).mg
    return mg?.getNodeById?.(nodeId) ?? null
  }
  
  return window.figma?.getNodeById?.(nodeId) ?? null
}

function resolveNode(nodeId?: string): SceneNode {
  if (nodeId) {
    const node = getNodeById(nodeId)
    // MasterGo: visible might be undefined, treat as visible
    if (!node || !('type' in node) || node.visible === false) {
      throw createError(ERROR_CODES.NODE_NOT_FOUND, `Node "${nodeId}" not found or not visible`)
    }
    return node as SceneNode
  }

  // Get selection directly from platform API to ensure freshness
  const currentSelection = getCurrentSelection()
  
  if (currentSelection.length !== 1) {
    throw createError(ERROR_CODES.NO_SELECTION, `Expected 1 node, got ${currentSelection.length}`)
  }
  
  const node = currentSelection[0]
  
  if (!node) {
    throw createError(ERROR_CODES.NO_SELECTION, 'Selected node is null')
  }
  
  // MasterGo: visible might be undefined (default to true)
  if (node.visible === false) {
    throw createError(ERROR_CODES.NO_SELECTION, 'Selected node is not visible')
  }

  return node
}

function getNodeName(node: SceneNode): string {
  return node.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'unnamed'
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Vector node types that should be exported as SVG
// Includes both Figma and MasterGo specific types:
// - Figma: VECTOR, BOOLEAN_OPERATION, STAR, LINE, ELLIPSE, POLYGON
// - MasterGo: REGULAR_POLYGON (instead of POLYGON), PEN (pen tool paths)
const VECTOR_LIKE_TYPES = new Set<string>([
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'POLYGON',
  'REGULAR_POLYGON',
  'PEN' // MasterGo pen tool paths
])

// Container types that may contain vector children
const CONTAINER_TYPES = new Set<string>(['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'])

// Check if a node has visible image fills
function hasImageFill(node: SceneNode): boolean {
  if (!('fills' in node) || !Array.isArray(node.fills)) {
    return false
  }
  return node.fills.some(
    (fill) => fill.type === 'IMAGE' && fill.visible !== false
  )
}

// Check if all children of a container are vector-like (SVG collapsible)
// Based on Figma-Context-MCP's collapseSvgContainers logic
function hasOnlyVectorChildren(node: SceneNode): boolean {
  if (!('children' in node) || !Array.isArray(node.children)) {
    return false
  }
  const children = node.children as SceneNode[]
  if (children.length === 0) {
    return false
  }
  return children.every((child) => {
    // Direct vector types
    if (VECTOR_LIKE_TYPES.has(child.type)) {
      return true
    }
    // Nested containers with only vector children
    if (CONTAINER_TYPES.has(child.type)) {
      return hasOnlyVectorChildren(child)
    }
    return false
  })
}

// Classify asset type based on node characteristics
// Strategy:
// 1. fileName hint: if fileName ends with .svg, it's VECTOR
// 2. Direct vector types → VECTOR
// 3. Containers with only vector children → VECTOR (icon containers)
// 4. Nodes with IMAGE fills → IMAGE
// 5. Default: undefined (caller decides)
function classifyAsset(
  node: SceneNode,
  fileName?: string
): 'VECTOR' | 'IMAGE' | undefined {
  // 1. fileName hint takes precedence (from iconExtractor's generateUniqueIconName)
  // If the file was named with .svg extension, it was identified as an icon
  if (fileName?.toLowerCase().endsWith('.svg')) {
    return 'VECTOR'
  }

  // 2. Direct vector types
  if (VECTOR_LIKE_TYPES.has(node.type)) {
    return 'VECTOR'
  }

  // 3. Check for IMAGE fills first (takes priority over container check)
  if (hasImageFill(node)) {
    return 'IMAGE'
  }

  // 4. Containers (FRAME, GROUP, COMPONENT, INSTANCE) with only vector children
  // These are typically icon wrappers and should be exported as SVG
  if (CONTAINER_TYPES.has(node.type) && hasOnlyVectorChildren(node)) {
    return 'VECTOR'
  }

  return undefined
}

// Extract assets info from resources map
// The resources map is populated by extractSelectedNodes/processVectorData
// It contains nodes identified as icons by isIconNode()
function extractAssetsInfo(resources: Map<string, unknown>): AssetInfo[] {
  const assets: AssetInfo[] = []
  for (const [resourceId, resource] of resources.entries()) {
    const res = resource as { node?: SceneNode; fileName?: string }
    const node = res.node
    const fileName = res.fileName

    // Classify based on fileName hint, node type, and fills
    const assetType = node ? classifyAsset(node, fileName) : undefined

    assets.push({
      nodeId: resourceId,
      name: fileName || node?.name || resourceId.slice(0, 8),
      // Default to VECTOR for icon resources (they're in resources map because isIconNode returned true)
      // Only use IMAGE if explicitly classified as such (has IMAGE fills)
      type: assetType || 'VECTOR'
    })
  }
  return assets
}

// Handler: get_design
async function handleGetDesign(params: GetDesignParams): Promise<GetDesignResult> {
  const node = resolveNode(params.nodeId)

  // Extract UI info using the same logic as copyPrompt
  const { nodes: uiInfo, resources } = await extractSelectedNodes([node])

  // Parse UI info with project type
  const projectType = options.value.project
  const design = parseUIInfo(uiInfo, projectType)

  // Extract assets info from resources
  const assets = extractAssetsInfo(resources)

  return {
    design,
    assets
  }
}

// Handler: get_screenshot
async function handleGetScreenshot(params: GetScreenshotParams): Promise<GetScreenshotResult> {
  const node = resolveNode(params.nodeId)

  const bytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 2 }
  })

  const base64 = bytesToBase64(bytes)
  const width = Math.round(node.width * 2)
  const height = Math.round(node.height * 2)

  return {
    image: `data:image/png;base64,${base64}`,
    width,
    height
  }
}

// Handler: get_assets
async function handleGetAssets(params: GetAssetsParams): Promise<GetAssetsResult> {
  const assets: ExportedAsset[] = []

  for (const req of params.nodes) {
    const asset = await exportSingleAsset(req)
    assets.push(asset)
  }

  return { assets }
}

async function exportSingleAsset(req: AssetExportParams): Promise<ExportedAsset> {
  const node = getNodeById(req.nodeId)
  // MasterGo: visible might be undefined, check for 'type' instead
  if (!node || !('type' in node)) {
    throw createError(ERROR_CODES.NODE_NOT_FOUND, `Node "${req.nodeId}" not found`)
  }

  const format = req.format || 'png'
  const scale = req.scale || 2
  const name = getNodeName(node)

  if (format === 'svg') {
    const bytes = await node.exportAsync({ format: 'SVG' })
    const data = new TextDecoder().decode(bytes)
    return {
      nodeId: req.nodeId,
      name,
      format: 'svg',
      width: Math.round(node.width),
      height: Math.round(node.height),
      data
    }
  }

  const bytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale }
  })

  return {
    nodeId: req.nodeId,
    name,
    format: 'png',
    width: Math.round(node.width * scale),
    height: Math.round(node.height * scale),
    data: `data:image/png;base64,${bytesToBase64(bytes)}`
  }
}

// Handler registry
type HandlerMap = {
  get_design: (params: GetDesignParams) => Promise<GetDesignResult>
  get_screenshot: (params: GetScreenshotParams) => Promise<GetScreenshotResult>
  get_assets: (params: GetAssetsParams) => Promise<GetAssetsResult>
}

const HANDLERS: HandlerMap = {
  get_design: handleGetDesign,
  get_screenshot: handleGetScreenshot,
  get_assets: handleGetAssets
}

export async function executeSkillAction(
  action: SkillAction,
  params: unknown
): Promise<{ payload?: unknown; error?: SkillError }> {
  try {
    const handler = HANDLERS[action]
    if (!handler) {
      return { error: createError('UNKNOWN_ACTION', `Unknown action: ${action}`) }
    }
    const payload = await handler(params as never)
    return { payload }
  } catch (err) {
    // Check if it's our custom SkillError object
    if (isSkillError(err)) {
      return { error: err }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: createError(ERROR_CODES.EXPORT_FAILED, message) }
  }
}