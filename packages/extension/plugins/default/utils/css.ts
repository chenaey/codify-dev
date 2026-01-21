import { parseNumber, toDecimalPlace } from './number'
import { kebabToCamel } from './string'

function escapeSingleQuote(value) {
  return value.replace(/'/g, "\\'")
}

function trimComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '')
}

const PX_VALUE_RE = /\b(-?\d+(?:.\d+)?)px\b/g
const VARIABLE_RE = /var\(--([a-zA-Z\d-]+)(?:,\s*([^)]+))?\)/g
const KEEP_PX_PROPS = ['border', 'box-shadow', 'filter', 'backdrop-filter', 'stroke-width']

function transformPxValue(value, transform) {
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

function scalePxValue(value, scale) {
  return transformPxValue(value, (val) => `${toDecimalPlace(scale * val)}px`)
}

function pxToRem(value, rootFontSize) {
  return transformPxValue(value, (val) => `${toDecimalPlace(val / rootFontSize)}rem`)
}

export function serializeCSS(
  style,
  { toJS = false, useRem, rootFontSize, scale, project } = {},
  { transform, transformVariable, transformPx } = {}
) {
  const options = { useRem, rootFontSize, scale, project }

  function processValue(key, value) {
    let current = trimComments(value).trim()

    if (typeof scale === 'number' && scale !== 1) {
      current = scalePxValue(current, scale)
    }

    if (typeof transformVariable === 'function') {
      current = current.replace(VARIABLE_RE, (_, name, value) =>
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

  function stringifyValue(value) {
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
