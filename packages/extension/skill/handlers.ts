// Skill action handlers (independent from MCP)

import { options } from '@/ui/state'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'
import { getCurrentPlatform, Platform } from '@/utils/platform'

import { detectRepeatingPatterns, buildSkipIds, getRepeatInfo } from './extract/compress'
import { compressToJpeg } from '@/utils/compress'
import { isIconNode } from '@/utils/iconExtractor'

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
  SkeletonNode,
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
  return node.fills.some((fill) => fill.type === 'IMAGE' && fill.visible !== false)
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
function classifyAsset(node: SceneNode, fileName?: string): 'VECTOR' | 'IMAGE' | undefined {
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

// ============ Skeleton 提取（轻量级，跳过 CSS）============

// 装饰性节点类型（在 skeleton 中跳过）
// 这些通常是背景、边框等装饰元素，对理解结构无帮助
const DECORATIVE_TYPES = new Set(['RECTANGLE', 'ELLIPSE', 'LINE', 'VECTOR'])

// 获取节点的 layoutMode
function getLayoutMode(node: SceneNode): 'HORIZONTAL' | 'VERTICAL' | undefined {
  // Figma: layoutMode
  if ('layoutMode' in node) {
    const mode = (node as FrameNode).layoutMode
    if (mode === 'HORIZONTAL' || mode === 'VERTICAL') {
      return mode
    }
  }
  // MasterGo: flexMode
  if ('flexMode' in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mode = (node as any).flexMode
    if (mode === 'HORIZONTAL' || mode === 'VERTICAL') {
      return mode
    }
  }
  return undefined
}

/**
 * 从原始 Figma/MasterGo 节点提取 skeleton
 *
 * 优化策略：
 * 1. SVG 容器折叠：GROUP/FRAME 内全是 VECTOR → 标记为 ICON
 * 2. 过滤装饰节点：无子节点的 RECTANGLE/ELLIPSE/LINE → 跳过
 * 3. 添加 layoutMode：仅自动布局容器
 * 4. 折叠单子 GROUP：只有 1 个子节点的 GROUP → 提升子节点
 */
function extractSkeletonNode(
  node: SceneNode,
  resources: Map<string, { node: SceneNode; fileName: string }>,
  parentNode?: SceneNode
): SkeletonNode | null {
  // 跳过隐藏节点
  if ('visible' in node && node.visible === false) {
    return null
  }

  // 如果父节点已被识别为图标，跳过子节点处理
  if (parentNode && isIconNode(parentNode)) {
    return null
  }

  // 判断是否为图标节点
  // isIconNode 已整合所有图标识别逻辑：
  // - 尺寸判断（≤64px）
  // - SVG 容器折叠（hasOnlyVectorDescendants）
  // - 组合图标合并（shouldMergeAsIcon：≤80×48 且全是矢量子节点）
  const nodeIsIcon = isIconNode(node)

  // 优化 2: 过滤装饰节点 - 无子节点的 RECTANGLE/ELLIPSE/LINE
  if (!nodeIsIcon && DECORATIVE_TYPES.has(node.type)) {
    // 装饰节点直接跳过，不输出到 skeleton
    return null
  }

  const nodeType = nodeIsIcon ? 'ICON' : node.type

  const skeleton: SkeletonNode = {
    id: node.id,
    type: nodeType
  }

  // 优化 3: 添加 layoutMode（仅自动布局容器）
  if (!nodeIsIcon) {
    const layoutMode = getLayoutMode(node)
    if (layoutMode) {
      skeleton.layoutMode = layoutMode
    }
  }

  // TEXT 节点：提取文本内容
  if (node.type === 'TEXT') {
    skeleton.characters = (node as TextNode).characters
  }

  // 图标节点：注册到资源集合，不递归子节点
  if (nodeIsIcon) {
    const fileName = `${node.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.svg`
    resources.set(node.id, { node, fileName })
    return skeleton
  }

  // 递归处理子节点
  if ('children' in node && Array.isArray(node.children)) {
    const visibleChildren = (node.children as SceneNode[]).filter(
      (c) => !('visible' in c) || c.visible !== false
    )

    // 检测重复模式（与 uiExtractor 逻辑一致）
    const shouldDetectPatterns = !['GROUP', 'PEN'].includes(node.type)
    const patterns = shouldDetectPatterns ? detectRepeatingPatterns(visibleChildren) : new Map()
    const skipIds = buildSkipIds(patterns)

    const children: SkeletonNode[] = []
    for (const child of visibleChildren) {
      // 跳过重复节点
      if (skipIds.has(child.id)) continue

      const childSkeleton = extractSkeletonNode(child, resources, node)
      if (childSkeleton) {
        // 添加重复信息
        const repeatInfo = getRepeatInfo(child.id, patterns)
        if (repeatInfo) {
          childSkeleton.repeatCount = repeatInfo.repeatCount
        }
        children.push(childSkeleton)
      }
    }

    // 优化 4: 折叠单子 GROUP - 只有 1 个子节点的 GROUP → 提升子节点
    if (node.type === 'GROUP' && children.length === 1) {
      // 直接返回子节点，跳过这个 GROUP 包装层
      return children[0]
    }

    // 优化 5: 空容器过滤 - 如果所有子节点都被过滤了，容器本身也过滤
    if (children.length === 0) {
      // GROUP 没有有意义的子节点，跳过
      if (node.type === 'GROUP') {
        return null
      }
      // 其他类型（FRAME 等）保留，可能有背景样式
    } else {
      skeleton.children = children
    }
  }

  return skeleton
}

/**
 * 从 skeleton 提取过程中收集的资源生成 assets 列表
 */
function extractAssetsFromResources(
  resources: Map<string, { node: SceneNode; fileName: string }>
): AssetInfo[] {
  const assets: AssetInfo[] = []
  for (const [resourceId, { node, fileName }] of resources.entries()) {
    const assetType = classifyAsset(node, fileName)
    assets.push({
      nodeId: resourceId,
      name: fileName || node.name || resourceId.slice(0, 8),
      type: assetType || 'VECTOR'
    })
  }
  return assets
}

// ============ Skeleton 文本格式化 ============

/**
 * 将 SkeletonNode 转换为缩进式文本树
 *
 * 格式规则：
 * - [H] / [V] 表示水平/垂直布局
 * - ×N 表示重复 N 次
 * - : 后接子节点（简单情况合并到一行）
 * - + 表示同级节点并列
 * - "..." 表示文本内容（截断 30 字符）
 * - ID 只在关键节点显示（根节点、有布局的容器、重复模板、ICON）
 */
function formatSkeletonText(skeleton: SkeletonNode): string {
  const lines: string[] = []

  // 判断节点是否为"简单节点"（可以合并到一行）
  function isSimpleNode(node: SkeletonNode): boolean {
    // 叶子节点都是简单的
    if (!node.children || node.children.length === 0) return true
    // 只有 ICON 和 TEXT 子节点，且数量 <= 3
    if (node.children.length > 3) return false
    return node.children.every(
      (c) => (c.type === 'ICON' || c.type === 'TEXT') && (!c.children || c.children.length === 0)
    )
  }

  // 格式化单个节点的描述（不含子节点）
  function formatNodeDesc(node: SkeletonNode, showId: boolean): string {
    let desc = node.type

    // 布局方向
    if (node.layoutMode) {
      desc += node.layoutMode === 'HORIZONTAL' ? ' [H]' : ' [V]'
    }

    // 重复次数
    if (node.repeatCount && node.repeatCount > 1) {
      desc += ` ×${node.repeatCount}`
    }

    // 显示 ID（关键节点）
    if (showId) {
      desc += ` ${node.id}`
    }

    // TEXT 节点显示内容
    if (node.type === 'TEXT' && node.characters) {
      const text =
        node.characters.length > 30 ? node.characters.slice(0, 30) + '...' : node.characters
      desc += ` "${text}"`
    }

    return desc
  }

  // 格式化简单子节点列表（合并到一行）
  function formatSimpleChildren(children: SkeletonNode[]): string {
    return children.map((c) => formatNodeDesc(c, false)).join(' + ')
  }

  // 判断是否应该显示 ID
  function shouldShowId(node: SkeletonNode, isRoot: boolean): boolean {
    if (isRoot) return true
    if (node.layoutMode) return true
    if (node.repeatCount && node.repeatCount > 1) return true
    if (node.type === 'GROUP') return true
    return false
  }

  // 递归渲染节点
  function renderNode(node: SkeletonNode, prefix: string, isLast: boolean, isRoot: boolean): void {
    const connector = isRoot ? '' : isLast ? '└─ ' : '├─ '
    const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ')

    const showId = shouldShowId(node, isRoot)
    let line = prefix + connector + formatNodeDesc(node, showId)

    // 如果子节点都是简单节点，合并到一行
    if (node.children && node.children.length > 0 && isSimpleNode(node)) {
      line += ': ' + formatSimpleChildren(node.children)
      lines.push(line)
      return
    }

    lines.push(line)

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        const isChildLast = index === node.children!.length - 1
        renderNode(child, childPrefix, isChildLast, false)
      })
    }
  }

  renderNode(skeleton, '', true, true)

  return lines.join('\n')
}

