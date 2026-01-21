// 组件映射配置
export interface ComponentMapping {
  name: string // 设计稿中的组件名称
  component: string // 对应的代码组件名称
  importPath: string // 组件导入路径
  description?: string // 组件描述
  props?: string[] // 组件支持的属性列表
}

// 组件映射表
export const componentMappings: ComponentMapping[] = [
  {
    name: 'DS_商品',
    component: 'ProductItem',
    importPath: 'component/product-item.vue',
    description: '商品展示组件',
    props: ['data']
  }
]

// 获取组件映射信息
export function getComponentMapping(name: string): ComponentMapping | undefined {
  // 精确匹配
  const exactMatch = componentMappings.find((mapping) => mapping.name === name)
  if (exactMatch) return exactMatch

  return componentMappings.find((mapping) => name.startsWith(mapping.name))
}
