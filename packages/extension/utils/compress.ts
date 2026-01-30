/**
 * 图片压缩工具
 * 用于将图片转换为压缩后的 JPEG，减少传输体积和 Token 消耗
 */

/**
 * 加载图片
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/**
 * 将图片字节数据压缩为 JPEG data URL
 * @param bytes 原始图片字节
 * @param quality JPEG 质量 0-1，默认 0.7
 * @param mimeType 输入图片的 MIME 类型，默认 'image/png'
 * @returns JPEG data URL
 */
export async function compressToJpeg(
  bytes: Uint8Array,
  quality = 0.7,
  mimeType: string = 'image/png'
): Promise<string> {
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)

  try {
    const img = await loadImage(url)

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
