/**
 * 将serializeCSS(toJS=false)返回的CSS字符串转换为标准的CSS JSON格式
 * @param cssString 多行的CSS字符串，如 "display: flex;\nmargin: 10px;"
 * @returns 标准的CSS JSON对象，键为CSS属性，值为CSS值
 */
export function convertSerializedCSSToJson(cssString: string): Record<string, string> {
  // 创建结果对象
  const cssJson: Record<string, string> = {};
  
  // 按行分割CSS字符串
  const lines = cssString.split('\n');
  
  // 处理每一行
  for (let line of lines) {
    line = line.trim();
    
    // 跳过空行
    if (!line) continue;
    
    // 移除末尾的分号
    if (line.endsWith(';')) {
      line = line.slice(0, -1);
    }
    
    // 查找第一个冒号，分割属性名和值
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue; // 跳过无效行
    
    const property = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    // 属性名和值都不为空时添加到结果对象
    if (property && value) {
      cssJson[property] = value;
    }
  }
  
  return cssJson;
}
// mastergo格式
export function cssStringToObject(cssString) {
  if (!cssString || typeof cssString !== 'string') {
    return {}
  }
  const excludeCSSProperty = ['position', 'left', 'right', 'bottom', 'top']
  const cssObject = {}

  // 按分号分割样式属性
  const styles = cssString.split(';')

  styles.forEach((style) => {
    // 去除首尾空格
    style = style.trim()

    // 跳过空字符串
    if (!style) return

    // 按第一个冒号分割属性名和值
    const colonIndex = style.indexOf(':')
    if (colonIndex === -1) return

    const property = style.substring(0, colonIndex).trim()
    const value = style.substring(colonIndex + 1).trim()

    // 跳过空属性名或空值
    if (!property) return

    // 将 kebab-case 转换为 camelCase
    // const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) => {
    //   return letter.toUpperCase()
    // })
    // 将 camelCase 转换为 kebab-case
    const kebabCaseProperty = property.replace(/[A-Z]/g, (match) => {
      return '-' + match.toLowerCase()
    })
    if (!excludeCSSProperty.includes(kebabCaseProperty)) {
      cssObject[kebabCaseProperty] = value
    }

  })

  return cssObject
}