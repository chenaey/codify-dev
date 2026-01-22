/* eslint-disable @typescript-eslint/no-explicit-any */
import { isMasterGo } from '@/utils/platform'

// 基础矢量数据类型
interface BaseVectorData {
  id: string
  type: string
  name: string
  width: number
  height: number
  fileName?: string
  resourceId?: string
}

// 完整矢量数据类型
interface FullVectorData extends BaseVectorData {
  svgContent?: string // SVG原始内容，用于直接内联使用
  resourceId?: string // 资源ID，用于文件引用方式
  fileName?: string // 文件名，与resourceId搭配使用
}

// 矢量节点类型
// 包含 Figma 和 MasterGo 的矢量类型:
// - Figma: VECTOR, BOOLEAN_OPERATION, STAR, LINE, ELLIPSE, POLYGON
// - MasterGo: REGULAR_POLYGON (代替 POLYGON), PEN (钢笔工具路径)
// 注意：RECTANGLE 不包含在内，因为它通常是背景/容器，不是图标
const VECTOR_TYPES = [
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'POLYGON',
  'REGULAR_POLYGON',
  'PEN' // MasterGo 钢笔工具路径
] as const

// 容器节点类型
const CONTAINER_TYPES = ['GROUP', 'FRAME', 'COMPONENT', 'INSTANCE'] as const

type VectorNodeType = (typeof VECTOR_TYPES)[number]
type ContainerNodeType = (typeof CONTAINER_TYPES)[number]

// 检查节点是否为矢量节点
export function isVectorNode(node: any): boolean {
  return VECTOR_TYPES.includes(node.type)
}

// 检查节点是否为容器节点
export function isContainerNode(node: any): boolean {
  return CONTAINER_TYPES.includes(node.type)
}

// 检查节点是否为图标节点
// 仅基于尺寸和结构判断，不依赖名称
export function isIconNode(node: any): boolean {
  // 空节点检查
  if (!node) return false

  // 不可见节点不是图标
  if ('visible' in node && node.visible === false) return false

  // 尺寸检查 - 小尺寸基本就是图标
  const sizeBasedIcon = node.width <= 64 && node.height <= 64

  // 比例检查 - 图标通常是正方形或接近正方形的
  const isSquarish = Math.abs(node.width - node.height) <= 2

  // 小尺寸矢量检查 - 非常小的矢量图形通常是图标（如箭头、下拉指示器等）
  // 这些图标可能不是正方形，但尺寸很小（如 11x6 的箭头）
  const isSmallVector = node.width <= 24 && node.height <= 24 && node.width > 0 && node.height > 0

  // 宽高比检查 - 避免把宽矩形（如按钮背景）识别为图标
  // 比例超过 3:1 或 1:3 的通常不是图标
  const aspectRatio = Math.max(node.width, node.height) / Math.min(node.width, node.height)
  const hasReasonableAspectRatio = aspectRatio <= 3

  // 使用Figma官方API的判断方法 - 如果Figma认为这是一个图标资源
  // 但仍然需要满足尺寸和宽高比约束，防止大型背景元素被误判
  if ('isAsset' in node && node.isAsset === true) {
    // 即使 isAsset 为 true，也需要尺寸合理
    if (sizeBasedIcon && hasReasonableAspectRatio) {
      return true
    }
    // 非常小的矢量即使比例不对也可能是图标
    if (isSmallVector) {
      return true
    }
    // 大尺寸或极端比例的 isAsset，不认为是图标
  }

  // 结合检查 - 针对不同类型节点的判断逻辑
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    // 组件和实例：小尺寸且接近正方形
    return sizeBasedIcon && isSquarish
  }

  if (isVectorNode(node)) {
    // 矢量元素：
    // 1. 小尺寸且接近正方形
    // 2. 非常小的矢量（<=24px）即使不是正方形也可能是图标
    // 3. 必须有合理的宽高比（避免按钮背景等长条形元素）
    if (isSmallVector) {
      return true
    }
    return sizeBasedIcon && isSquarish && hasReasonableAspectRatio
  }

  // 容器类型（FRAME, GROUP）需要进一步检查
  if (isContainerNode(node)) {
    // 尺寸合适且为正方形
    if (sizeBasedIcon && isSquarish) {
      return true
    }

    // 检查子节点 - 如果所有子节点都是矢量，很可能是图标
    if ('children' in node && node.children?.length > 0) {
      const hasOnlyVectorChildren =
        node.children.length > 0 && node.children.every((child: any) => isVectorNode(child))

      if (sizeBasedIcon && hasOnlyVectorChildren) {
        return true
      }
    }
  }

  return false
}

