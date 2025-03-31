import type { CodeBlock } from '@/codegen/types'
import type { Ref } from 'vue'

export function useLoadingAnimation(aiCodeBlock: Ref<CodeBlock>) {
  const dots = ['.', '..', '...', '....']
  let index = 0
  let timer: number | null = null
  
  // 开始动画
  const start = () => {
    timer = window.setInterval(() => {
      aiCodeBlock.value.title = 'AI Generating' + dots[index++ % dots.length]
    }, 300)
  }
  
  // 停止动画
  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
  
  return { start, stop }
} 