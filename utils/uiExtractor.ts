import { options, activePlugin } from '@/ui/state'
import { getComponentMapping } from './componentMap'
import { codegen } from './codegen'
import { getDesignComponent } from './component'
import { toDecimalPlace } from './index'
import { 
  isIconNode, 
  extractVectorData, 
} from './iconExtractor'
import { generateUniqueIconName } from './iconNaming'

// UI Node 类型定义
interface UINode {
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
    x: number // 布局x坐标
    y: number // 布局y坐标
    width?: number | '100%' // 布局宽度
    height?: number | '100%' // 布局高度
    rotation?: number
    layoutMode?: string // 布局模式 (HORIZONTAL | VERTICAL)
    layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
    padding?: {
      top: number
      right: number
      bottom: number
      left: number
    }
    // 布局信息关系字段
    spacing?: {
      siblings?: {
        after?: number // 与后一个兄弟节点的间距 (只设置after以使用margin-bottom样式)
        direction?: 'horizontal' | 'vertical' // 间距方向，水平或垂直
      }
    }
    // 布局意图描述
    intent?: string
  }
  style: {
    fills?: Array<{
      type: string
      color?: string
      opacity?: number
      visible?: boolean
      blendMode?: string
    }>
    strokes?: Array<{
      type: string
      color: string
      width: number
      position?: string
    }>
    effects?: Array<{
      type: string
      color?: string
      offset?: { x: number; y: number }
      radius?: number
      visible?: boolean
    }>
    cornerRadius?:
      | number
      | {
          topLeft: number
          topRight: number
          bottomRight: number
          bottomLeft: number
        }
  }
  text?: {
    content: string
    fontSize: number
    fontFamily: string
    fontWeight: number
    letterSpacing: number
    lineHeight: number | { value: number; unit: string }
    textAlignHorizontal: string
    textAlignVertical: string
    textCase?: string
    textDecoration?: string
  }
  // 矢量/图标信息
  vector?: {
    id: string
    resourceId?: string
    name?: string // 添加name属性
    type: string
    width: number
    height: number
    viewBox?: string
    color?: string
    paths?: Array<{
      d: string
      fill?: string
      stroke?: string
      strokeWidth?: number
      fillRule?: 'evenodd' | 'nonzero'
    }>
    isMultiPath?: boolean
    dataUrl?: string
    fileName?: string
  }
  children?: UINode[]
  // 添加自定义样式字段
  customStyle?: string[]
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
    fontFamily: node.fontName?.family,
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
  const hasAutoLayout = node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL'

  // 3. 检查约束条件
  const hasFlexibleConstraints =
    node.constraints?.horizontal === 'SCALE' ||
    node.constraints?.vertical === 'SCALE' ||
    node.constraints?.horizontal === 'STRETCH' ||
    node.constraints?.vertical === 'STRETCH'

  // 4. 检查是否为固定尺寸元素（如图标、按钮等）
  const isFixedSizeElement =
    node.type === 'VECTOR' ||
    node.type === 'BOOLEAN_OPERATION' ||
    (node.name.toLowerCase().includes('icon') && !isContainer) ||
    (node.name.toLowerCase().includes('button') && !hasAutoLayout)

  // 返回判断结果
  return isFixedSizeElement || (!isContainer && !hasAutoLayout && !hasFlexibleConstraints)
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

// 计算与兄弟节点的间距
function calculateSiblingSpacing(node: any, siblings: any[], parent: any) {
  if (!siblings.length || !parent) return undefined

  const isHorizontal = parent.layoutMode === 'HORIZONTAL'
  const isVertical = parent.layoutMode === 'VERTICAL'

  // 仅在自动布局容器中计算
  if (!isHorizontal && !isVertical) return undefined

  // 首先检查父容器是否有设置统一的itemSpacing
  if ('itemSpacing' in parent && parent.itemSpacing !== undefined) {
    // 对于有统一间距的自动布局，使用更智能的方式
    // 只在节点的一侧设置间距，避免重复
    // 水平布局: 只在右侧（after）设置间距，使用margin-right样式
    // 垂直布局: 只在下方（after）设置间距，使用margin-bottom样式
    const result: { after?: number; direction?: 'horizontal' | 'vertical' } = {
      direction: isHorizontal ? 'horizontal' : 'vertical'
    }

    // 找出当前节点在兄弟节点中的位置
    const sortedSiblings = [...siblings].sort((a, b) => {
      const posA = getNodePosition(a)
      const posB = getNodePosition(b)
      return isHorizontal ? posA.x - posB.x : posA.y - posB.y
    })

    const nodeIndex = sortedSiblings.findIndex((s) => s.id === node.id)
    if (nodeIndex === -1) return undefined

    // 只有非最后一个元素才设置after间距
    if (nodeIndex < sortedSiblings.length - 1) {
      result.after = parent.itemSpacing
    }

    return result
  }

  // 如果没有统一的itemSpacing，则需要计算实际间距
  // 排序兄弟节点
  const sortedSiblings = [...siblings].sort((a, b) => {
    const posA = getNodePosition(a)
    const posB = getNodePosition(b)
    return isHorizontal ? posA.x - posB.x : posA.y - posB.y
  })

  // 找到当前节点在排序后兄弟节点中的位置
  const nodeIndex = sortedSiblings.findIndex((s) => s.id === node.id)
  if (nodeIndex === -1) return undefined

  const result: { after?: number; direction?: 'horizontal' | 'vertical' } = {
    direction: isHorizontal ? 'horizontal' : 'vertical'
  }
  const nodePos = getNodePosition(node)

  // 智能间距计算: 只计算当前元素后面的间距
  // 对于最后一个元素，不设置after
  // 对于其他元素，设置after
  if (nodeIndex < sortedSiblings.length - 1) {
    const nextSibling = sortedSiblings[nodeIndex + 1]
    const nextPos = getNodePosition(nextSibling)

    result.after = isHorizontal
      ? toDecimalPlace(nextPos.x - (nodePos.x + nodePos.width))
      : toDecimalPlace(nextPos.y - (nodePos.y + nodePos.height))
  }

  return result
}