// 判断是否为简单单色SVG
function isSimpleSvg(node: any): boolean {
  // 检查节点的复杂度
  // 检查当前节点的 vectorPaths
  if (node.vectorPaths) {
    const pathData = node.vectorPaths.map((path: any) => path.data || '').join('')
    if (pathData.length >= 100) return false
  }

  // 检查子节点的 vectorPaths
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.vectorPaths) {
        const childPathData = child.vectorPaths.map((path: any) => path.data || '').join('')
        if (childPathData.length >= 100) return false
      }
    }
  }
  // 检查是否只有一种填充颜色
  const fills = node.fills || []
  const visibleFills = fills.filter((fill: any) => fill.visible !== false)
  // 检查填充类型 - 只接受纯色填充
  const hasNonSolidFill = visibleFills.some(
    (fill: any) =>
      fill.type !== 'SOLID' || (typeof fill.opacity !== 'undefined' && fill.opacity < 1)
  )
  if (hasNonSolidFill) return false

  // 检查是否有复杂效果
  const hasEffects = node.effects && node.effects.some((effect: any) => effect.visible !== false)
  if (hasEffects) return false

  // 检查是否有描边
  const hasStrokes = node.strokes && node.strokes.some((stroke: any) => stroke.visible !== false)
  if (hasStrokes) return false
  // 尺寸检查 - 简单图标通常较小
  const isSmallIcon = node.width <= 16 && node.height <= 16
  return isSmallIcon
}

// 提取图标数据
export async function extractVectorData(
  node: any
): Promise<BaseVectorData | FullVectorData | undefined> {
  // 首先判断是否为图标节点
  if (!node || !isIconNode(node)) return undefined

  // 创建基础矢量数据
  const baseVectorData: BaseVectorData = {
    id: node.id,
    type: node.type,
    name: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height)
  }

  // 判断是否为简单图标
  const isSimple = isSimpleSvg(node)

  // 创建完整矢量数据
  const vectorData: FullVectorData = {
    ...baseVectorData
  }

  // 如果节点支持导出SVG，使用Figma API导出
  try {
    if (isSimple) {
      // 直接导出SVG
      const result = await node.exportAsync({
        format: 'SVG'
      })

      let svgString: string
      if (typeof result === 'string') {
        svgString = result
      } else {
        // 转换为字符串
        const decoder = new TextDecoder()
        svgString = decoder.decode(result)
      }

      // 导出之后再判断更准确
      if (svgString.length <= 100) {
        // 简单单色SVG：保留SVG内容，用于内联
        vectorData.svgContent = svgString
      } else {
        // 复杂SVG：设置resourceId，用于文件引用
        vectorData.resourceId = node.id
      }
    } else {
      // 复杂SVG：设置resourceId，用于文件引用
      vectorData.resourceId = node.id
    }
    return vectorData
  } catch (error) {
    console.error('Error exporting SVG:', error)
  }

  // 如果不支持导出SVG或导出失败，返回基础数据
  return baseVectorData
}

// 导出类型定义
export type { BaseVectorData, FullVectorData, VectorNodeType, ContainerNodeType }

/**
 * 异步获取节点的 SVG 代码
 * 支持 MasterGo 和通用平台
 */
export async function getSVGCodeAsync(node: any): Promise<string> {
  if (!node) return ''

  let shouldExport = false

  if (isMasterGo()) {
    try {
      // MasterGo 使用 getDSL 判断 type === 'SVG'
      const dsl = await window.mg.codegen.getDSL(node.id)
      if (dsl?.root?.style?.type === 'SVG') {
        shouldExport = true
      }
    } catch (error) {
      console.warn('Failed to check MasterGo DSL for SVG type:', error)
      // 如果 DSL 获取失败，降级到通用判断
      shouldExport = isIconNode(node)
    }
  } else {
    // 其他平台通用判断
    shouldExport = isIconNode(node)
  }

  if (shouldExport) {
    try {
      const result = await node.exportAsync({ format: 'SVG' })
      if (typeof result === 'string') {
        return result
      } else {
        const decoder = new TextDecoder()
        return decoder.decode(result)
      }
    } catch (error) {
      console.error('Failed to export SVG:', error)
    }
  }

  return ''
}
