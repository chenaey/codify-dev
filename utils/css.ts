import type { TransformOptions } from '@/types/plugin'

import { isMasterGo } from '@/utils/platform'

import { parseNumber, toDecimalPlace } from './number'
import { kebabToCamel } from './string'

function escapeSingleQuote(value: string) {
  return value.replace(/'/g, "\\'")
}

function trimComments(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '')
}

const PX_VALUE_RE = /\b(-?\d+(?:.\d+)?)px\b/g
const VARIABLE_RE = /var\(--([a-zA-Z\d-]+)(?:,\s*([^)]+))?\)/g
const KEEP_PX_PROPS = ['border', 'box-shadow', 'filter', 'backdrop-filter', 'stroke-width']

function transformPxValue(value: string, transform: (value: number) => string) {
  return value.replace(PX_VALUE_RE, (_, val) => {
    const parsed = parseNumber(val)
    if (parsed == null) {
      return val
    }
    if (parsed === 0) {
      return '0'
    }
    return transform(toDecimalPlace(parsed, 5))
  })
}

function scalePxValue(value: string, scale: number): string {
  return transformPxValue(value, (val) => `${toDecimalPlace(scale * val)}px`)
}

function pxToRem(value: string, rootFontSize: number) {
  return transformPxValue(value, (val) => `${toDecimalPlace(val / rootFontSize)}rem`)
}

/**
 * RGBA 转 Hex
 * 
 * 转换规则：
 * 1. 透明度为 1 (不透明) -> 转换为 6 位 Hex (如 #FFFFFF)
 * 2. 透明度 < 1 (半透明) -> 保持原样 (rgba)，不转换
 */
function rgbaToHex(input: string): string {
  const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return input

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, r, g, b, a] = match
  const alpha = a !== undefined ? parseFloat(a) : 1

  // 仅当不透明 (alpha === 1) 时才转换
  if (alpha === 1) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
    return `#${toHex(parseInt(r))}${toHex(parseInt(g))}${toHex(parseInt(b))}`.toUpperCase()
  }

  return input
}

type ProcessValueOptions = {
  useRem: boolean
  rootFontSize: number
  scale: number
  project?: string
}

type SerializeOptions = {
  toJS?: boolean
} & ProcessValueOptions

export function serializeCSS(
  style: Record<string, string>,
  { toJS = false, useRem, rootFontSize, scale, project }: SerializeOptions,
  { transform, transformVariable, transformPx }: TransformOptions = {}
) {
  const options = { useRem, rootFontSize, scale, project }

  function processValue(key: string, value: string) {
    let current = trimComments(value).trim()

    if (typeof scale === 'number' && scale !== 1) {
      current = scalePxValue(current, scale)
    }

    // 尝试转换直接定义的颜色值
    // 仅当属性可能包含颜色且值包含 rgba/rgb 时才尝试转换
    if ((/color|background|border/i.test(key) || current.startsWith('rgb')) && (current.includes('rgba(') || current.includes('rgb('))) {
       current = current.replace(/rgba?\([^)]+\)/g, (match) => rgbaToHex(match))
    }

    if (typeof transformVariable === 'function') {
      current = current.replace(VARIABLE_RE, (_, name: string, value: string) =>
        transformVariable({ code: current, name, value, options })
      )
    }

    if (KEEP_PX_PROPS.includes(key)) {
      return current
    }

    if (typeof transformPx === 'function') {
      current = transformPxValue(current, (value) => transformPx({ value, options }))
    }

    if (useRem) {
      current = pxToRem(current, rootFontSize)
    }

    return current
  }

  function stringifyValue(value: string) {
    if (value.includes('\0')) {
      // Check if the entire string is a single variable enclosed by \0
      if (
        value.startsWith('\0') &&
        value.endsWith('\0') &&
        value.indexOf('\0', 1) === value.length - 1
      ) {
        return value.substring(1, value.length - 1)
      }

      const parts = value.split('\0')

      const template = parts
        .map((part, index) => (index % 2 === 0 ? part.replace(/`/g, '\\`') : '${' + part + '}'))
        .join('')

      return '`' + template + '`'
    }

    return `'${escapeSingleQuote(value)}'`
  }

  const processedStyle = Object.fromEntries(
    Object.entries(style)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, processValue(key, value)])
  )

  if (!Object.keys(processedStyle).length) {
    return ''
  }

  let code = toJS
    ? '{\n' +
      Object.entries(processedStyle)
        .map(([key, value]) => `  ${kebabToCamel(key)}: ${stringifyValue(value)}`)
        .join(',\n') +
      '\n}'
    : Object.entries(processedStyle)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n')

  if (typeof transform === 'function') {
    code = transform({ code, style: processedStyle, options })
  }

  return code
}

