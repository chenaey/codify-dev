import { createQuirksSelection } from '@/ui/quirks'
import { selection } from '@/ui/state'
import { getCanvas, getLeftPanel } from '@/utils'
import { getCurrentPlatform, Platform } from '@/utils/platform'; 
import { onMounted, onUnmounted } from 'vue'

// 一个临时的、简单的函数，用于将 MasterGo 节点对象转换成与 Figma 节点类似的结构
// 这样可以最大限度地复用现有的 UI 组件
// 预留函数，待 MasterGo 兼容完成后使用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeMasterGoNode(mgNode: any): any {
  // 这里的实现需要根据 MasterGo 节点对象的实际结构来定
  // 目标是让返回的对象结构尽量与 Figma 的节点对象保持一致
  return {
    id: mgNode.id,
    name: mgNode.name,
    type: mgNode.type,
    // ... 其他 UI 需要用到的属性
  };
}

async function syncSelection() {
  const platform = getCurrentPlatform();
  console.log('[syncSelection]', platform);


  if (platform === Platform.Figma) {
    if (!window.figma) {
      selection.value = createQuirksSelection()
      return
    }
    selection.value = figma.currentPage.selection
  } else if (platform === Platform.MasterGo) {
    if (window.mg && window.mg.document) {
      selection.value =  window.mg.document.currentPage.selection

      // MasterGo 需要等待节点数据完全同步后才能正确获取样式信息
      // 添加一个短暂的延迟，确保节点数据加载完成
      if (selection.value.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
        selection.value =  window.mg.document.currentPage.selection
      }
    }
    console.log('[MasterGo selection]', selection.value);
  }



  // Print selection info
  console.log('[selection]', selection.value)

  // Print CSS info for the first selected node
  // const selectedNode = figma.currentPage.selection[0]
  if (selection.value) {
    try {
      // 提取UI信息（包含每个节点的CSS）
      const uiInfo = await extractSelectedNodes(selection.value)
      console.log('[UI Info]', uiInfo)
    } catch (error) {
      console.error('Failed to extract UI info:', error)
    }
  }
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