// ============ Full 模式资源提取 ============

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
  const nodeId = params.node_id || params.nodeId
  const mode = params.mode || 'full'
  const node = resolveNode(nodeId)

  // skeleton 模式：轻量级提取，跳过 CSS，返回缩进文本格式
  // 注意：skeleton 不返回 assets，ICON 节点 ID 已包含在 structure 中
  if (mode === 'skeleton') {
    const resources = new Map<string, { node: SceneNode; fileName: string }>()
    const skeleton = extractSkeletonNode(node, resources)

    if (!skeleton) {
      throw createError(ERROR_CODES.EXPORT_FAILED, 'Failed to extract skeleton')
    }

    // 转换为缩进式文本格式（不包含 assets 列表）
    const structure = formatSkeletonText(skeleton)

    return {
      rootNodeId: node.id,
      structure
    }
  }

  // full 模式：完整提取（包含 CSS）
  const { nodes: uiInfo, resources } = await extractSelectedNodes([node])

  // Parse UI info with project type
  const projectType = options.value.project
  const design = parseUIInfo(uiInfo, projectType)

  // Extract assets info from resources
  const assets = extractAssetsInfo(resources)

  return {
    rootNodeId: node.id,
    design,
    assets
  }
}

// Screenshot 压缩质量（0-1），0.7 平衡体积和清晰度
const SCREENSHOT_QUALITY = 0.3

