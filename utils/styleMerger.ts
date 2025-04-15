// utils/styleMerger.ts

import type { UINode } from './uiExtractor'

/**
 * 将数字转换为像素字符串
 */
function toPxString(value: number | undefined): string {
  if (value === undefined) return ''
  return `${value}px`
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
    customStyle['margin-top'] = toPxString(margin.top)
  }
  
  if (!hasMarginRight && margin.right !== undefined) {
    customStyle['margin-right'] = toPxString(margin.right)
  }
  
  if (!hasMarginBottom && margin.bottom !== undefined) {
    customStyle['margin-bottom'] = toPxString(margin.bottom)
  }
  
  if (!hasMarginLeft && margin.left !== undefined) {
    customStyle['margin-left'] = toPxString(margin.left)
  }
  
  return { mergedStyle: customStyle }
} 