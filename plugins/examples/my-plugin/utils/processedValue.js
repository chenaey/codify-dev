import { getProjectConfig } from '../config'
import { serializeCSS } from './css'

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
export function convertUnit(value, config = {}) {
    // 处理CSS变量
    const actualValue = extractDefaultValue(value)

    // 将值按空格分割，处理多值情况（如：margin: 10px 20px 30px 40px）
    const values = actualValue.split(/\s+/)

    // 处理每个值
    const convertedValues = values.map(val => {
        // 处理逗号分隔的值（如：box-shadow: 0px 2px 4px rgba(0,0,0,0.1), 0px 4px 8px rgba(0,0,0,0.1)）
        if (val.includes(',')) {
            const subValues = val.split(',')
            return subValues.map(subVal => convertSingleValue(subVal.trim(), config)).join(',')
        }
        return convertSingleValue(val, config)
    })

    return convertedValues.join(' ')
}

// 处理单个值的转换
function convertSingleValue(value, config) {
    const { project, scale = 1 } = config

    // 如果不是px值，直接返回
    if (!value.endsWith('px')) {
        return value
    }

    const numValue = parseFloat(value) * scale

    // MVVM项目使用rem()函数格式
    if (project === 'mvvm') {
        return pxToMvvmRem(numValue)
    }

    // 其他项目使用普通rem
    if (config.useRem) {
        return pxToRem(numValue, config.rootFontSize)
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

const getValue = (key, value, style, config) => {
    if (config.type === 'web' && key === 'line-height') {
        return convertLineHeight(value, style, config)
    }
    if (config.type === 'web') {
        return convertUnit(value, config)
    }

    return value
}

const filterStyle = (key, value, style, config) => {
    if (config.disallowedProperties.includes(key)) {
        return false
    }
    if (isDefaultValue(key, config.defaultValues, value)) {
        return false
    }
    if (key && key.startsWith('-webkit')) {
        return false
    }
    return true
}

// 转换为Android样式的key
function convertToAndroidKey(key) {
    // 特殊属性映射
    const androidKeyMap = {
        'display': 'android:display',
        'padding': 'android:padding',
        'margin': 'android:margin',
        'justify-content': 'android:justifyContent',
        'align-items': 'android:alignItems',
        'border-radius': 'android:radius',
        'background': 'android:background',
        'background-color': 'android:background',
        'color': 'android:textColor'
    }
    return androidKeyMap[key] || `android:${key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`
}

// 处理颜色变量
function processColorVariable(value) {
    // 匹配 var(--xxx, #default) 格式
    const varMatch = value.match(/var\((--[^,]+),\s*([^)]+)\)/)
    if (!varMatch) {
        return value
    }

    const [, varName] = varMatch
    // 将连字符格式转换为驼峰格式（去掉前缀--）
    const camelVarName = varName.slice(2).toLowerCase().replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    return `colors.${camelVarName}`
}

// 处理Android的值
function processAndroidValue(key, value) {
    // 处理特殊属性
    switch (key) {
        case 'display':
        case 'justify-content':
        case 'align-items':
            return value
        case 'width':
        case 'height':
            if (value === '100%') return 'match_parent'
            if (value === 'auto') return 'wrap_content'
            return value.replace(/(\d+)px/g, '$1dp')
        case 'background':
        case 'background-color':
        case 'color':
            // 处理颜色变量
            if (value.startsWith('var(')) {
                return `@color/${processColorVariable(value).replace('colors.', '')}`
            }
            return value.startsWith('#') ? value : `@color/${value}`
        case 'margin':
        case 'padding':
        case 'border-radius':
            // 保持空格分隔的多值格式，转换单位
            return value.replace(/(\d+)px/g, '$1dp')
        case 'font-size':
            return value.replace(/(\d+)px/g, '$1sp')
        case 'opacity':
            return String(parseFloat(value))
        default:
            if (value.includes('px')) {
                return value.replace(/(\d+)px/g, '$1dp')
            }
            return value
    }
}

// iOS (React Native) 样式处理
function parseIOS(style, config) {
    const iosTransform = {
        transform: ({ code, style }) => {
            // 处理特殊属性
            Object.entries(style).forEach(([key, value]) => {
                if (['display', 'justify-content', 'align-items'].includes(key)) {
                    // flex 相关属性不需要引号
                    code = code.replace(new RegExp(`"${key}":\\s*'${value}'`), `"${key}": ${value}`)
                }
            })
            return code
        }
    }

    // 预处理样式，处理颜色变量
    const processedStyle = Object.fromEntries(
        Object.entries(style).map(([key, value]) => {
            if (value.startsWith('var(')) {
                return [key, extractDefaultValue(value)]
            }
            return [key, value]
        })
    )

    return serializeCSS(processedStyle, { ...config, toJS: true }, iosTransform)
}

// Android 样式处理
function parseAndroid(style, config) {
    return Object.entries(style)
        .filter(([key, value]) => filterStyle(key, value, style, config))
        .map(([key, value]) => {
            const androidKey = convertToAndroidKey(key)
            const processedVal = processAndroidValue(key, value)
            return `${androidKey}="${processedVal}"`
        })
        .join('\n')
}

// Web 样式处理
function parseWeb(style, config) {
    return Object.entries(style)
        .filter(([key, value]) => filterStyle(key, value, style, config))
        .map(([key, value]) => {
            const processedVal = getValue(key, value, style, config)
            return `${key}: ${processedVal};`
        })
        .join('\n')
}

// 主函数保持简洁，只负责配置和分发
export default function parsedStyle(style, options) {
    const config = {
        ...options,
        ...getProjectConfig(options.project),
    }

    // 根据平台类型分发到对应的处理函数
    switch (config.type) {
        case 'ios':
            return parseIOS(style, config)
        case 'android':
            return parseAndroid(style, config)
        default:
            return parseWeb(style, config)
    }
}

