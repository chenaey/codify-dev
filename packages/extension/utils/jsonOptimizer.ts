import type { UINode } from './uiExtractor'

/**
 * JSON 优化工具
 * 功能：坐标清理、样式去重、冗余字段移除
 * 优化：单次遍历完成所有操作，提升性能
 */

// CSS 默认值映射表（预编译，避免重复创建）
const DEFAULT_VALUES: Record<string, Set<string>> = {
  'justify-content': new Set(['flex-start', 'start', 'normal']),
  'align-items': new Set(['stretch', 'normal']),
  'flex-direction': new Set(['row']),
  display: new Set(['block']),
  'flex-grow': new Set(['0']),
  'white-space': new Set(['normal']),
  'text-align': new Set(['start', 'left'])
}

// 检查 customStyle 中是否有 padding 相关属性
function hasPaddingInStyle(customStyle: Record<string, string>): boolean {
  return !!(
    customStyle.padding ||
    customStyle['padding-top'] ||
    customStyle['padding-right'] ||
    customStyle['padding-bottom'] ||
    customStyle['padding-left']
  )
}

// 检查 customStyle 中是否有 margin 相关属性
function hasMarginInStyle(customStyle: Record<string, string>): boolean {
  return !!(
    customStyle.margin ||
    customStyle['margin-top'] ||
    customStyle['margin-right'] ||
    customStyle['margin-bottom'] ||
    customStyle['margin-left']
  )
}

/**
 * 单次遍历优化节点（合并所有操作）
 */
function optimizeNode(node: UINode): void {
  const isIconNode = node.type === 'ICON'

  // 1. 清理坐标信息
  // - 自动布局中 x/y 无意义
  // - ICON 节点的 x/y 也无意义（只需要尺寸）
  if (node.layout.layoutMode !== 'NONE' || isIconNode) {
    delete node.layout.x
    delete node.layout.y
  }

  // 2. 移除冗余字段
  // - ICON 节点保留 id（用于与 assets 数组匹配）
  // - 其他节点移除 id 和 name
  if (!isIconNode) {
    delete (node as any).id
  }
  delete (node as any).name

  // 3. 优化样式
  if (node.customStyle) {
    const customStyle = node.customStyle

    // 3.1 删除 CSS 默认值
    for (const [key, defaults] of Object.entries(DEFAULT_VALUES)) {
      if (customStyle[key] && defaults.has(customStyle[key])) {
        delete customStyle[key]
      }
    }

    // 3.2 padding 已在 customStyle 中，删除 layout.padding
    if (hasPaddingInStyle(customStyle)) {
      delete node.layout.padding
    }

    // 3.3 margin 已在 customStyle 中，删除 layout.margin
    if (hasMarginInStyle(customStyle)) {
      delete node.layout.margin
    }

    // 3.4 清理空 customStyle
    if (Object.keys(customStyle).length === 0) {
      delete node.customStyle
    }
  }

  // 4. 递归处理子节点（单次遍历）
  if (node.children) {
    for (const child of node.children) {
      optimizeNode(child)
    }
  }
}

/**
 * 优化 JSON 结构
 * 统一处理：坐标清理、样式去重、字段移除
 * 性能优化：单次遍历完成所有操作
 */
export function optimizeJSON(nodes: UINode[]): UINode[] {
  for (const node of nodes) {
    optimizeNode(node)
  }
  return nodes
}