/**
 * CSS 属性排序优先级配置
 * 按照前端最佳实践，CSS 属性应该按以下顺序排列：
 * 1. 定位属性
 * 2. 盒模型（display、flex/grid 布局）
 * 3. 尺寸
 * 4. 边距和内边距
 * 5. 边框和圆角
 * 6. 文字排版
 * 7. 背景
 * 8. 其他视觉效果
 */
const CSS_PROPERTY_ORDER: Record<string, number> = {
  // 1. 定位相关 (0-99)
  'position': 0,
  'top': 1,
  'right': 2,
  'bottom': 3,
  'left': 4,
  'z-index': 5,
  
  // 2. 盒模型与布局 (100-199)
  'display': 100,
  'visibility': 101,
  'overflow': 102,
  'overflow-x': 103,
  'overflow-y': 104,
  
  // Flex 布局
  'flex': 110,
  'flex-grow': 111,
  'flex-shrink': 112,
  'flex-basis': 113,
  'flex-direction': 114,
  'flex-wrap': 115,
  'justify-content': 116,
  'align-items': 117,
  'align-content': 118,
  'align-self': 119,
  'order': 120,
  'gap': 121,
  'row-gap': 122,
  'column-gap': 123,
  
  // Grid 布局
  'grid': 130,
  'grid-template': 131,
  'grid-template-columns': 132,
  'grid-template-rows': 133,
  'grid-gap': 134,
  
  // 3. 尺寸 (200-299)
  'width': 200,
  'min-width': 201,
  'max-width': 202,
  'height': 203,
  'min-height': 204,
  'max-height': 205,
  'box-sizing': 206,
  
  // 4. 边距和内边距 (300-399)
  'margin': 300,
  'margin-top': 301,
  'margin-right': 302,
  'margin-bottom': 303,
  'margin-left': 304,
  'padding': 310,
  'padding-top': 311,
  'padding-right': 312,
  'padding-bottom': 313,
  'padding-left': 314,
  
  // 5. 边框和圆角 (400-499)
  'border': 400,
  'border-width': 401,
  'border-style': 402,
  'border-color': 403,
  'border-top': 404,
  'border-right': 405,
  'border-bottom': 406,
  'border-left': 407,
  'border-radius': 410,
  'border-top-left-radius': 411,
  'border-top-right-radius': 412,
  'border-bottom-right-radius': 413,
  'border-bottom-left-radius': 414,
  
  // 6. 文字排版 (500-599)
  'font': 500,
  'font-family': 501,
  'font-size': 502,
  'font-weight': 503,
  'font-style': 504,
  'line-height': 505,
  'letter-spacing': 506,
  'word-spacing': 507,
  'text-align': 508,
  'text-decoration': 509,
  'text-transform': 510,
  'text-indent': 511,
  'text-overflow': 512,
  'white-space': 513,
  'word-break': 514,
  'word-wrap': 515,
  'color': 520,
  
  // 7. 背景 (600-699)
  'background': 600,
  'background-color': 601,
  'background-image': 602,
  'background-repeat': 603,
  'background-position': 604,
  'background-size': 605,
  'background-clip': 606,
  
  // 8. 其他视觉效果 (700-799)
  'opacity': 700,
  'box-shadow': 701,
  'text-shadow': 702,
  'transform': 703,
  'transition': 704,
  'animation': 705,
  'cursor': 706,
  'pointer-events': 707,
}

/**
 * CSS 属性的默认值映射
 * 如果样式值等于默认值，则可以删除以简化代码
 */
