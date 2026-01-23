import { useDocumentVisibility, useEventListener, useWindowFocus } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'

import { layoutReady, selection, runtimeMode } from '@/ui/state'
import { getCanvas, getLeftPanel } from '@/utils'
import { printNodeTree } from '@/utils/debugNodeTree'
import { getCurrentPlatform, Platform } from '@/utils/platform'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSameSelection(next: readonly any[], current: readonly any[]): boolean {
  if (next === current) return true
  if (next.length !== current.length) return false
  for (let i = 0; i < next.length; i += 1) {
    if (next[i]?.id !== current[i]?.id) return false
  }
  return true
}

export async function syncSelection() {
  const platform = getCurrentPlatform()

  if (platform === Platform.Figma) {
    if (!window.figma?.currentPage) {
      if (selection.value.length) {
        selection.value = []
      }
      return
    }
    const next = figma.currentPage.selection
    if (!isSameSelection(next, selection.value)) {
      selection.value = next
    }
  } else if (platform === Platform.MasterGo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mg = (window as any).mg
    if (mg?.document?.currentPage) {
      let next = mg.document.currentPage.selection
      // MasterGo 需要等待节点数据完全同步后才能正确获取样式信息
      // 添加一个短暂的延迟，确保节点数据加载完成
      if (next.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        next = mg.document.currentPage.selection
      }
      if (!isSameSelection(next, selection.value)) {
        selection.value = next
      }
    } else if (selection.value.length) {
      selection.value = []
    }
  }
  console.log(selection.value)
  // 打印选中节点的完整树结构，便于调试
  // printNodeTree(selection.value)
}

function handleClick() {
  syncSelection()
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.target as Element).classList.contains('focus-target')) {
    // command + A or other shortcut that changes selection
    syncSelection()
  }
}

export function useSelection() {
  const canvas = shallowRef<HTMLElement | null>(null)
  const objectsPanel = shallowRef<HTMLElement | null>(null)
  const documentVisibility = useDocumentVisibility()
  const focused = useWindowFocus()
  const isWindowActive = computed(() => documentVisibility.value === 'visible' && focused.value)

  const options = { capture: true }

  function syncTargets() {
    canvas.value = getCanvas()
    objectsPanel.value = getLeftPanel()
  }

  onMounted(() => {
    if (layoutReady.value) {
      syncTargets()
      syncSelection()
    }

    useEventListener(canvas, 'click', handleClick, options)
    useEventListener(objectsPanel, 'click', handleClick, options)
    useEventListener(window, 'keydown', handleKeyDown, options)
  })

  watch(
    layoutReady,
    (ready) => {
      if (ready) {
        syncTargets()
        return
      }
      canvas.value = null
      objectsPanel.value = null
      if (selection.value.length) {
        selection.value = []
      }
    },
    { immediate: true }
  )

  watch([runtimeMode, isWindowActive], ([mode, active]) => {
    if (mode !== 'standard') return
    if (!layoutReady.value) return
    if (active) syncSelection()
  })
}