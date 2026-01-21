/**
 * MasterGo 平台专用的 CSS 处理工具
 *
 * 这个文件包含所有 MasterGo 特定的 CSS 提取和处理逻辑，
 * 与上游 Figma 逻辑分离，避免合并冲突。
 */

// ==================== 颜色转换 ====================

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

  const [, r, g, b, a] = match
  const alpha = a !== undefined ? parseFloat(a) : 1

  // 仅当不透明 (alpha === 1) 时才转换
  if (alpha === 1) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
    return `#${toHex(parseInt(r))}${toHex(parseInt(g))}${toHex(parseInt(b))}`.toUpperCase()
  }

  return input
}

// ==================== CSS 属性排序 ====================

const CSS_PROPERTY_ORDER: Record<string, number> = {
  // 1. 定位相关 (0-99)
  position: 0,
  top: 1,
  right: 2,
  bottom: 3,
  left: 4,
  'z-index': 5,

  // 2. 盒模型与布局 (100-199)
  display: 100,
  visibility: 101,
  overflow: 102,
  'overflow-x': 103,
  'overflow-y': 104,

  // Flex 布局
  flex: 110,
  'flex-grow': 111,
  'flex-shrink': 112,
  'flex-basis': 113,
  'flex-direction': 114,
  'flex-wrap': 115,
  'justify-content': 116,
  'align-items': 117,
  'align-content': 118,
  'align-self': 119,
  order: 120,
  gap: 121,
  'row-gap': 122,
  'column-gap': 123,

  // Grid 布局
  grid: 130,
  'grid-template': 131,
  'grid-template-columns': 132,
  'grid-template-rows': 133,
  'grid-gap': 134,

  // 3. 尺寸 (200-299)
  width: 200,
  'min-width': 201,
  'max-width': 202,
  height: 203,
  'min-height': 204,
  'max-height': 205,
  'box-sizing': 206,

  // 4. 边距和内边距 (300-399)
  margin: 300,
  'margin-top': 301,
  'margin-right': 302,
  'margin-bottom': 303,
  'margin-left': 304,
  padding: 310,
  'padding-top': 311,
  'padding-right': 312,
  'padding-bottom': 313,
  'padding-left': 314,

  // 5. 边框和圆角 (400-499)
  border: 400,
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
  font: 500,
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
  color: 520,

  // 7. 背景 (600-699)
  background: 600,
  'background-color': 601,
  'background-image': 602,
  'background-repeat': 603,
  'background-position': 604,
  'background-size': 605,
  'background-clip': 606,

  // 8. 其他视觉效果 (700-799)
  opacity: 700,
  'box-shadow': 701,
  'text-shadow': 702,
  transform: 703,
  transition: 704,
  animation: 705,
  cursor: 706,
  'pointer-events': 707
}

// ==================== CSS 默认值 ====================

const CSS_DEFAULT_VALUES: Record<string, string | string[]> = {
  display: 'block',
  position: 'static',
  float: 'none',
  clear: 'none',
  visibility: 'visible',
  opacity: '1',
  'z-index': 'auto',
  'flex-direction': 'row',
  'flex-wrap': 'nowrap',
  'justify-content': 'flex-start',
  'align-items': 'stretch',
  'align-content': 'stretch',
  'align-self': 'auto',
  order: '0',
  'flex-grow': '0',
  'flex-shrink': '1',
  'flex-basis': 'auto',
  gap: '0',
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
  cursor: 'auto',
  'pointer-events': 'auto',
  'box-sizing': 'content-box',
  overflow: 'visible',
  'overflow-x': 'visible',
  'overflow-y': 'visible'
}

// ==================== CSS 清理与排序 ====================

/**
 * 清理冗余的 CSS 属性
 * - 移除默认值
 * - 移除被简写属性覆盖的展开属性
 */
