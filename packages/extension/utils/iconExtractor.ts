/* eslint-disable @typescript-eslint/no-explicit-any */
import { isMasterGo } from '@/utils/platform'

// 矢量节点类型
// 包含 Figma 和 MasterGo 的矢量类型:
// - Figma: VECTOR, BOOLEAN_OPERATION, STAR, LINE, ELLIPSE, POLYGON
// - MasterGo: REGULAR_POLYGON (代替 POLYGON), PEN (钢笔工具路径), SUBTRACT, UNION 等布尔运算
// 注意：RECTANGLE 不包含在内，因为它通常是背景/容器，不是图标
const VECTOR_TYPES = [
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'POLYGON',
  'REGULAR_POLYGON',
  'PEN', // MasterGo 钢笔工具路径
  // MasterGo 布尔运算类型（在 Figma 中统一为 BOOLEAN_OPERATION）
  'SUBTRACT',
  'UNION',
  'INTERSECT',
  'EXCLUDE'
] as const

// 容器节点类型
const CONTAINER_TYPES = ['GROUP', 'FRAME', 'COMPONENT', 'INSTANCE'] as const

type VectorNodeType = (typeof VECTOR_TYPES)[number]
type ContainerNodeType = (typeof CONTAINER_TYPES)[number]

// 非矢量类型白名单（这些类型明确不是矢量图形）
const NON_VECTOR_TYPES = ['TEXT', 'SLICE', 'STICKY', 'CONNECTOR', 'WIDGET', 'EMBED'] as const

/**
 * 递归检查节点是否包含文本后代
 * 用于排除包含文字的容器被误判为图标
 * 解决问题：容器内嵌套的 TEXT 节点未被检测到，导致属性卡片等 UI 组件被误判为图标
 */
function hasTextDescendant(node: any): boolean {
  if (!node) return false

  // 当前节点是 TEXT 类型
  if (node.type === 'TEXT') return true

  // 递归检查所有子节点
  if ('children' in node && node.children?.length > 0) {
    return node.children.some((child: any) => hasTextDescendant(child))
  }

  return false
}

// 检查节点是否为矢量节点
export function isVectorNode(node: any): boolean {
  if (!node) return false

  // 有明确的 type 属性且在矢量类型列表中
  if (node.type && VECTOR_TYPES.includes(node.type)) {
    return true
  }

  // 如果 type 明确是非矢量类型，返回 false
  if (node.type && NON_VECTOR_TYPES.includes(node.type)) {
    return false
  }

  // 如果 type 是容器类型，返回 false（容器需要递归检查）
  if (node.type && CONTAINER_TYPES.includes(node.type)) {
    return false
  }

  // 对于未知类型（包括 MasterGo 特有类型或 undefined）：
  // 如果是小尺寸叶子节点，可能是矢量图形
  // 这是一个宽容的判断，允许未知类型被视为矢量
  if (!node.children?.length && node.width <= 64 && node.height <= 64) {
    return true
  }

  return false
}

// 检查容器是否只包含矢量子节点（递归检查）
// 用于 SVG 容器折叠：GROUP/FRAME 内全是 VECTOR 类型 → 整体视为图标
export function hasOnlyVectorDescendants(node: any): boolean {
  // 空节点或不可见节点
  if (!node) return false
  if ('visible' in node && node.visible === false) return false

  // 直接矢量类型
  if (isVectorNode(node)) return true

  // 容器类型需要递归检查所有子节点
  if (isContainerNode(node)) {
    if (!('children' in node) || !node.children?.length) {
      // 空容器不算纯矢量容器
      return false
    }
    // 所有可见子节点都必须是矢量或纯矢量容器
    return node.children
      .filter((child: any) => !('visible' in child) || child.visible !== false)
      .every((child: any) => hasOnlyVectorDescendants(child))
  }

  // 其他类型（TEXT 等明确非矢量）
  return false
}

// 检查节点是否为容器节点
export function isContainerNode(node: any): boolean {
  return CONTAINER_TYPES.includes(node.type)
}

/**
 * 检查容器是否应该被合并为单个图标
 * 当一个小尺寸 FRAME 的所有子节点都是 ICON 类型时，应该将整个 FRAME 作为单一 ICON 导出
 * 解决问题：设计师创建的组合图标（如"大神攻略"标签）被拆分为多个独立图标
 */