const CSS_DEFAULT_VALUES: Record<string, string | string[]> = {
  'display': 'block',
  'position': 'static',
  'float': 'none',
  'clear': 'none',
  'visibility': 'visible',
  'opacity': '1',
  'z-index': 'auto',
  'flex-direction': 'row',
  'flex-wrap': 'nowrap',
  'justify-content': 'flex-start',
  'align-items': 'stretch',
  'align-content': 'stretch',
  'align-self': 'auto',
  'order': '0',
  'flex-grow': '0',
  'flex-shrink': '1',
  'flex-basis': 'auto',
  'gap': '0',
  'row-gap': '0',
  'column-gap': '0',
  'text-align': 'start',
  'text-decoration': 'none',
  'text-transform': 'none',
  'white-space': 'normal',
  'word-break': 'normal',
  'word-wrap': 'normal',
  'font-style': 'normal',
  'font-weight': '400',
  'line-height': 'normal',
  'letter-spacing': 'normal',
  'text-indent': '0',
  'cursor': 'auto',
  'pointer-events': 'auto',
  'box-sizing': 'content-box',
  'overflow': 'visible',
  'overflow-x': 'visible',
  'overflow-y': 'visible',
}

/**
 * 清理无用的 CSS 属性
 * 
 * 1. 删除空值、无效值
 * 2. 删除默认值（如 display: block、flex-direction: row 等）
 * 3. 删除冗余的单独属性（如果有简写属性）
 * 
 * @param styleObject - 待清理的样式对象
 * @returns 清理后的样式对象
 */
function cleanRedundantCSS(styleObject: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {}
  
  // 先收集所有键，用于检查冗余属性
  const hasPadding = 'padding' in styleObject && styleObject.padding
  const hasMargin = 'margin' in styleObject && styleObject.margin
  const hasBorder = 'border' in styleObject && styleObject.border
  const hasGap = 'gap' in styleObject && styleObject.gap
  const hasFlex = 'flex' in styleObject && styleObject.flex
  
  for (const [key, value] of Object.entries(styleObject)) {
    // 1. 跳过空值、无效值
    if (!value || value.trim() === '' || value === 'undefined' || value === 'null') {
      continue
    }
    
    // 2. 跳过默认值
    const defaultValue = CSS_DEFAULT_VALUES[key]
    if (defaultValue) {
      const defaultValues = Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      // 检查值是否等于默认值（支持直接比较和变量形式）
      const normalizedValue = value.trim()
      if (defaultValues.some(def => {
        const normalizedDef = def.trim()
        return normalizedValue === normalizedDef || 
               normalizedValue === `var(${normalizedDef})` ||
               normalizedValue === `var(--${normalizedDef})`
      })) {
        continue
      }
    }
    
    // 3. 处理冗余的单独属性
    // 如果有 padding 简写，删除 padding-top/right/bottom/left
    if (hasPadding && (key === 'padding-top' || key === 'padding-right' || 
        key === 'padding-bottom' || key === 'padding-left')) {
      continue
    }
    
    // 如果有 margin 简写，删除 margin-top/right/bottom/left
    if (hasMargin && (key === 'margin-top' || key === 'margin-right' || 
        key === 'margin-bottom' || key === 'margin-left')) {
      continue
    }
    
    // 如果有 border 简写，删除 border-width/style/color
    if (hasBorder && (key === 'border-width' || key === 'border-style' || 
        key === 'border-color')) {
      continue
    }
    
    // 如果有 gap 简写，删除 row-gap 和 column-gap（如果值相同）
    if (hasGap && (key === 'row-gap' || key === 'column-gap')) {
      const gapValue = styleObject.gap.trim()
      if (value.trim() === gapValue) {
        continue
      }
    }
    
    // 如果有 flex 简写，删除 flex-grow/shrink/basis
    if (hasFlex && (key === 'flex-grow' || key === 'flex-shrink' || 
        key === 'flex-basis')) {
      continue
    }
    const excludeCSSProperty = ['row-gap', 'column-gap', 'gap']
    if (excludeCSSProperty.includes(key)) {
      continue
    }
    
    cleaned[key] = value
  }
  
  return cleaned
}

/**
 * 对 CSS 属性进行排序
 * @param styleObject - 待排序的样式对象
 * @returns 排序后的样式对象
 */
function sortCSSProperties(styleObject: Record<string, string>): Record<string, string> {
  const entries = Object.entries(styleObject)
  
  // 按照预定义的顺序排序
  entries.sort(([keyA], [keyB]) => {
    const orderA = CSS_PROPERTY_ORDER[keyA] ?? 9999 // 未定义的属性放到最后
    const orderB = CSS_PROPERTY_ORDER[keyB] ?? 9999
    
    if (orderA !== orderB) {
      return orderA - orderB
    }
    
    // 如果优先级相同，按字母顺序排序
    return keyA.localeCompare(keyB)
  })
  
  // 转换回对象
  return Object.fromEntries(entries)
}

