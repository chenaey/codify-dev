/**
 * 节点压缩模块 - 检测重复节点，跳过冗余提取
 *
 * 核心算法：
 * - COMPONENT: 用自己的 id 作为签名
 * - INSTANCE: 用 mainComponent.id 作为签名
 * - 结果: COMPONENT 和它的所有 INSTANCE 有相同签名 → 只保留 COMPONENT
 */

export interface RepeatInfo {
  /** 重复节点总数（包括样本） */
  repeatCount: number
  /** 被跳过的节点 ID（不包括样本） */
  repeatNodeIds: string[]
}

export interface RepeatPattern {
  /** 样本节点 ID（第一个遇到的节点，通常是 COMPONENT） */
  sampleId: string
  /** 重复信息 */
  repeatInfo: RepeatInfo
}

/**
 * 计算节点签名
 * - COMPONENT: 返回 "component:{自己的id}"
 * - INSTANCE: 返回 "component:{mainComponent.id}"
 * - 其他节点: 返回 "struct:{type}:{width}:{height}:{childrenCount}"
 */
export function computeNodeSignature(node: SceneNode): string {
  // COMPONENT: 用自己的 id
  if (node.type === 'COMPONENT') {
    return `component:${node.id}`
  }

  // INSTANCE: 用 mainComponent.id
  if (node.type === 'INSTANCE') {
    const mainComponentId = (node as InstanceNode).mainComponent?.id
    if (mainComponentId) {
      return `component:${mainComponentId}`
    }
  }

  // 其他节点: 结构签名
  const parts: (string | number)[] = [node.type, Math.round(node.width), Math.round(node.height)]
  if ('children' in node && Array.isArray(node.children)) {
    parts.push(node.children.length)
  }
  return `struct:${parts.join(':')}`
}

/**
 * 检测兄弟节点中的重复模式
 * @param children 可见的子节点列表
 * @param minCount 最少重复次数才算"模式"（默认 2）
 * @returns Map<签名, RepeatPattern>
 */
export function detectRepeatingPatterns(
  children: readonly SceneNode[],
  minCount = 2
): Map<string, RepeatPattern> {
  // Step 1: 按签名分组
  const groups = new Map<string, SceneNode[]>()
  for (const child of children) {
    const sig = computeNodeSignature(child)
    const group = groups.get(sig) || []
    group.push(child)
    groups.set(sig, group)
  }

  // Step 2: 找出重复组（count >= minCount）
  const patterns = new Map<string, RepeatPattern>()
  for (const [sig, nodes] of groups) {
    if (nodes.length >= minCount) {
      const sampleId = nodes[0].id
      const skippedIds = nodes.slice(1).map((n) => n.id)
      patterns.set(sig, {
        sampleId,
        repeatInfo: {
          repeatCount: nodes.length,
          repeatNodeIds: skippedIds
        }
      })
    }
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
