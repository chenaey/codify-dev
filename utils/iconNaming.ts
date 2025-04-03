/**
 * iconNaming.ts
 * 处理图标命名和文件名生成的工具函数
 */

/**
 * 格式化图标名称，确保统一的命名格式
 * @param name 原始名称
 * @param id 节点ID，作为备选
 * @returns 标准化的文件名，格式为 icon-xxx.svg
 */
export function formatIconName(name?: string, id?: string): string {  
  if (!name) {
    // 如果没有名称，则使用ID的一部分作为名称
    return `icon-${(id || '').replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase().substring(0, 8)}.svg`;
  }
  
  let baseName = name
  
  
  // 移除路径前缀（如果有）
  baseName = baseName.split(/[\/\\]/).pop() || baseName;
  
  // 替换特殊字符为连字符，但保留中文和字母数字
  // \w 匹配字母、数字、下划线
  // \u4e00-\u9fa5 匹配中文字符
  baseName = baseName.replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 将特殊字符替换为连字符
                    .replace(/-+/g, '-')       // 将多个连续连字符替换为单个
                    .replace(/^-|-$/g, '')     // 移除开头和结尾的连字符
                    .toLowerCase();             // 转为小写（只影响英文字母）
  
  // 如果处理后的名称为空，则使用ID
  if (!baseName) {
    return `icon-${(id || '').replace(/[^\w\u4e00-\u9fa5]/g, '').toLowerCase().substring(0, 8)}.svg`;
  }
  
  // 添加icon-前缀和svg后缀
  return `icon-${baseName}.svg`;
}

/**
 * 处理文件名冲突，如果存在同名文件则添加序号
 * @param fileName 原始文件名
 * @param existingFileNames 已存在的文件名集合或判断函数
 * @returns 确保唯一的文件名
 */
export function handleNameConflict(
  fileName: string, 
  existingFileNames: string[] | Set<string> | ((name: string) => boolean)
): string {
  // 判断文件名是否已存在
  const isNameExists = (name: string): boolean => {
    if (typeof existingFileNames === 'function') {
      return existingFileNames(name);
    } else if (Array.isArray(existingFileNames)) {
      return existingFileNames.includes(name);
    } else {
      return existingFileNames.has(name);
    }
  };

  // 如果文件名不存在冲突，直接返回
  if (!isNameExists(fileName)) {
    return fileName;
  }
  
  // 处理文件名冲突
  const nameParts = fileName.split('.');
  const ext = nameParts.pop() || 'svg';
  const baseName = nameParts.join('.');
  
  let counter = 1;
  let newFileName = `${baseName}-${counter}.${ext}`;
  
  // 循环查找直到找到一个不存在的文件名
  while (isNameExists(newFileName)) {
    counter++;
    newFileName = `${baseName}-${counter}.${ext}`;
  }
  
  return newFileName;
}

/**
 * 为一组图标生成唯一的文件名
 * @param resources 图标资源映射
 * @param node 当前节点
 * @param nodeName 节点名称
 * @param nodeId 节点ID
 * @returns 唯一的文件名
 */
export function generateUniqueIconName(
  resources: Map<string, any>,
  node: any,
  nodeName?: string,
  nodeId?: string
): string {
  // 生成基础文件名
  const baseFileName = formatIconName(nodeName || node?.name, nodeId || node?.id);
  
  // 检查resources中是否已存在此文件名
  const fileNameExists = (name: string): boolean => {
    return Array.from(resources.values()).some(value => value.fileName === name);
  };
  
  // 处理文件名冲突
  return handleNameConflict(baseFileName, fileNameExists);
} 