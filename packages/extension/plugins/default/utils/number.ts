export function parseNumber(value) {
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

export function toDecimalPlace(value, places = 3) {
  const factor = Math.pow(10, places)
  return Math.round(value * factor) / factor
}