// Handler: get_screenshot
async function handleGetScreenshot(params: GetScreenshotParams): Promise<GetScreenshotResult> {
  const nodeId = params.node_id || params.nodeId
  const node = resolveNode(nodeId)

  // 1x 缩放导出 JPG，再通过 Canvas 进一步压缩
  const bytes = await node.exportAsync({
    format: 'JPG',
    constraint: { type: 'SCALE', value: 1 }
  })

  // Canvas 二次压缩
  const image = await compressToJpeg(bytes, SCREENSHOT_QUALITY, 'image/jpeg')

  return {
    image,
    width: Math.round(node.width),
    height: Math.round(node.height)
  }
}

// Handler: get_assets
async function handleGetAssets(params: GetAssetsParams): Promise<GetAssetsResult> {
  const assets: ExportedAsset[] = []
  let successCount = 0
  let failedCount = 0

  for (const req of params.nodes) {
    if (req.node_id && !req.nodeId) {
      req.nodeId = req.node_id
    }

    try {
      const asset = await exportSingleAsset(req)
      assets.push(asset)
      successCount++
    } catch (err) {
      // 单个资源导出失败，记录错误但继续处理其他资源
      const errorCode = isSkillError(err) ? err.code : ERROR_CODES.EXPORT_FAILED
      const errorMessage = isSkillError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown error'

      assets.push({
        nodeId: req.nodeId,
        name: '',
        format: req.format || 'png',
        width: 0,
        height: 0,
        data: '',
        error: {
          code: errorCode,
          message: errorMessage
        }
      })
      failedCount++
    }
  }

  return {
    assets,
    summary: {
      total: params.nodes.length,
      success: successCount,
      failed: failedCount
    }
  }
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
    // MasterGo may return different types, handle gracefully
    let data: string
    if (typeof bytes === 'string') {
      data = bytes
    } else if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8')
      data = decoder.decode(bytes)
    } else {
      // Fallback for unknown types
      data = String.fromCharCode(...new Uint8Array(bytes as ArrayBufferLike))
    }
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
