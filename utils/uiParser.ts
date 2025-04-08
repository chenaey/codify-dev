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
    // 处理图标信息
    if (node.vector) {
      processVectorInfo(node.vector, projectType)
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

/**
 * 处理矢量/图标信息，根据项目类型转换图标尺寸单位
 * @param vector - 矢量/图标数据
 * @param projectType - 项目类型
 */
function processVectorInfo(vector: any, projectType?: string): void {
  if (!vector) return

  // 添加资源路径信息，使用预先生成的fileName
  if (vector.resourceId && !vector.assetPath && vector.fileName) {
    // 根据不同项目类型设置资源路径格式
    switch (projectType) {
      case 'mvvm':
        // Vue2 项目使用 @/assets 路径
        vector.assetPath = `../assets/${vector.fileName}`
        break
      case 'cbg':
        // Vue3 项目使用相对路径
        vector.assetPath = `../assets/${vector.fileName}`
        break
      case 'ios':
        // iOS 项目使用资源名称
        vector.assetPath = vector.fileName
        break
      case 'android':
        // Android 项目使用资源ID
        vector.assetPath = `@drawable/${vector.fileName}`
        break
      default:
        vector.assetPath = `icons/${vector.fileName}`
    }
  }

  // 根据项目类型处理宽高单位
  if (projectType) {
    // 调整宽高值
    if (typeof vector.width === 'number' && typeof vector.height === 'number') {
      switch (projectType) {
        case 'mvvm':
          // MVVM项目宽高乘以2
          vector.width *= 2
          vector.height *= 2

          // 添加单位信息
          vector.widthUnit = 'rem'
          vector.heightUnit = 'rem'
          break
        case 'cbg':
          // CBG项目保持原始值，但添加单位
          vector.widthUnit = 'px'
          vector.heightUnit = 'px'
          break
        case 'ios':
          // iOS项目使用点单位
          vector.widthUnit = 'pt'
          vector.heightUnit = 'pt'
          break
        case 'android':
          // Android项目使用dp单位
          vector.widthUnit = 'dp'
          vector.heightUnit = 'dp'
          break
      }
    }
  }
}
