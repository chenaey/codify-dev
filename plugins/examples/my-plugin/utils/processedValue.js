// 检查是否为默认值
export function isDefaultValue(property, defaultValues, value) {
    if (!(property in defaultValues)) {
        return false
    }
    return defaultValues[property] === value
}

// 处理CSS变量，提取默认值
export function extractDefaultValue(value) {
    // 匹配 var(--xxx, #default) 格式
    const match = value.match(/var\([^,]+,\s*([^)]+)\)/)
    if (match) {
        return match[1].trim()
    }
    return value
}

// 将rem转换为px
export function remToPx(remValue, rootFontSize = 16) {
    const match = remValue.match(/^([\d.]+)rem$/)
    if (match) {
        return Number(match[1]) * rootFontSize
    }
    return 0
}

// 将px转换为rem
export function pxToRem(pxValue, rootFontSize = 16) {
    const px = typeof pxValue === 'string' ? parseFloat(pxValue) : pxValue
    return `${(px / rootFontSize).toFixed(3)}rem`
}

// 将px转换为MVVM的rem函数格式
export function pxToMvvmRem(pxValue) {
    const px = typeof pxValue === 'string' ? parseFloat(pxValue) : pxValue
    return `rem(${px})`
}

// 格式化数字，整数时不显示小数点
export function formatNumber(num) {
    return Number.isInteger(num) ? num.toString() : num.toFixed(2)
}

// 处理数值单位转换
export function convertUnit(value, options = {}) {
    const { project, useRem, rootFontSize = 16, scale = 1 } = options

    // 提取默认值（处理CSS变量）
    const actualValue = extractDefaultValue(value)

    // 如果不是px值，直接返回
    if (!actualValue.endsWith('px')) {
        return actualValue
    }

    const numValue = parseFloat(actualValue) * scale

    // MVVM项目使用rem()函数格式
    if (project === 'mvvm') {
        return pxToMvvmRem(numValue)
    }

    // 其他项目根据useRem决定是否转换为rem
    if (useRem) {
        return pxToRem(numValue, rootFontSize)
    }

    return `${formatNumber(numValue)}px`
}

// 处理line-height，支持rem和px
function convertLineHeight(lineHeight, fontSize, options = {}) {
    const rootFontSize = options.rootFontSize || 16
    const scale = options.scale || 1

    // 如果已经是数字，直接返回
    if (!isNaN(Number(lineHeight))) {
        return formatNumber(Number(lineHeight))
    }

    // 获取字体大小（以px为单位）
    let fontSizePx = 16 // 默认值
    if (fontSize) {
        if (fontSize.endsWith('rem')) {
            fontSizePx = remToPx(fontSize, rootFontSize)
        } else if (fontSize.endsWith('px')) {
            fontSizePx = parseFloat(fontSize)
        }
    }
    fontSizePx *= scale

    // 获取行高（以px为单位）
    let lineHeightPx = null
    if (lineHeight.endsWith('rem')) {
        lineHeightPx = remToPx(lineHeight, rootFontSize) * scale
    } else if (lineHeight.endsWith('px')) {
        lineHeightPx = parseFloat(lineHeight) * scale
    }

    if (lineHeightPx !== null && fontSizePx) {
        // 计算相对值并格式化
        const ratio = lineHeightPx / fontSizePx
        return formatNumber(ratio)
    }

    return lineHeight
}

export default function processedValue(key, value, options) {
    if (key === 'line-height') {
        return convertLineHeight(value, options.fontSize, options)
    }

    return convertUnit(value, options)
} 