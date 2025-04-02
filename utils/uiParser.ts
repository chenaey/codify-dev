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
  
  // 处理单个节点或节点数组
  const processNode = (node: any) => {
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
        
        // 处理与兄弟节点的间距
        if (node.layout.spacing.siblings) {
          if (typeof node.layout.spacing.siblings.before === 'number') {
            node.layout.spacing.siblings.before *= 2
          }
          if (typeof node.layout.spacing.siblings.after === 'number') {
            node.layout.spacing.siblings.after *= 2
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
    }
    
    // 递归处理子节点
    if (Array.isArray(node.children)) {
      node.children.forEach(processNode)
    }
    
    return node
  }
  
  // 处理数组或单个对象
  if (Array.isArray(parsedInfo)) {
    return parsedInfo.map(processNode)
  } else {
    return processNode(parsedInfo)
  }
} 