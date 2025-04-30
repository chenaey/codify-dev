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
