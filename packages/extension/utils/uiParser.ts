/**
 * uiParser.ts
 *
 * 用于处理和转换UI信息的工具函数
 */

/**
 * 解析UI信息，根据项目类型调整spacing等数值
 * @param uiInfo - 从Figma提取的UI信息
 * @param projectType - 项目类型，如果是'mvvm'则会将spacing值乘以2
 * @returns 处理后的UI信息
 */
export function parseUIInfo(uiInfo: any, projectType?: string): any {
  // 如果输入为空或不是对象，直接返回
  if (!uiInfo || typeof uiInfo !== 'object') {
    return uiInfo
  }

  // 深拷贝防止修改原始对象
  const parsedInfo = JSON.parse(JSON.stringify(uiInfo))

  // 检查节点复杂度
  const isComplexNode = (node: any): boolean => {
    if (!node.layout?.layoutMode || !Array.isArray(node.children)) {
      return false
    }
    // 简单判断：垂直布局 + 子节点数量超过阈值
    return node.layout.layoutMode === 'VERTICAL' && node.children.length >= 200
  }

  // 生成节点描述
  const generateDescription = (node: any): string => {
    const childrenCount = node.children?.length || 0
    return `垂直布局容器，包含 ${childrenCount} 个子节点。`
  }

  // 处理单个节点或节点数组
  const processNode = (node: any, shouldCheckComplexity: boolean = true) => {
    // 只有当需要检查复杂度时才进行检查和生成描述
    if (shouldCheckComplexity && isComplexNode(node)) {
      node.description = generateDescription(node)
      // 子节点不再需要检查复杂度
      shouldCheckComplexity = false
    }

    // 处理图标信息：使用 type: 'ICON' 来识别图标节点
    // 图标节点的尺寸信息在 layout.width 和 layout.height 中
    if (node.type === 'ICON') {
      processIconNode(node, projectType)
    }

    // 处理layout和spacing
    if (node.layout) {
      // 如果是MVVM项目，调整spacing值
      if (projectType === 'mvvm' && node.layout.spacing) {
        // 处理与父节点的间距
        if (node.layout.spacing.parent) {
          for (const key of ['top', 'right', 'bottom', 'left']) {
            if (typeof node.layout.spacing.parent[key] === 'number') {
              node.layout.spacing.parent[key] *= 2
            }
          }
        }
      }

      // 如果节点有itemSpacing属性，也需要处理
      if (projectType === 'mvvm' && typeof node.layout.itemSpacing === 'number') {
        node.layout.itemSpacing *= 2
      }

      // 处理padding
      if (projectType === 'mvvm' && node.layout.padding) {
        for (const key of ['top', 'right', 'bottom', 'left']) {
          if (typeof node.layout.padding[key] === 'number') {
            node.layout.padding[key] *= 2
          }
        }
      }

      // 处理margin
      if (projectType === 'mvvm' && node.layout.margin) {
        for (const key of ['top', 'right', 'bottom', 'left']) {
          if (typeof node.layout.margin[key] === 'number') {
            node.layout.margin[key] *= 2
          }
        }
      }
    }

    // 递归处理子节点，传递是否需要检查复杂度的标志
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => processNode(child, shouldCheckComplexity))
    }

    return node
  }

  // 处理数组或单个对象
  if (Array.isArray(parsedInfo)) {
    return parsedInfo.map((node) => processNode(node, true))
  } else {
    return processNode(parsedInfo, true)
  }
}

/**
 * 处理图标节点，根据项目类型调整尺寸单位
 * 图标节点通过 type: 'ICON' 标识，尺寸信息在 layout.width/height 中
 * 资源下载通过 node.id 关联（由 tempad-skill 的 download-assets.cjs 处理）
 *
 * @param node - 图标节点
 * @param projectType - 项目类型
 */
function processIconNode(node: any, projectType?: string): void {
  if (!node || !node.layout) return

  // 根据项目类型处理宽高
  if (projectType === 'mvvm') {
    // MVVM项目宽高乘以2
    if (typeof node.layout.width === 'number') {
      node.layout.width *= 2
    }
    if (typeof node.layout.height === 'number') {
      node.layout.height *= 2
    }
  }
}
