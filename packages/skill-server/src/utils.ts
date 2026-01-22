import type { AssetInfo } from './types'

/**
 * Extract ICON nodes from design tree and merge into assets array.
 * API layer post-processing: automatically collect all ICON type nodes.
 */
export function extractIconAssets(design: unknown, assets: AssetInfo[]): AssetInfo[] {
  const iconAssets: AssetInfo[] = []
  const existingIds = new Set(assets.map((a) => a.nodeId))

  function traverse(node: unknown): void {
    if (!node || typeof node !== 'object') return

    const n = node as Record<string, unknown>

    // Check if this is an ICON node
    if (n.type === 'ICON' && typeof n.id === 'string' && !existingIds.has(n.id)) {
      iconAssets.push({
        nodeId: n.id,
        name: typeof n.name === 'string' ? n.name : `icon-${n.id}`,
        type: 'ICON',
        width: (n.layout as Record<string, unknown>)?.width as number | undefined,
        height: (n.layout as Record<string, unknown>)?.height as number | undefined
      })
      existingIds.add(n.id)
    }

    // Recurse into children
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        traverse(child)
      }
    }
  }

  // Handle both array and single node
  if (Array.isArray(design)) {
    for (const node of design) {
      traverse(node)
    }
  } else {
    traverse(design)
  }

  return [...assets, ...iconAssets]
}