export function shouldMergeAsIcon(node: any): boolean {
  if (!node) return false

  // 条件 1: 必须是容器类型
  if (!isContainerNode(node)) return false

  // 条件 2: 必须有子节点
  if (!('children' in node) || !node.children?.length) return false

  // 条件 3: 容器尺寸较小（组合图标通常不会很大）
  const isSmallContainer = node.width <= 80 && node.height <= 48

  if (!isSmallContainer) return false

  // 条件 4: 🔧 修复：递归检查是否包含任何文本后代（不仅仅是直接子节点）
  if (hasTextDescendant(node)) return false

  // 条件 5: 所有子节点都是图标类型（ICON）或纯矢量容器
  const allChildrenAreIcons = node.children
    .filter((child: any) => !('visible' in child) || child.visible !== false)
    .every((child: any) => isIconNode(child) || hasOnlyVectorDescendants(child))

  return allChildrenAreIcons
}

// 检查节点是否为图标节点
// 仅基于尺寸和结构判断，不依赖名称
// 优化：整合 shouldMergeAsIcon 逻辑，支持组合图标识别
export function isIconNode(node: any): boolean {
  // 空节点检查
  if (!node) return false

  // 不可见节点不是图标
  if ('visible' in node && node.visible === false) return false

  // ===== 优先判断：组合图标合并（尺寸范围更宽：≤80×48）=====
  // 当小尺寸容器的所有子节点都是矢量时，应该将整个容器作为单一 ICON
  // 解决问题：设计师创建的组合图标（如"大神攻略"标签）被拆分为多个独立图标
  // 必须放在最前面，因为它的尺寸限制（80×48）比普通图标（64×64）更宽松
  if (isContainerNode(node) && shouldMergeAsIconInternal(node)) {
    return true
  }

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
    // 🔧 修复：如果容器包含任何文本后代，一定不是图标
    // 解决问题：属性卡片等包含文字的小型 UI 组件被误判为图标
    if (hasTextDescendant(node)) {
      return false
    }

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

      // SVG 容器折叠 - 递归检查所有后代是否都是矢量
      // 即使子节点是嵌套容器，只要最终都是矢量，也应视为图标
      if (sizeBasedIcon && hasOnlyVectorDescendants(node)) {
        return true
      }
    }
  }

  return false
}

/**
 * 内部函数：检查容器是否应该被合并为单个图标
 * 被 isIconNode 调用，避免循环依赖
 *
 * 组合图标 vs 图标容器的区分：
 * - 组合图标：子节点紧密排列，共同构成一个图形（如品牌标识）
 * - 图标容器：子节点之间有间距，是多个独立图标的容器（如工具栏）
 */
function shouldMergeAsIconInternal(node: any): boolean {
  // 条件 1: 容器尺寸较小（组合图标通常不会很大）
  const isSmallContainer = node.width <= 80 && node.height <= 48
  if (!isSmallContainer) return false

  // 条件 2: 🔧 修复：递归检查是否包含任何文本后代（不仅仅是直接子节点）
  // 解决问题：嵌套在深层的 TEXT 节点未被检测到，导致属性卡片被误判为图标
  if (hasTextDescendant(node)) return false

  // 条件 3: 如果容器是 Auto Layout 且有 itemSpacing，说明是独立图标的容器
  // 这种情况不应该合并，而是保持独立
  const layoutMode = node.layoutMode || node.flexMode
  const hasAutoLayout = layoutMode === 'HORIZONTAL' || layoutMode === 'VERTICAL'
  const hasItemSpacing = node.itemSpacing && node.itemSpacing > 0

  if (hasAutoLayout && hasItemSpacing) {
    // Auto Layout 容器带间距 = 多个独立图标，不合并
    return false
  }

  // 条件 4: 检查子节点数量和类型
  const visibleChildren = node.children.filter(
    (child: any) => !('visible' in child) || child.visible !== false
  )

  // 如果有多个子节点且每个都已经是独立的"图标级别"容器（FRAME/COMPONENT/INSTANCE），
  // 说明设计师有意将它们作为独立图标，不应合并
  if (visibleChildren.length > 1) {
    const allChildrenAreIconContainers = visibleChildren.every(
      (child: any) =>
        (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') &&
        child.width <= 48 && child.height <= 48
    )
    if (allChildrenAreIconContainers) {
      // 多个小尺寸 FRAME/COMPONENT/INSTANCE = 独立图标，不合并
      return false
    }
  }

  // 条件 5: 所有可见子节点都是矢量或纯矢量容器
  return visibleChildren.every(
    (child: any) => isVectorNode(child) || hasOnlyVectorDescendants(child)
  )
}

// 导出类型定义
export type { VectorNodeType, ContainerNodeType }

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
