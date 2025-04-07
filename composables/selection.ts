import { createQuirksSelection } from '@/ui/quirks'
import { selection } from '@/ui/state'
import { getCanvas, getLeftPanel } from '@/utils'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { onMounted, onUnmounted } from 'vue'

async function syncSelection() {
  if (!window.figma) {
    selection.value = createQuirksSelection()
    return
  }
  selection.value = figma.currentPage.selection

  // Print selection info
  console.log('[selection]', figma.currentPage.selection)

  // Print CSS info for the first selected node
  // const selectedNode = figma.currentPage.selection[0]
  // if (selectedNode) {
  //   try {
  //     // 提取UI信息（包含每个节点的CSS）
  //     const uiInfo = await extractSelectedNodes(figma.currentPage.selection)
  //     console.log('[UI Info]', uiInfo)
  //   } catch (error) {
  //     console.error('Failed to extract UI info:', error)
  //   }
  // }
}

async function handleClick() {
  await syncSelection()
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.target as Element).classList.contains('focus-target')) {
    // command + A or other shortcut that changes selection
    void syncSelection()
  }
}

export function useSelection() {
  const canvas = getCanvas()
  const objectsPanel = getLeftPanel()

  const options = { capture: true }

  onMounted(() => {
    void syncSelection()

    canvas.addEventListener('click', handleClick, options)
    objectsPanel.addEventListener('click', handleClick, options)
    window.addEventListener('keydown', handleKeyDown, options)
  })

  onUnmounted(() => {
    canvas.removeEventListener('click', handleClick, options)
    objectsPanel.removeEventListener('click', handleClick, options)
    window.removeEventListener('keydown', handleKeyDown, options)
  })
}
