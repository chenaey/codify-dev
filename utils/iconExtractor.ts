import { extractColor } from './uiExtractor'

// 基础矢量数据类型
interface BaseVectorData {
  type: string
  name: string
  width: number
  height: number
}

// 完整矢量数据类型
interface FullVectorData extends BaseVectorData {
  viewBox: string
  paths?: Array<{
    d: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    fillRule?: 'evenodd' | 'nonzero'
  }>
  isMultiPath?: boolean
  color?: string
}

// 矢量节点类型
const VECTOR_TYPES = [
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'REGULAR_POLYGON',
  'RECTANGLE'
] as const

// 容器节点类型
const CONTAINER_TYPES = [
  'GROUP',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
] as const

type VectorNodeType = typeof VECTOR_TYPES[number]
type ContainerNodeType = typeof CONTAINER_TYPES[number]

// 检查节点是否为矢量节点
export function isVectorNode(node: any): boolean {
  return VECTOR_TYPES.includes(node.type)
}

// 检查节点是否为容器节点
export function isContainerNode(node: any): boolean {
  return CONTAINER_TYPES.includes(node.type)
}

export function isIconName(node: any): boolean {
  return node.name.toLowerCase().includes('icon') || 
         node.name.toLowerCase().includes('图标')
}

// 检查节点是否为图标节点
export function isIconNode(node: any): boolean {
  // 1. 组件或组件实例，通过名称判断
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      return isIconName(node)
  }

  // 2. 单个矢量节点
  if (isVectorNode(node)) {
    return (
      // 通过名称判断
      isIconName(node) ||
      // 通过尺寸判断（正方形且不大于64px）
      (node.width === node.height && node.width <= 64 && node.width > 0)
    )
  }

  // 3. 容器节点（GROUP/FRAME）
  if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT') {
    // 基本条件：合适的尺寸
    const hasValidSize = node.width <= 64 && 
                        node.height <= 64 && 
                        Math.abs(node.width - node.height) <= 1

    // 条件1：通过名称判断

    // 条件2：检查是否只包含矢量节点
    const hasOnlyVectorChildren = node.children?.length > 0 && 
                                 node.children.every((child: any) => isVectorNode(child))
    return hasValidSize  || hasOnlyVectorChildren
  }

  return false
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

// 提取矢量图标数据
export function extractVectorData(node: any): BaseVectorData | FullVectorData | undefined {
  if (!node || !isIconNode(node)) return undefined

  // 基础矢量数据
  const baseVectorData: BaseVectorData = {
    type: node.type,
    name: node.name,
    width: node.width,
    height: node.height
  }

  // 如果是组件实例或可导出节点，直接返回基础信息
  if (node.type === 'INSTANCE' || 'exportAsync' in node) {
    return baseVectorData
  }

  // 构建完整的矢量数据
  const vectorData: FullVectorData = {
    ...baseVectorData,
    viewBox: `0 0 ${baseVectorData.width} ${baseVectorData.height}`
  }

  // 处理不同类型的节点
  if (isVectorNode(node)) {
    // 单个矢量节点
    if (node.vectorPaths?.length > 0) {
      vectorData.paths = node.vectorPaths.map((path: any) => ({
        d: path.data,
        fill: node.fills?.length > 0 ? extractFills(node)[0]?.color : 'currentColor',
        stroke: node.strokes?.length > 0 ? extractStrokes(node)[0]?.color : undefined,
        strokeWidth: node.strokeWeight,
        fillRule: path.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero'
      }))
    }
  } else if (isContainerNode(node) && node.children?.length > 0) {
    // 容器节点（GROUP/FRAME）
    vectorData.isMultiPath = true
    vectorData.paths = []

    // 递归处理所有子节点
    const processChildPaths = (child: any) => {
      if (isVectorNode(child) && child.vectorPaths?.length > 0) {
        // 添加子节点的路径，保留其样式信息
        vectorData.paths?.push(...child.vectorPaths.map((path: any) => ({
          d: path.data,
          fill: child.fills?.length > 0 ? extractFills(child)[0]?.color : 'currentColor',
          stroke: child.strokes?.length > 0 ? extractStrokes(child)[0]?.color : undefined,
          strokeWidth: child.strokeWeight,
          fillRule: path.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero'
        })))
      }
      
      // 递归处理子节点的子节点
      if (child.children?.length > 0) {
        child.children.forEach(processChildPaths)
      }
    }

    node.children.forEach(processChildPaths)

    // 如果没有找到任何路径，返回undefined
    if (vectorData.paths.length === 0) {
      return undefined
    }
  }

  // 提取主颜色信息（用于预览和主题）
  const mainFill = node.fills?.length > 0
    ? node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false) || node.fills[0]
    : null

  vectorData.color = mainFill?.type === 'SOLID' 
    ? extractColor(mainFill.color) 
    : 'currentColor'

  return vectorData
}

// 导出类型定义
export type {
  BaseVectorData,
  FullVectorData,
  VectorNodeType,
  ContainerNodeType
} 