// 提取布局信息
function extractLayout(node: any, parent?: any, siblings?: any[], rootNode?: any) {
  let relativeX, relativeY

  // 获取当前节点和根节点的位置
  const nodePos = getNodePosition(node)

  if (rootNode) {
    // 计算相对于根节点的坐标
    const rootPos = getNodePosition(rootNode)
    relativeX = nodePos.x - rootPos.x
    relativeY = nodePos.y - rootPos.y
  } else {
    // 如果没有根节点，使用原始坐标
    relativeX = nodePos.x
    relativeY = nodePos.y
  }

  const layout: UINode['layout'] = {
    x: toDecimalPlace(relativeX),
    y: toDecimalPlace(relativeY)
  }

  // 根据判断结果添加宽高
  if (shouldAddWidthHeight(node)) {
    layout.width = toDecimalPlace(nodePos.width)
    layout.height = toDecimalPlace(nodePos.height)
  } else {
    layout.width = '100%'
    // layout.height = '100%'
  }

  if ('rotation' in node) {
    layout.rotation = toDecimalPlace(node.rotation)
  }

  if ('layoutAlign' in node) {
    layout.layoutAlign = node.layoutAlign
  }

  // 提取布局模式
  if ('layoutMode' in node) {
    layout.layoutMode = node.layoutMode
  }

  // 对于容器节点，保留 padding 信息以便于布局
  if (
    'paddingTop' in node ||
    'paddingRight' in node ||
    'paddingBottom' in node ||
    'paddingLeft' in node
  ) {
    layout.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    }
  }

  // 只添加与兄弟节点的间距关系
  if (siblings?.length && node !== rootNode && parent) {
    layout.spacing = {}

    const siblingSpacing = calculateSiblingSpacing(node, siblings, parent)
    if (siblingSpacing && siblingSpacing.after !== undefined) {
      layout.spacing.siblings = siblingSpacing
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

// 主函数：提取UI节点信息
export async function extractUINode(
  node: any,
  maxDepth = Infinity,
  parent?: any,
  siblings?: any[],
  rootNode?: any,
  resources: Map<string, any> = new Map()
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

  const uiNode: UINode = {
    id: node.id,
    name: node.name,
    type: node.type,
    layout: extractLayout(node, parent, siblings, rootNode),
    style: {
      fills: extractFills(node),
      strokes: extractStrokes(node),
      effects: extractEffects(node),
      cornerRadius: extractCornerRadius(node)
    }
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

  // 提取矢量/图标数据
  const vectorData = extractVectorData(node)
  if (vectorData) {
    if (node.type === 'INSTANCE' || 'exportAsync' in node) {
      // 使用新的函数生成唯一的文件名
      const fileName = generateUniqueIconName(resources, node);
      
      // 对于组件实例或可导出节点，以 {node, fileName} 格式保存到 resources
      resources.set(node.id, {
        node,
        fileName
      })
      
      // 同时设置到 uiNode.vector 中
      uiNode.vector = { 
        id: node.id, 
        ...vectorData, 
        resourceId: node.id,
        fileName // 添加标准化的文件名
      }
    } else {
      // 对于其他节点，直接使用提取的矢量数据
      uiNode.vector = { id: node.id, ...vectorData }
    }
  }

  try {
    // 获取生成的CSS代码
    const style = await node.getCSSAsync()
    const component = getDesignComponent(node)

    const { cssUnit, project, rootFontSize, scale } = options.value
    const serializeOptions = {
      useRem: cssUnit === 'rem',
      rootFontSize,
      scale,
      project
    }

    // 使用与 CodeSection.vue 相同的参数调用 codegen
    const { codeBlocks } = await codegen(
      style,
      component,
      serializeOptions,
      activePlugin.value?.code || undefined
    )

    // 只保存 css 代码块的 code 字段
    const cssBlock = codeBlocks.find((block) => block.name === 'css')
    if (cssBlock) {
      let styles = cssBlock.code.split('\n')
      // 如果节点不需要固定宽高，则过滤掉 width 和 height 样式
      if (!shouldAddWidthHeight(node)) {
        // 对于容器节点，过滤掉 width 和 height 样式
        styles = styles.filter((line) => {
          return !line.trim().startsWith('width:') && !line.trim().startsWith('height:')
        })
      }

      uiNode.customStyle = styles
    }
  } catch (error) {
    console.error(`Failed to get CSS for node ${node.id}:`, error)
  }

  // 如果当前节点不是图标且不是自定义组件，才处理子节点
  if (!isIconNode(node) && !customComponent && maxDepth > 0 && 'children' in node && node.children) {
    // 提取所有子节点信息，并传递当前节点作为它们的父节点
    const childNodes = await Promise.all(
      node.children.map((child: any) =>
        extractUINode(child, maxDepth - 1, node, node.children, rootNode, resources)
      )
    )
    uiNode.children = childNodes.filter((node): node is UINode => node !== null)
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

  const uiNodes = await Promise.all(
    selection.map((node) =>
      extractUINode(node, Infinity, node.parent, node.parent?.children, rootNode, resources)
    )
  )
  // 过滤掉null节点
  const nodes = uiNodes.filter((node): node is UINode => node !== null)
  
  // 返回包含节点和资源的对象
  return { nodes, resources }
}
