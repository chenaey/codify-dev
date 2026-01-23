import { options, activePlugin } from '@/ui/state'
import { getCSSAsync } from '@/utils/css'
import {
  buildSkipIds,
  detectRepeatingPatterns,
  getRepeatInfo
} from '@/skill/extract/compress'

import { codegen } from './codegen'
import { getDesignComponent } from './component'
import { getComponentMapping } from './componentMap'
import { isIconNode } from './iconExtractor'
import { generateUniqueIconName } from './iconNaming'
import { toDecimalPlace } from './index'
import { optimizeJSON } from './jsonOptimizer'
import { mergeStyles } from './styleMerger'
// 添加布局模式类型
type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL'
// 添加尺寸调整模式类型
type SizingMode = 'HUG' | 'FILL' | 'FIXED' | 'NONE'
// 添加定位模式类型
type PositioningMode = 'absolute'

// --- Helper Types for Extracted Properties ---
// Note: FlexProperties type is no longer directly used in UINode,
// but kept here for potential internal use or reference.
export type FlexProperties = {
  display?: 'flex' | 'block' | 'inline-flex'
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' // Simplified, add others if needed
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' // Simplified
  grow?: number
  shrink?: number
  basis?: string | number
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
}

// Note: SizingModeProperties type *is* now used again in UINode['layout'].
type SizingModeProperties = {
  horizontal: SizingMode
  vertical: SizingMode
}

// UI Node 类型定义
export interface UINode {
  id: string
  name: string
  type: string
  // 自定义组件信息
  custom_component?: {
    name: string // 组件名称（如 ProductItem）
    importPath: string // 导入路径
    description?: string // 组件描述
    props?: string[] // 组件支持的属性列表
  }
  layout: {
    x?: number // 布局x坐标
    y?: number // 布局y坐标
    width?: number | '100%' // 布局宽度
    height?: number | '100%' // 布局高度
    layoutMode: LayoutMode // 改为必填，永远会有值
    positioning?: PositioningMode // 绝对定位标记
    // sizingMode?: SizingModeProperties
    layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
    padding?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
    margin?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
    // --- Sizing and Flex properties are now primarily handled via customStyle ---
    // flex?: FlexProperties; // Removed
  }
  text?: {
    content: string
    fontSize: number
    fontFamily?: string
    fontWeight?: number
    letterSpacing?: number
    lineHeight?: number | { value: number; unit: string }
    textAlignHorizontal?: string
    textAlignVertical?: string
    textCase?: string
    textDecoration?: string
  }
  children?: UINode[]
  // 添加自定义样式字段
  customStyle?: Record<string, string>
  // 重复节点压缩
  repeatCount?: number      // 设计稿中该结构的重复次数
  repeatNodeIds?: string[]  // 被跳过的节点 ID（调试用）
}

