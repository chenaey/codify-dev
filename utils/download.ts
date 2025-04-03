import JSZip from 'jszip'

interface IconResource {
  node: {
    id: string
    name: string
    type: string
    exportAsync?: (options: {
      format: string
      constraint?: { type: string; value: number }
    }) => Promise<Uint8Array>
  }
  fileName: string
}

/**
 * 处理文件名重复
 * @param name 文件名
 * @param existingNames 已存在的文件名集合
 * @returns 处理后的文件名
 */
function handleDuplicateName(name: string, existingNames: Set<string>): string {
  let finalName = name
  let counter = 1
  
  // 如果文件名已存在，添加数字后缀
  while (existingNames.has(finalName)) {
    const nameParts = name.split('.')
    const ext = nameParts.pop() || 'svg' // 获取扩展名，默认为svg
    const baseName = nameParts.join('.')
    finalName = `${baseName}-${counter}.${ext}`
    counter++
  }
  
  existingNames.add(finalName)
  return finalName
}

/**
 * 下载图标资源为zip文件
 * @param resources Map对象，包含图标资源
 * @param filename 下载文件名
 */
export async function downloadIconResources(
  resources: Map<string, IconResource>,
  filename: string = 'icons.zip'
) {
  if (!resources.size) {
    console.warn('No resources to download')
    return
  }

  const zip = new JSZip()
  const existingNames = new Set<string>()
  const exportPromises: Promise<void>[] = []

  // 创建所有导出任务的Promise数组
  for (const [id, resource] of resources.entries()) {
    // 获取实际的节点对象和文件名
    const node = resource.node
    const fileName = resource.fileName
    
    if (!node || !node.exportAsync) {
      console.warn(`Resource ${id} does not support export or is invalid`, resource)
      continue
    }

    const exportPromise = node.exportAsync({ format: 'SVG' })
      .then(svgArray => {
        
        // 处理文件名重复
        const finalName = handleDuplicateName(fileName, existingNames)
        
        // 直接添加到根目录
        zip.file(finalName, svgArray)
      })
      .catch(error => {
        console.error(`Failed to export resource ${id}:`, error)
      })

    exportPromises.push(exportPromise)
  }

  try {
    // 等待所有导出任务完成
    await Promise.all(exportPromises)
    
    // 生成zip文件并下载
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9 // 最高压缩级别
      }
    })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('Failed to create zip:', error)
    return false
  }
} 