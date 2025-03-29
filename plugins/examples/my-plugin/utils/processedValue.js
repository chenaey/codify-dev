import { getProjectConfig } from '../config'

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
    const { project, useRem, rootFontSize = 16, scale = 1, lessVariables = {} } = options

    // 提取默认值（处理CSS变量）
    const actualValue = extractDefaultValue(value)
    // 如果不是px值，直接返回
    if (!actualValue.endsWith('px')) {
        return actualValue
    }

    const numValue = parseFloat(actualValue) * scale

    // MVVM项目使用rem()函数格式
    if (project === 'mvvm') {
        let result = pxToMvvmRem(numValue)
        if (lessVariables[result]) {
            result = lessVariables[result]
        }
        console.log(result, value, options,lessVariables[result])
        return result
    }

    // 其他项目根据useRem决定是否转换为rem
    if (useRem) {
        return pxToRem(numValue, rootFontSize)
    }

    return `${formatNumber(numValue)}px`
}

// 处理line-height，支持rem和px
function convertLineHeight(lineHeight, style, options = {}) {
    // 如果已经是数字，直接返回
    if (!isNaN(Number(lineHeight))) {
        return lineHeight
    }

    // 如果没有fontSize，返回原值
    if (!style['font-size']) {
        return lineHeight
    }

    const { scale = 1 } = options

    // 如果单位相同，直接计算比例
    const unit = style['font-size'].match(/(px|rem)$/)?.[0]
    if (unit && lineHeight.endsWith(unit)) {
        const ratio = unit === 'px'
            ? (parseFloat(lineHeight) * scale) / (parseFloat(style['font-size']) * scale)
            : parseFloat(lineHeight) / parseFloat(style['font-size'])
        return formatNumber(ratio)
    }

    return lineHeight
}

const isWeb = (type) => type === 'web'

export default function processedValue(key, value, style, options) {
    const config = {
        ...getProjectConfig(options.project),
        ...options
    }

    if (isWeb(config.type)) {
        if (key === 'line-height') {
            return convertLineHeight(value, style, config)
        }
    }
    return convertUnit(value, config)
} 