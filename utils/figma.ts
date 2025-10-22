import { ui } from '@/ui/figma'
import { getCurrentPlatform, Platform } from './platform';

export function getCanvas() {
  // Figma's original selector
  return document.querySelector('canvas') as HTMLElement
}

export function getLeftPanel() {
  const platform = getCurrentPlatform();
  if (platform === Platform.MasterGo) {
    // TODO: 请替换为 MasterGo 左侧面板的正确选择器
    return document.querySelector('.left-bar') as HTMLElement;
  }

  // Figma's original selector
  return document.querySelector('#left-panel-container') as HTMLElement
}

function getChevron() {
  return (
    document.querySelector<HTMLElement>(
      '#fullscreen-filename [class^="filename_view--chevronNoMainContainer--"]'
    ) ?? document.querySelector<HTMLElement>('[data-testid="filename-menu-chevron"]')
  )
}

function getDuplicateItem() {
  return document.querySelector<HTMLElement>(
    '[data-testid="dropdown-option-Duplicate to your drafts"]'
  )
}

export function showDuplicateItem() {
  const chevron = getChevron()

  if (!chevron) {
    return
  }

  chevron.dispatchEvent(new MouseEvent(ui.isUi3 ? 'click' : 'mousedown', { bubbles: true }))

  setTimeout(() => {
    const el = getDuplicateItem()
    el?.focus()
  }, 100)
}