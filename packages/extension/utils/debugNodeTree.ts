/**
 * 递归提取节点树的所有属性，输出为完整的 JSON
 * 用于调试 Figma/MasterGo 引擎的原始数据
 */

function extractNodeData(node: SceneNode): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  // 提取所有非函数属性
  for (const key in node) {
    if (key === 'parent') continue // 跳过 parent 避免循环引用

    try {
      const val = (node as any)[key]
      if (typeof val === 'function') continue

      // 特殊处理 children：递归提取
      if (key === 'children' && Array.isArray(val)) {
        data.children = val.map((child: SceneNode) => extractNodeData(child))
      } else {
        data[key] = val
      }
    } catch {
      // 忽略访问错误的属性
    }
  }

  return data
}

/**
 * 打印完整的节点树 JSON
 * @param selection - 选中的节点数组 (selection.value)
 */
export function printNodeTree(selection: readonly SceneNode[] | null): void {
  if (!selection || selection.length === 0) {
    console.log('No selection')
    return
  }

  const trees = selection.map((node) => extractNodeData(node))

  // 如果只选中一个节点，直接输出该节点
  const output = trees.length === 1 ? trees[0] : trees

  console.log(JSON.stringify(output, null, 2))
}
