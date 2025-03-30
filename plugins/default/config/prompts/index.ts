// 我提供给你一个figma节点的部分信息，帮我根据这些信息还原vue2的组件，使用module css，用less语法，注意less模块划分。
// 提供的信息格式为json，其中每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的key则优先用customStyle的，不需要修改转换里面的rem等函数。
// 注意保持生成的组件结构简单和可维护性，遇到逻辑样式一致的节点，需要用循环的方式。需要注意响应式设计，针对容器节点一般不写死width和height。下面是json数据：

export const createUserPrompt = (uiInfo: any) => {
    return `

核心要求：
1. 基于提供的Figma节点JSON数据，生成Vue2组件
2. 使用CSS Module + Less语法
3. 严格遵循响应式设计原则
4. 符合Vue2组件开发最佳实践
5. 输出组件代码，不要输出任何解释


组件开发规范：

1. 响应式铁律：
   - 容器组件禁止设置：width/height/min-width/min-height
   - 允许设置：max-width/max-height（仅限非容器元素）

2. 布局准则：
   - 使用Flex实现弹性布局

3. 代码质量要求：
   - 重复节点必须转换为v-for循环
   - 提取共用的样式类
   - 使用语义化的class命名
   - 添加必要的注释

4. 特殊处理标记：
   固定尺寸元素仅限：
   - 按钮/图标/头像等原子元素
   - 需要精确控制大小的UI控件

样式处理规则：

1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
2. 单位保留：不转换rem()等函数，原样保留
3. 默认值过滤：如font-size:normal等默认值应省略

禁止事项：
- 出现重复的模板代码

请基于以下JSON数据生成组件：
${JSON.stringify(uiInfo)}

`.trim()
}