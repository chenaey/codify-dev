/**
 * 节点压缩模块 - 检测重复节点，跳过冗余提取
 *
 * 核心算法：
 * - 签名 = 组件ID + 内容哈希
 * - 只有「连续 + 内容相同」的节点才会被压缩
 * - CSS 缓存独立处理（基于 mainComponentId）
 */

export interface RepeatInfo {
  repeatCount: number // 设计稿中该结构的重复次数
  repeatNodeIds: string[] // 被跳过的节点 ID（调试用）
}

export interface RepeatPattern {
  /** 样本节点 ID（第一个遇到的节点） */
  sampleId: string
  /** 重复信息 */
  repeatInfo: RepeatInfo
}

// ============ 内容哈希 ============

/**
 * 快速字符串哈希（djb2 算法）
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return hash >>> 0
}

/**
 * 递归收集节点的内容特征
 * - TEXT: 文本内容
 * - 图片填充: imageRef/imageHash
 * - 矢量/图标: 节点类型 + 尺寸特征
 */
function collectContentFeatures(node: SceneNode, features: string[]): void {
  // 1. 文本节点 - 收集文本内容
  if (node.type === 'TEXT') {
    features.push(`t:${(node as TextNode).characters}`)
    return
  }

  // 2. 检查填充中的图片
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const fill of node.fills as Paint[]) {
      if (fill.type === 'IMAGE' && 'imageHash' in fill) {
        features.push(`i:${(fill as ImagePaint).imageHash}`)
      }
    }
  }

  // 3. 矢量类型节点（可能是图标）- 用类型+尺寸作为特征
  const vectorTypes = ['VECTOR', 'STAR', 'LINE', 'ELLIPSE', 'POLYGON', 'RECTANGLE', 'BOOLEAN_OPERATION']
  if (vectorTypes.includes(node.type)) {
    features.push(`v:${node.type}:${Math.round(node.width)}:${Math.round(node.height)}`)
    return // 矢量节点不需要递归子节点
  }

  // 4. 递归处理子节点
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children as SceneNode[]) {
      // 跳过不可见节点
      if ('visible' in child && child.visible === false) continue
      collectContentFeatures(child, features)
    }
  }
}

/**
 * 计算节点的内容哈希
 */
function computeContentHash(node: SceneNode): string {
  const features: string[] = []
  collectContentFeatures(node, features)

  // 无内容特征时返回空标记
  if (features.length === 0) return '0'

  // 合并所有特征并哈希
  const combined = features.join('|')
  return hashString(combined).toString(36)
}

// ============ 签名计算 ============

/**
 * 计算节点签名
 * - COMPONENT: "component:{id}:{contentHash}"
 * - INSTANCE: "component:{mainComponent.id}:{contentHash}"
 * - 其他节点: "struct:{type}:{width}:{height}:{childrenCount}:{contentHash}"
 */
export function computeNodeSignature(node: SceneNode): string {
  const contentHash = computeContentHash(node)

  // COMPONENT: 用自己的 id + 内容哈希
  if (node.type === 'COMPONENT') {
    return `component:${node.id}:${contentHash}`
  }

  // INSTANCE: 用 mainComponent.id + 内容哈希
  if (node.type === 'INSTANCE') {
    const mainComponentId = (node as InstanceNode).mainComponent?.id
    if (mainComponentId) {
      return `component:${mainComponentId}:${contentHash}`
    }
  }

  // 其他节点: 结构签名 + 内容哈希
  const parts: (string | number)[] = [node.type, Math.round(node.width), Math.round(node.height)]
  if ('children' in node && Array.isArray(node.children)) {
    parts.push(node.children.length)
  }
  return `struct:${parts.join(':')}:${contentHash}`
}

// ============ 模式检测 ============

/**
 * 检测兄弟节点中的重复模式
 * 只有连续排列的相同签名节点才会被压缩
 * 
 * @param children 可见的子节点列表
 * @param minCount 最少重复次数才算"模式"（默认 2）
 * @returns Map<签名, RepeatPattern>
 */
export function detectRepeatingPatterns(
  children: readonly SceneNode[],
  minCount = 2
): Map<string, RepeatPattern> {
  // Step 1: 找出连续的相同签名序列
  const sequences: { sig: string; nodes: SceneNode[] }[] = []
  let currentSeq: { sig: string; nodes: SceneNode[] } | null = null

  for (const child of children) {
    const sig = computeNodeSignature(child)

    if (currentSeq && currentSeq.sig === sig) {
      // 延续当前序列
      currentSeq.nodes.push(child)
    } else {
      // 结束上一个序列，开始新序列
      if (currentSeq && currentSeq.nodes.length >= minCount) {
        sequences.push(currentSeq)
      }
      currentSeq = { sig, nodes: [child] }
    }
  }
  // 处理最后一个序列
  if (currentSeq && currentSeq.nodes.length >= minCount) {
    sequences.push(currentSeq)
  }

  // Step 2: 转换为 RepeatPattern
  const patterns = new Map<string, RepeatPattern>()
  for (const seq of sequences) {
    // 用 sig + 起始位置 作为 key，支持同一签名在不同位置的多个连续序列
    const patternKey = `${seq.sig}@${seq.nodes[0].id}`
    const sampleId = seq.nodes[0].id
    const skippedIds = seq.nodes.slice(1).map((n) => n.id)

    patterns.set(patternKey, {
      sampleId,
      repeatInfo: {
        repeatCount: seq.nodes.length,
        repeatNodeIds: skippedIds
      }
    })
  }

  return patterns
}

/**
 * 构建需要跳过的节点 ID 集合
 * @param patterns 重复模式
 * @returns 需要跳过的节点 ID Set
 */
export function buildSkipIds(patterns: Map<string, RepeatPattern>): Set<string> {
  const skipIds = new Set<string>()
  for (const pattern of patterns.values()) {
    for (const id of pattern.repeatInfo.repeatNodeIds) {
      skipIds.add(id)
    }
  }
  return skipIds
}

/**
 * 获取样本节点的重复信息
 * @param nodeId 节点 ID
 * @param patterns 重复模式
 * @returns 如果是样本节点，返回 RepeatInfo；否则返回 null
 */
export function getRepeatInfo(
  nodeId: string,
  patterns: Map<string, RepeatPattern>
): RepeatInfo | null {
  for (const pattern of patterns.values()) {
    if (pattern.sampleId === nodeId) {
      return pattern.repeatInfo
    }
  }
  return null
}