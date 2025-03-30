export function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
} 