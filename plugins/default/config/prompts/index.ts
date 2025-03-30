export const createUserPrompt = (uiInfo: any) => {
    return `
我提供给你一个figma节点的部分信息，帮我根据这些信息还原vue2的组件，使用module css，用less语法，注意less模块划分。
提供的信息格式为json，其中每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的key则优先用customStyle的，不需要修改转换里面的rem等函数。
注意保持生成的组件结构简单和可维护性，遇到逻辑样式一致的节点，需要用循环的方式。

下面是json数据：
 
${JSON.stringify(uiInfo, null, 2)}
`
}