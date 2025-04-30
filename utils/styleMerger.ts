import { options } from '@/ui/state'

import type { UINode } from './uiExtractor'

// 创建一个统一的值处理函数
function processStyleValue(value: number): string {
  const { cssUnit, scale, rootFontSize, project } = options.value

  // 如果值是数字，转换为带单位的字符串
  if (typeof value === 'number') {
    // 应用缩放
    const scaledValue = value * (scale || 1)
    if (project === 'mvvm') {
      return `rem(${scaledValue})`
    } else if (cssUnit === 'rem') {
      return `${scaledValue / rootFontSize}rem`
    } else {
      return `${scaledValue}px`
    }
  }

  return value
}

export function mergeStyles(uiNode: UINode): {
  mergedStyle: Record<string, string>
} {
  const { margin } = uiNode.layout
  const customStyle = uiNode.customStyle ? { ...uiNode.customStyle } : {}

  // 如果没有margin，直接返回
  if (!margin) {
    return { mergedStyle: customStyle }
  }

  // 检查customStyle是否已有margin相关属性
  const hasMargin = customStyle['margin'] !== undefined
  const hasMarginTop = customStyle['margin-top'] !== undefined
  const hasMarginRight = customStyle['margin-right'] !== undefined
  const hasMarginBottom = customStyle['margin-bottom'] !== undefined
  const hasMarginLeft = customStyle['margin-left'] !== undefined

  // 如果所有margin属性都已存在，直接返回
  if (hasMargin || (hasMarginTop && hasMarginRight && hasMarginBottom && hasMarginLeft)) {
    return { mergedStyle: customStyle }
  }

  // 处理各边距，只合并customStyle中不存在的属性
  if (!hasMarginTop && margin.top !== undefined) {
    customStyle['margin-top'] = processStyleValue(margin.top)
  }

  if (!hasMarginRight && margin.right !== undefined) {
    customStyle['margin-right'] = processStyleValue(margin.right)
  }

  if (!hasMarginBottom && margin.bottom !== undefined) {
    customStyle['margin-bottom'] = processStyleValue(margin.bottom)
  }

  if (!hasMarginLeft && margin.left !== undefined) {
    customStyle['margin-left'] = processStyleValue(margin.left)
  }

  return { mergedStyle: customStyle }
}