// 提取颜色信息
export function extractColor(color: { r: number; g: number; b: number; a?: number }) {
  if (!color) return 'null'
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255
  )}, ${color.a ?? 1})`
}

// 提取填充信息
function extractFills(node: any) {
  if (!('fills' in node) || !node.fills || !Array.isArray(node.fills)) return undefined
  return node.fills
    .filter((fill: any) => fill.visible !== false)
    .map((fill: any) => {
      const base = {
        type: fill.type,
        visible: fill.visible !== false,
        opacity: fill.opacity,
        blendMode: fill.blendMode
      }

      if (fill.type === 'SOLID') {
        return {
          ...base,
          color: extractColor(fill.color)
        }
      }

      // 其他类型的填充（如渐变）可以在这里扩展
      return base
    })
}

// 提取描边信息
function extractStrokes(node: any) {
  if (!('strokes' in node) || !node.strokes) return undefined

  return node.strokes
    .filter((stroke: any) => stroke?.visible !== false && stroke?.color)
    .map((stroke: any) => ({
      type: stroke.type,
      color: extractColor(stroke.color),
      width: node.strokeWeight,
      position: node.strokeAlign
    }))
}

const convertStyleArrayToObject = (styles: string[]) => {
  return styles.reduce((acc: Record<string, string>, style: string) => {
    // 移除末尾分号和空格
    const cleanStyle = style.replace(/;$/, '').trim()
    // 分割属性名和值
    const [property, value] = cleanStyle.split(': ').map((s: string) => s.trim())
    // 设置属性值
    acc[property] = value
    return acc
  }, {})
}

// 提取效果信息
function extractEffects(node: any) {
  if (!('effects' in node) || !node.effects) return undefined

  return node.effects
    .filter((effect: any) => effect.visible !== false)
    .map((effect: any) => {
      const base = {
        type: effect.type,
        visible: effect.visible !== false
      }

      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        return {
          ...base,
          color: extractColor(effect.color),
          offset: { x: effect.offset.x, y: effect.offset.y },
          radius: effect.radius
        }
      }

      if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
        return {
          ...base,
          radius: effect.radius
        }
      }

      return base
    })
}

// 提取圆角信息
function extractCornerRadius(node: any) {
  if (!('cornerRadius' in node)) return undefined

  if (typeof node.cornerRadius === 'number') {
    return node.cornerRadius
  }

  if (
    node.topLeftRadius ||
    node.topRightRadius ||
    node.bottomRightRadius ||
    node.bottomLeftRadius
  ) {
    return {
      topLeft: node.topLeftRadius || 0,
      topRight: node.topRightRadius || 0,
      bottomRight: node.bottomRightRadius || 0,
      bottomLeft: node.bottomLeftRadius || 0
    }
  }

  return undefined
}

// 提取文本信息
function extractText(node: any) {
  if (node.type !== 'TEXT') return undefined

  return {
    content: node.characters,
    fontSize: node.fontSize,
    // fontFamily: node.fontName?.family,
    fontWeight: node.fontName?.style,
    letterSpacing: node.letterSpacing?.value || 0,
    lineHeight:
      typeof node.lineHeight === 'number'
        ? node.lineHeight
        : { value: node.lineHeight?.value || 0, unit: node.lineHeight?.unit || 'AUTO' },
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textCase: node.textCase,
    textDecoration: node.textDecoration
  }
}

// 判断是否需要添加宽高信息
const shouldAddWidthHeight = (node: any) => {
  // 1. 检查是否为容器类型
  const isContainer = ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'TEXT'].includes(node.type)

  // 2. 检查是否有自动布局
  const layoutMode = getLayoutMode(node)
  const hasAutoLayout = layoutMode === 'HORIZONTAL' || layoutMode === 'VERTICAL'

  // 3. 检查约束条件
  const hasFlexibleConstraints =
    node.constraints?.horizontal === 'SCALE' ||
    node.constraints?.vertical === 'SCALE' ||
    node.constraints?.horizontal === 'STRETCH' ||
    node.constraints?.vertical === 'STRETCH'

  // 返回判断结果
  return isIconNode(node) || (!isContainer && !hasAutoLayout && !hasFlexibleConstraints)
}

// 获取节点位置的通用函数（优先使用绝对坐标）
function getNodePosition(node: any) {
  return {
    x: node.absoluteRenderBounds?.x || node.absoluteBoundingBox?.x || node.x,
    y: node.absoluteRenderBounds?.y || node.absoluteBoundingBox?.y || node.y,
    width: node.absoluteRenderBounds?.width || node.absoluteBoundingBox?.width || node.width,
    height: node.absoluteRenderBounds?.height || node.absoluteBoundingBox?.height || node.height
  }
}

// 判断节点是否为绝对定位
function isAbsolutePositioned(node: any, parent: any): boolean {
  // 场景1: AutoLayout 内的绝对定位（Figma: layoutPositioning）
  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') {
    return true
  }
  // 场景2: MasterGo 兼容（position 属性）
  if ('position' in node && node.position === 'ABSOLUTE') {
    return true
  }
  return false
}

// 获取节点的布局模式
function getLayoutMode(node: any): LayoutMode {
  // 1. 如果节点显式设置了layoutMode，使用设置的值 (Figma)
  if ('layoutMode' in node && node.layoutMode) {
    return node.layoutMode as LayoutMode
  }

  // 2. 兼容MasterGo的flexMode
  if ('flexMode' in node && node.flexMode) {
    // MasterGo: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
    return node.flexMode as LayoutMode
  }

  return 'NONE'
}

// 判断是否需要计算margin
function shouldCalculateMargin(node: any, parent: any): boolean {
  // 1. 父节点必须是自动布局容器
  if (getLayoutMode(parent) === 'NONE') return false

  // 2. 节点不能是绝对定位
  if (isAbsolutePositioned(node, parent)) return false

  // 3. 父节点必须设置了itemSpacing
  if (parent.itemSpacing === undefined) return false

  // 4. 父节点必须有多个子元素
  const visibleSiblings = (parent.children || []).filter((child: any) => child.visible !== false)
  if (visibleSiblings.length <= 1) return false

  return true
}

function isTextNode(node: any): boolean {
  return node.type === 'TEXT' || node.children?.every((child: any) => isTextNode(child))
}

// 获取排序后的兄弟节点
function getSortedSiblings(siblings: any[], layoutMode: LayoutMode): any[] {
  return [...siblings].sort((a, b) => {
    const posA = getNodePosition(a)
    const posB = getNodePosition(b)
    return layoutMode === 'HORIZONTAL' ? posA.x - posB.x : posA.y - posB.y
  })
}

// 计算实际间距
function calculateActualSpacing(currentNode: any, nextNode: any): number {
  const currentPos = getNodePosition(currentNode)
  const nextPos = getNodePosition(nextNode)

  // 考虑padding的影响
  const currentPadding = currentNode.padding || {}
  const nextPadding = nextNode.padding || {}

  if (getLayoutMode(currentNode.parent) === 'HORIZONTAL') {
    return toDecimalPlace(
      nextPos.x -
        (currentPos.x + currentPos.width) -
        (currentPadding.right || 0) -
        (nextPadding.left || 0)
    )
  }

  return toDecimalPlace(
    nextPos.y -
      (currentPos.y + currentPos.height) -
      (currentPadding.bottom || 0) -
      (nextPadding.top || 0)
  )
}

function calculatePadding(node: any) {
  const padding: { top?: number; right?: number; bottom?: number; left?: number } = {}
  if ('paddingTop' in node && node.paddingTop !== 0) {
    padding.top = node.paddingTop
  }
  if ('paddingRight' in node && node.paddingRight !== 0) {
    padding.right = node.paddingRight
  }
  if ('paddingBottom' in node && node.paddingBottom !== 0) {
    padding.bottom = node.paddingBottom
  }
  if ('paddingLeft' in node && node.paddingLeft !== 0) {
    padding.left = node.paddingLeft
  }
  return Object.keys(padding).length > 0 ? padding : undefined
}
// 计算margin
function calculateMargin(node: any, siblings: any[], parent: any) {
  if (!shouldCalculateMargin(node, parent)) return null

  // 过滤掉隐藏的兄弟节点
  const visibleSiblings = siblings.filter((sibling) => sibling.visible !== false)

  // 获取节点在可见兄弟中的位置
  const sortedSiblings = getSortedSiblings(visibleSiblings, getLayoutMode(parent))
  const nodeIndex = sortedSiblings.findIndex((s) => s.id === node.id)

  // 最后一个元素不需要margin
  if (nodeIndex === sortedSiblings.length - 1) return null

  // 使用父节点的itemSpacing作为margin值
  const marginValue = parent.itemSpacing

  if (marginValue <= 0) return null

  // 根据布局方向设置对应的margin
  return {
    ...(getLayoutMode(parent) === 'HORIZONTAL' ? { right: marginValue } : { bottom: marginValue })
  }
}

/**
 * 提取绝对定位节点的 CSS 样式
 * 参考 MCP collect.ts 的 applyAutoLayoutAbsolutePosition 实现
 * 直接计算 position: absolute 和 left/right/top/bottom
 */
function extractAbsolutePositionStyles(node: any, parent: any): Record<string, string> {
  if (!isAbsolutePositioned(node, parent)) {
    return {}
  }

  const nodePos = getNodePosition(node)
  const parentPos = getNodePosition(parent)
  const width = toDecimalPlace(nodePos.width)
  const height = toDecimalPlace(nodePos.height)
  const parentWidth = toDecimalPlace(parentPos.width)
  const parentHeight = toDecimalPlace(parentPos.height)

  if (!parentWidth || !parentHeight) {
    return { position: 'absolute' }
  }

  // 使用 relativeTransform 获取相对于父容器的坐标
  const transform = 'relativeTransform' in node ? node.relativeTransform : undefined
  let left: number, top: number

  if (transform && transform.length >= 2 && transform[0].length >= 3 && transform[1].length >= 3) {
    left = toDecimalPlace(transform[0][2])
    top = toDecimalPlace(transform[1][2])
  } else {
    // Fallback
    left = toDecimalPlace(nodePos.x - parentPos.x)
    top = toDecimalPlace(nodePos.y - parentPos.y)
  }

  const right = toDecimalPlace(parentWidth - width - left)
  const bottom = toDecimalPlace(parentHeight - height - top)

  const result: Record<string, string> = { position: 'absolute' }
  const constraints = 'constraints' in node ? node.constraints : undefined

  if (constraints) {
    // 水平方向
    // Figma: MIN/MAX/CENTER/STRETCH/SCALE
    // MasterGo: START/END/CENTER/STRETCH/SCALE
    switch (constraints.horizontal) {
      case 'MIN':
      case 'START':
        result.left = `${left}px`
        break
      case 'MAX':
      case 'END':
        result.right = `${right}px`
        break
      case 'CENTER': {
        const offset = toDecimalPlace(left + width / 2 - parentWidth / 2)
        if (offset === 0) {
          result.left = '50%'
          result.transform = 'translateX(-50%)'
        } else {
          result.left = `calc(50% + ${offset}px)`
          result.transform = 'translateX(-50%)'
        }
        break
      }
      case 'STRETCH':
        result.left = `${left}px`
        result.right = `${right}px`
        break
      case 'SCALE':
        result.left = `${toDecimalPlace((left / parentWidth) * 100)}%`
        result.right = `${toDecimalPlace((right / parentWidth) * 100)}%`
        break
      default:
        result.left = `${left}px`
    }

    // 垂直方向
    // Figma: MIN/MAX/CENTER/STRETCH/SCALE
    // MasterGo: START/END/CENTER/STRETCH/SCALE
    switch (constraints.vertical) {
      case 'MIN':
      case 'START':
        result.top = `${top}px`
        break
      case 'MAX':
      case 'END':
        result.bottom = `${bottom}px`
        break
      case 'CENTER': {
        const offset = toDecimalPlace(top + height / 2 - parentHeight / 2)
        if (result.transform) {
          // 已有水平居中的 transform
          if (offset === 0) {
            result.top = '50%'
            result.transform = 'translate(-50%, -50%)'
          } else {
            result.top = `calc(50% + ${offset}px)`
            result.transform = 'translate(-50%, -50%)'
          }
        } else {
          if (offset === 0) {
            result.top = '50%'
            result.transform = 'translateY(-50%)'
          } else {
            result.top = `calc(50% + ${offset}px)`
            result.transform = 'translateY(-50%)'
          }
        }
        break
      }
      case 'STRETCH':
        result.top = `${top}px`
        result.bottom = `${bottom}px`
        break
      case 'SCALE':
        result.top = `${toDecimalPlace((top / parentHeight) * 100)}%`
        result.bottom = `${toDecimalPlace((bottom / parentHeight) * 100)}%`
        break
      default:
        result.top = `${top}px`
    }
  } else {
    // 无约束时，默认使用 left/top
    result.left = `${left}px`
    result.top = `${top}px`
  }

  // 安全保底：确保至少有一个方向
  if (!result.left && !result.right) result.left = `${left}px`
  if (!result.top && !result.bottom) result.top = `${top}px`

  return result
}

// Returns a style object with CSS properties derived from Figma's layout settings.
function extractDerivedFlexStyles(node: any, parent?: any): Record<string, string> {
  const layoutMode = getLayoutMode(node) // Get node's own layout mode
  const parentLayoutMode = parent ? getLayoutMode(parent) : 'NONE' // Get parent's layout mode
  const isFlexContainer = layoutMode === 'HORIZONTAL' || layoutMode === 'VERTICAL'
  const isParentFlexContainer = parentLayoutMode === 'HORIZONTAL' || parentLayoutMode === 'VERTICAL'

  const derivedStyles: Record<string, string> = {}

  // --- Container Properties (Applied to the node itself if it's a flex container) ---
  if (isFlexContainer) {
    derivedStyles['display'] = 'flex'

    // Direction
    if (layoutMode === 'VERTICAL') {
      derivedStyles['flex-direction'] = 'column'
    }
    // Default is 'row', so we don't explicitly set it.

    // Justify Content (main axis alignment) - Default: flex-start
    switch (node.primaryAxisAlignItems) {
      // case 'MIN': // Default flex-start - OMIT
      //   break;
      case 'MAX':
        derivedStyles['justify-content'] = 'flex-end'
        break
      case 'CENTER':
        derivedStyles['justify-content'] = 'center'
        break
      case 'SPACE_BETWEEN':
        derivedStyles['justify-content'] = 'space-between'
        break
    }

    // Align Items (cross axis alignment) - Default: stretch (CSS default), but Figma MIN often maps to flex-start conceptually.
    // We'll only set non-default values based on Figma's counterAxisAlignItems.
    switch (node.counterAxisAlignItems) {
      case 'MIN':
        derivedStyles['align-items'] = 'flex-start'
        break // Explicitly set flex-start if Figma MIN
      case 'MAX':
        derivedStyles['align-items'] = 'flex-end'
        break
      case 'CENTER':
        derivedStyles['align-items'] = 'center'
        break
      case 'BASELINE':
        derivedStyles['align-items'] = 'baseline'
        break
      // case 'STRETCH': // Default - OMIT (or handle if needed)
      //   break;
    }
  }

  // --- Item Properties (Applied to the node based on its relationship to a flex parent) ---
  if (isParentFlexContainer) {
    // Flex Grow - Default: 0
    if (node.layoutGrow === 1) {
      derivedStyles['flex-grow'] = String(1)
    }
    // We ignore layoutShrink and layoutBasis for simplicity, relying on CSS defaults.

    // Align Self (overrides parent's align-items for this specific item) - Default: auto
    let alignSelfValue: FlexProperties['alignSelf'] = 'auto' // Start with default
    switch (
      node.layoutAlign // layoutAlign applies to the item within its parent container
    ) {
      case 'STRETCH':
        alignSelfValue = 'stretch'
        break
      case 'MIN':
        alignSelfValue = 'flex-start'
        break // Map Figma MIN to flex-start
      case 'MAX':
        alignSelfValue = 'flex-end'
        break // Map Figma MAX to flex-end
      case 'CENTER':
        alignSelfValue = 'center'
        break
      // case 'INHERIT': // Less common in Figma direct properties, treat as auto
      // case 'AUTO': // Default - OMIT
      //   break;
    }
    // Only include align-self if it's not the default ('auto')
    if (alignSelfValue !== 'auto') {
      derivedStyles['align-self'] = alignSelfValue
    }
  }
  return derivedStyles
}

// 提取布局信息
function extractLayout(
  node: any,
  parent?: any,
  siblings?: any[],
  rootNode?: any
): UINode['layout'] {
  let relativeX, relativeY

  // 获取当前节点的位置
  const nodePos = getNodePosition(node)

  // 检查是否为绝对定位节点
  const isAbsolute = isAbsolutePositioned(node, parent)

  if (isAbsolute && parent) {
    // 绝对定位节点：使用 relativeTransform 获取相对于父容器的真实坐标
    // relativeTransform 是 2x3 变换矩阵：[[a, b, tx], [c, d, ty]]
    // tx = transform[0][2], ty = transform[1][2]
    const transform = 'relativeTransform' in node ? node.relativeTransform : undefined
    if (transform && transform.length >= 2 && transform[0].length >= 3 && transform[1].length >= 3) {
      relativeX = transform[0][2]
      relativeY = transform[1][2]
    } else {
      // Fallback：使用坐标差值（不够精确，但总比没有好）
      const parentPos = getNodePosition(parent)
      relativeX = nodePos.x - parentPos.x
      relativeY = nodePos.y - parentPos.y
    }
  } else if (rootNode) {
    // 普通节点：计算相对于根节点的坐标
    const rootPos = getNodePosition(rootNode)
    relativeX = nodePos.x - rootPos.x
    relativeY = nodePos.y - rootPos.y
  } else {
    // 如果没有根节点，使用原始坐标
    relativeX = nodePos.x
    relativeY = nodePos.y
  }

  // --- Initialize layout object ---
  const layout: UINode['layout'] = {
    x: toDecimalPlace(relativeX),
    y: toDecimalPlace(relativeY),
    layoutMode: getLayoutMode(node)
  }

  // 如果是绝对定位节点，添加 positioning 标记
  if (isAbsolute) {
    layout.positioning = 'absolute'
  }


  const horizontalSizing = node.layoutSizingHorizontal || 'NONE'
  const verticalSizing = node.layoutSizingVertical || 'NONE'

  // We will always add it for now, AI can decide if FIXED means use customStyle width/height
  const sizingMode = {
    horizontal: horizontalSizing as SizingMode,
    vertical: verticalSizing as SizingMode
  }
  // 根据判断结果添加宽高
  if (
    shouldAddWidthHeight(node) ||
    (sizingMode.horizontal === 'FIXED' && sizingMode.vertical === 'FIXED')
  ) {
    layout.width = toDecimalPlace(nodePos.width)
    layout.height = toDecimalPlace(nodePos.height)
  } else if (!isTextNode(node) || sizingMode.horizontal === 'FIXED') {
    // && (sizingMode.horizontal !== 'HUG')
    layout.width = '100%'
  }

  if ('layoutAlign' in node) {
    layout.layoutAlign = node.layoutAlign
  }
  const padding = calculatePadding(node)

  // 对于容器节点，保留 padding 信息以便于布局
  if (padding) {
    layout.padding = padding
  }

  // 计算margin
  if (siblings?.length && parent) {
    const margin = calculateMargin(node, siblings, parent)
    if (margin) {
      layout.margin = margin
    }
  }

  return layout
}

// 提取自定义组件信息
function extractCustomComponent(node: any) {
  if (!node?.name) return undefined

  // 获取组件映射
  const mapping = getComponentMapping(node.name)
  if (!mapping) return undefined

  return {
    ...mapping
  }
}

/**
 * 获取组件的缓存 key
 * - COMPONENT: 返回自己的 id
 * - INSTANCE: 返回 mainComponent.id
 * - 其他: 返回 null（不缓存）
 */
function getComponentCacheKey(node: any): string | null {
  if (node.type === 'COMPONENT') {
    return node.id
  }
  if (node.type === 'INSTANCE') {
    return node.mainComponent?.id || null
  }
  return null
}

// CSS 缓存类型
interface CSSCacheEntry {
  style: any
  component: any
  codeBlocks: any[]
}

// 主函数：提取UI节点信息
async function extractUINode(
  node: any,
  maxDepth = Infinity,
  parent?: any,
  siblings?: any[],
  rootNode?: any,
  resources: Map<string, any> = new Map(),
  cssCache: Map<string, CSSCacheEntry> = new Map()
): Promise<UINode | null> {
  // 过滤掉隐藏的节点
  if ('visible' in node && node.visible === false) {
    return null
  }

  // 如果父节点是图标，则跳过子节点的处理
  if (parent && isIconNode(parent)) {
    return null
  }

  // 第一次调用时，记录根节点
  if (!rootNode) {
    rootNode = node
  }

  // 判断当前节点是否为图标，决定 type 值
  // 参考 Figma-Context-MCP: 将图标节点的 type 设置为 'ICON'
  const nodeIsIcon = isIconNode(node)
  const nodeType = nodeIsIcon ? 'ICON' : node.type

  const uiNode: UINode = {
    id: node.id,
    name: node.name,
    type: nodeType,
    layout: extractLayout(node, parent, siblings, rootNode)
  }

  // 如果是图标节点，注册到资源集合中用于后续导出
  if (nodeIsIcon) {
    const fileName = generateUniqueIconName(resources, node)
    resources.set(node.id, {
      node,
      fileName
    })
  }

  // 提取自定义组件信息
  const customComponent = extractCustomComponent(node)
  if (customComponent) {
    uiNode.custom_component = customComponent
  }

  const textInfo = extractText(node)
  if (textInfo) {
    uiNode.text = textInfo
  }

  // --- Extract derived flex styles ---
  const derivedFlexStyles = extractDerivedFlexStyles(node, parent)
  // --- Extract absolute positioning styles (position/left/right/top/bottom) ---
  const absoluteStyles = extractAbsolutePositionStyles(node, parent)

  try {
    // 🚀 CSS 缓存：同一组件的实例复用 CSS
    const cacheKey = getComponentCacheKey(node)
    let codeBlocks: any[] | undefined

    if (cacheKey && cssCache.has(cacheKey)) {
      // 缓存命中：直接使用缓存的 codeBlocks
      codeBlocks = cssCache.get(cacheKey)!.codeBlocks
    } else {
      // 缓存未命中：计算 CSS 并缓存
      const style = await getCSSAsync(node)
      const component = getDesignComponent(node)

      const { cssUnit, project, rootFontSize, scale } = options.value
      const serializeOptions = {
        useRem: cssUnit === 'rem',
        rootFontSize,
        scale,
        project
      }

      const result = await codegen(
        style,
        component,
        serializeOptions,
        activePlugin.value?.code || undefined
      )
      codeBlocks = result.codeBlocks

      // 缓存结果（仅对 COMPONENT/INSTANCE）
      if (cacheKey) {
        cssCache.set(cacheKey, { style, component, codeBlocks })
      }
    }

    // 只保存 css 代码块的 code 字段
    const cssBlock = codeBlocks?.find((block) => block.name === 'css')
    if (cssBlock && cssBlock.code) {
      const stylesArray = cssBlock.code.split('\n')
      const initialCustomStyle = convertStyleArrayToObject(stylesArray)

      // --- Merge styles ---
      // Priority: absoluteStyles > derivedFlexStyles > initialCustomStyle
      // absoluteStyles has highest priority for positioning
      const finalCustomStyle = { ...derivedFlexStyles, ...initialCustomStyle, ...absoluteStyles }

      // 如果节点不需要固定宽高，则过滤掉 width 和 height 样式
      // Apply this filtering *after* merging
      if (!shouldAddWidthHeight(node)) {
        // 对于容器节点，过滤掉 width 和 height 样式
        delete finalCustomStyle.width
        delete finalCustomStyle.height
      }

      // Assign the final merged style
      uiNode.customStyle = finalCustomStyle
    } else if (Object.keys(absoluteStyles).length > 0 || Object.keys(derivedFlexStyles).length > 0) {
      // 即使没有 cssBlock，也要保留绝对定位和 flex 样式
      const fallbackStyle = { ...derivedFlexStyles, ...absoluteStyles }
      if (Object.keys(fallbackStyle).length > 0) {
        uiNode.customStyle = fallbackStyle
      }
    }
  } catch (error) {
    console.error(`Failed to get CSS for node ${node.id}:`, error)
    // 即使 CSS 提取失败，也要保留绝对定位样式
    if (Object.keys(absoluteStyles).length > 0 || Object.keys(derivedFlexStyles).length > 0) {
      const fallbackStyle = { ...derivedFlexStyles, ...absoluteStyles }
      if (Object.keys(fallbackStyle).length > 0) {
        uiNode.customStyle = fallbackStyle
      }
    }
  }


  // 合并customStyle和layout.margin (Using the final customStyle)
  // 如果有 layout.margin 但没有 customStyle，先创建空的 customStyle
  if (uiNode.layout.margin) {
    if (!uiNode.customStyle) {
      uiNode.customStyle = {}
    }
    const { mergedStyle } = mergeStyles(uiNode) // mergeStyles needs uiNode which now has the final customStyle
    uiNode.customStyle = mergedStyle
    delete uiNode.layout.margin // Margin is now baked into customStyle
  }

  // 如果是图标节点，清理不必要的样式
  if (nodeIsIcon) {
    if (uiNode.customStyle) {
      delete uiNode.customStyle['padding']
      delete uiNode.customStyle['padding-top']
      delete uiNode.customStyle['padding-right']
      delete uiNode.customStyle['padding-bottom']
      delete uiNode.customStyle['padding-left']
    }
    if (uiNode.layout?.padding) {
      delete uiNode.layout.padding
    }
  }

  // 如果当前节点不是图标且不是自定义组件，才处理子节点
  if (
    !nodeIsIcon &&
    !customComponent &&
    maxDepth > 0 &&
    'children' in node &&
    node.children
  ) {
    // 过滤可见子节点
    const visibleChildren = node.children.filter((c: any) => c.visible !== false)

    // 🚀 只在有意义的容器层级做重复检测
    // 跳过 GROUP 内部（GROUP 只是视觉分组，内部重复不具备语义意义）
    const shouldDetectPatterns = ['GROUP', 'PEN'].includes(node.type)
    const patterns = shouldDetectPatterns
      ? new Map()
      : detectRepeatingPatterns(visibleChildren)
    const skipIds = buildSkipIds(patterns)

    // 提取所有子节点信息，跳过重复节点
    const childNodes: UINode[] = []
    for (const child of node.children) {
      // 🚀 跳过重复节点 - 不调用 getCSSAsync！
      if (skipIds.has(child.id)) continue

      const childNode = await extractUINode(
        child,
        maxDepth - 1,
        node,
        node.children,
        rootNode,
        resources,
        cssCache
      )

      if (childNode) {
        // 为样本节点添加重复信息
        const repeatInfo = getRepeatInfo(child.id, patterns)
        if (repeatInfo) {
          childNode.repeatCount = repeatInfo.repeatCount
          childNode.repeatNodeIds = repeatInfo.repeatNodeIds
        }
        childNodes.push(childNode)
      }
    }
    uiNode.children = childNodes
  }

  return uiNode
}

// 导出函数：处理选中的节点
export async function extractSelectedNodes(selection: readonly any[]) {
  // 如果没有选中节点，返回空对象
  if (!selection.length) {
    return { nodes: [], resources: new Map() }
  }

  // 以选中的第一个节点作为根节点
  const rootNode = selection[0]

  // 创建资源收集器
  const resources = new Map<string, any>()

  // 🚀 创建 CSS 缓存（跨整个提取过程共享）
  const cssCache = new Map<string, CSSCacheEntry>()

  const uiNodes = await Promise.all(
    selection.map((node) =>
      extractUINode(node, Infinity, node.parent, node.parent?.children, rootNode, resources, cssCache)
    )
  )
  // 过滤掉null节点
  const nodes = uiNodes.filter((node): node is UINode => node !== null)

  // 优化 JSON 结构：层级合并、坐标清理、样式去重、字段移除
  const optimizedNodes = optimizeJSON(nodes)

  // 返回包含优化后节点和资源的对象
  return { nodes: optimizedNodes, resources }
}