function cleanRedundantCSS(styleObject: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {}

  const hasPadding = 'padding' in styleObject && styleObject.padding
  const hasMargin = 'margin' in styleObject && styleObject.margin
  const hasBorder = 'border' in styleObject && styleObject.border
  const hasGap = 'gap' in styleObject && styleObject.gap
  const hasFlex = 'flex' in styleObject && styleObject.flex

  for (const [key, value] of Object.entries(styleObject)) {
    if (!value || value.trim() === '' || value === 'undefined' || value === 'null') {
      continue
    }

    const defaultValue = CSS_DEFAULT_VALUES[key]
    if (defaultValue) {
      const defaultValues = Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      const normalizedValue = value.trim()
      if (
        defaultValues.some((def) => {
          const normalizedDef = def.trim()
          return (
            normalizedValue === normalizedDef ||
            normalizedValue === `var(${normalizedDef})` ||
            normalizedValue === `var(--${normalizedDef})`
          )
        })
      ) {
        continue
      }
    }

    if (
      hasPadding &&
      (key === 'padding-top' ||
        key === 'padding-right' ||
        key === 'padding-bottom' ||
        key === 'padding-left')
    ) {
      continue
    }

    if (
      hasMargin &&
      (key === 'margin-top' ||
        key === 'margin-right' ||
        key === 'margin-bottom' ||
        key === 'margin-left')
    ) {
      continue
    }

    if (hasBorder && (key === 'border-width' || key === 'border-style' || key === 'border-color')) {
      continue
    }

    if (hasGap && (key === 'row-gap' || key === 'column-gap')) {
      const gapValue = styleObject.gap.trim()
      if (value.trim() === gapValue) {
        continue
      }
    }

    if (hasFlex && (key === 'flex-grow' || key === 'flex-shrink' || key === 'flex-basis')) {
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
 * 按照规范顺序排列 CSS 属性
 */
function sortCSSProperties(styleObject: Record<string, string>): Record<string, string> {
  const entries = Object.entries(styleObject)

  entries.sort(([keyA], [keyB]) => {
    const orderA = CSS_PROPERTY_ORDER[keyA] ?? 9999
    const orderB = CSS_PROPERTY_ORDER[keyB] ?? 9999

    if (orderA !== orderB) {
      return orderA - orderB
    }

    return keyA.localeCompare(keyB)
  })

  return Object.fromEntries(entries)
}

// ==================== CSS 变量解析 ====================

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 解析 MasterGo DSL 中的 CSS 变量
 */
function resolveCSSVariables(
  styleValue: Record<string, any>,
  localStyleMap: Record<string, any> | undefined,
  textStyleId?: string | null
): Record<string, string> {
  const styleObject: Record<string, string> = {}

  const cssVarRegex = /^var\((--[\w-]+)\)$/

  if (!localStyleMap) {
    for (const [key, value] of Object.entries(styleValue)) {
      styleObject[key] = typeof value === 'string' ? value : String(value)
    }
    return styleObject
  }

  const varNameToValueMap = new Map<string, string>()

  for (const tokenData of Object.values(localStyleMap) as any[]) {
    if (tokenData.name && tokenData.value) {
      varNameToValueMap.set(tokenData.name, String(tokenData.value))
    }
  }

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

  for (const [key, value] of Object.entries(styleValue)) {
    let finalValue = typeof value === 'string' ? value : String(value)

    const match = finalValue.match(cssVarRegex)
    if (match) {
      const varName = match[1]

      const actualValue = varNameToValueMap.get(varName)
      if (actualValue) {
        finalValue = actualValue
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
/* eslint-enable @typescript-eslint/no-explicit-any */

// ==================== 主入口函数 ====================

/**
 * 从 MasterGo 节点获取 CSS 样式
 *
 * 这是 MasterGo 平台的 getCSSAsync 实现，
 * 通过 MasterGo 的 codegen API 获取 DSL 数据并转换为 CSS。
 *
 * 注意：这个函数不检查平台，由调用方负责确保在 MasterGo 环境中调用。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMasterGoCSSAsync(node: any): Promise<Record<string, string>> {
  try {
    const dsl = await window.mg.codegen.getDSL(node.id)

    if (dsl?.root?.style?.value) {
      const { value: styleValue, textStyles } = dsl.root.style
      const { localStyleMap } = dsl

      const textStyleId = textStyles?.[0]?.textStyleId

      const resolvedStyles = resolveCSSVariables(styleValue, localStyleMap, textStyleId)
      const cleanedStyles = cleanRedundantCSS(resolvedStyles)
      const sortedStyles = sortCSSProperties(cleanedStyles)

      return sortedStyles
    }

    return {}
  } catch (error) {
    console.error('[getMasterGoCSSAsync] Failed to get DSL data from MasterGo:', error)
    return {}
  }
}