/**
 * 解析 CSS 变量并替换成实际值
 * 
 * MasterGo 的 getDSL API 返回的样式中，部分属性值可能是 CSS 变量（如 var(--token-color-12)）
 * 需要通过 localStyleMap 将变量替换成实际值。
 * 对于文本样式变量（如 font-size, line-height），优先通过 textStyleId 从 localStyleMap 中查找对应的 textItems。
 * 
 * @param styleValue - 样式对象，可能包含 CSS 变量
 * @param localStyleMap - 本地样式映射表，存储 token 的实际值
 * @param textStyleId - 当前节点引用的文本样式 ID (可选)
 * @returns 替换变量后的样式对象
 */
function resolveCSSVariables(
  styleValue: Record<string, any>,
  localStyleMap: Record<string, any> | undefined,
  textStyleId?: string | null
): Record<string, string> {
  const styleObject: Record<string, string> = {}
  
  // CSS 变量正则：匹配 var(--token-xxx)
  const cssVarRegex = /^var\((--[\w-]+)\)$/
  
  if (!localStyleMap) {
    for (const [key, value] of Object.entries(styleValue)) {
      styleObject[key] = typeof value === 'string' ? value : String(value)
    }
    return styleObject
  }
  
  // 1. 构建变量映射表
  const varNameToValueMap = new Map<string, string>()

  // 1.1 收集全局 Token (主要是颜色)
  for (const tokenData of Object.values(localStyleMap)) {
    if (tokenData.name && tokenData.value) {
      varNameToValueMap.set(tokenData.name, String(tokenData.value))
    }
  }

  // 1.2 收集文本样式 Token (通过 textStyleId 查找)
  // 文本相关的变量（如 font-family, font-size）通常定义在 textStyle 的 textItems 中
  if (textStyleId && localStyleMap[textStyleId]) {
    const textStyleData = localStyleMap[textStyleId]
    if (textStyleData.id === textStyleId && textStyleData.textItems) {
      for (const item of Object.values(textStyleData.textItems) as any[]) {
        if (item && item.name && item.value) {
          varNameToValueMap.set(item.name, String(item.value))
        }
      }
    }
  }
  
  // 2. 遍历所有样式属性，替换 CSS 变量
  for (const [key, value] of Object.entries(styleValue)) {
    let finalValue = typeof value === 'string' ? value : String(value)
    
    // 检查是否是 CSS 变量
    const match = finalValue.match(cssVarRegex)
    if (match) {
      const varName = match[1] // 提取变量名
      
      // 从映射表中查找实际值
      const actualValue = varNameToValueMap.get(varName)
      if (actualValue) {
        finalValue = actualValue
        // 如果解析出的是 rgba 颜色，尝试转换（仅当透明度为1时转Hex）
        if (finalValue.includes('rgba(') || finalValue.includes('rgb(')) {
           finalValue = rgbaToHex(finalValue)
        }
      } else {
        console.warn(`[resolveCSSVariables] Cannot resolve variable for ${key}: ${varName}`)
      }
    }
    
    styleObject[key] = finalValue
  }
  
  return styleObject
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCSSAsync(node: any, _options?: ProcessValueOptions) {
  if (node.getCSSAsync) {
    return node.getCSSAsync()
  } else if (isMasterGo()) {
    try {
      // 使用 getDSL API 获取更结构化的样式数据
      // getDSL 返回的 style.value 只包含纯样式，不含布局信息（position、left、top等）
      const dsl = await window.mg.codegen.getDSL(node.id)
      
      if (dsl?.root?.style?.value) {
        const { value: styleValue, textStyles } = dsl.root.style
        const { localStyleMap } = dsl
        
        // 尝试获取当前节点引用的文本样式 ID
        // textStyles 是一个数组，通常取第一个作为主样式
        const textStyleId = textStyles?.[0]?.textStyleId

        // 1. 解析 CSS 变量并替换成实际值
        const resolvedStyles = resolveCSSVariables(styleValue, localStyleMap, textStyleId)
        
        // 2. 清理无用的 CSS（删除默认值、空值、冗余属性）
        const cleanedStyles = cleanRedundantCSS(resolvedStyles)
        
        // 3. 对 CSS 属性进行排序，按照前端最佳实践
        const sortedStyles = sortCSSProperties(cleanedStyles)
        
        return sortedStyles
      }
      
      return {}
    } catch (error) {
      console.error('[getCSSAsync] Failed to get DSL data from MasterGo:', error)
      return {}
    }
  }
}
