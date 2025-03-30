// MVVM 项目特定的提示词
export const MVVM_SYSTEM_PROMPT = `你是一名资深前端开发专家。`

// CBG 项目特定的提示词
export const CBG_SYSTEM_PROMPT = `${MVVM_SYSTEM_PROMPT}

For CBG projects:
1. Use CSS Modules for styling
2. Follow component-based architecture
3. Implement responsive design
4. Use CSS Grid for layouts
5. Add proper animations
6. Consider mobile-first approach
7. Optimize for performance`

// 根据项目类型获取对应的提示词
export function getSystemPrompt(projectId: string): string {
  switch (projectId) {
    case 'mvvm':
      return MVVM_SYSTEM_PROMPT
    case 'cbg':
      return CBG_SYSTEM_PROMPT
    default:
      return MVVM_SYSTEM_PROMPT
  }
}
