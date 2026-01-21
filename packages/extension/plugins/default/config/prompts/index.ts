export const generatePrompt = (language: string) => {
  return `
  
  核心要求：
  1. 基于提供的Figma节点JSON数据，生成组件代码
  2. 使用 ${language} 语法
  3. 严格遵循响应式设计原则
  4. 输出组件代码，不要输出任何解释
  
  组件开发规范：
  
  1. 响应式铁律：
     - 容器组件禁止设置：width/height/min-width/min-height这些属性为固定数值，允许设置100%。
     - 允许设置：max-width/max-height（仅限非容器元素）
     - 考虑容器的自适应
  
  2. 布局准则：
     - 使用Flex实现弹性布局
     - 严格遵循数据的嵌套结构，严格遵循节点中的layoutMode定义：
       'HORIZONTAL' - 水平布局模式，相当于CSS中的 display: flex，子元素会在水平方向上排列。
       'VERTICAL' - 垂直布局模式，相当于CSS中的 display: flex 和 flex-direction: column，子元素会在垂直方向上排列。
     - 必须递归处理所有嵌套层级的layoutMode，不要遗漏任何子节点
  
  3. 层级优化：
     - 相同布局方向的连续Frame可以合并
     - 没有实际样式/间距影响的中间层Frame可以去除
     - 避免不必要的div嵌套，不需要多余的div，对于这种情况 在不影响布局的情况下，必须简化为。
        例如这里有三层嵌套一个内容：
           <div ><div> <div>内容 </div> </div> </div>
        应该简化为：
           <div> 内容 </div>
  
  4. 特殊处理标记：
     固定尺寸元素仅限：
     - 按钮/图标/头像等原子元素
     - 需要精确控制大小的UI控件
  
  5. 自定义组件处理：
     - 当节点包含custom_component字段时，表示这是一个自定义Vue2组件
     - 需要在组件内添加对应的import语句，使用importPath信息
     - 使用组件时遵循props中定义的属性列表
  
  6. 图标/SVG处理：
     - 当节点包含vector字段时，表示这是一个矢量图标或SVG元素（
     - 优先使用以下方式处理SVG图标（按优先级顺序）：
       
       1. 如果存在vector.assetPath，使用require导入本地资源：
          <img :src="require([vector.assetPath])"  alt="图标" />
          特别注意：图标不需要遵循数据驱动视图原则, vector.assetPath不需要在data中定义，直接在template中使用。
       
       2. 如果不存在vector.resourceId但有svgContent数据，则转换为内联SVG：
          
  7. 严格遵循数据驱动视图原则：将模板内容数据化，避免硬编码，使数据和视图解耦。
     - 数据结构相似性/UI相似性达60%以上时，应该明确使用v-for，差异的部分用字段来标识
     - template中的文本内容都应该使用数据驱动，需要明确定义在 data/props 中，JSON数据中的style、layout、vector等字段是布局信息，一般不需要在data中定义
       如： <div>标题</div> 应该转换为 <div>{{ data.title }}</div> 
     - 根据提供的JSON结构设计合理的组件数据结构，比如根据children字段来设计应用v-for的列表数据结构,注意不是所有的都需要v-for。
     - 确保组件数据结构合理，必须包含JSON中所有文本节点，不要遗漏任何数据。
     - 禁止使用直接读取下标的方式，比如data[0]，应该使用循环等合理方式
  
  样式处理规则：
  
  1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
  2. 当customStyle没有包含间距相关样式时，应该回退到layout.spacing数据
  3. 单位保留：不转换rem()等函数，原样保留
  4. 默认值过滤：如font-size:normal等默认值应省略
  5. 非必要不使用:style绑定样式
  6. 在使用customStyle、style的基础上，应该用每个节点layout.margin字段（如有）来计算准确兄弟元素之间的间距
  
    这是layout的相关字段定义和描述
    layout: {
      x: number // 布局x坐标
      y: number // 布局y坐标
      width?: number // 布局宽度
      height?: number // 布局高度
      layoutMode?: string // 布局模式 (HORIZONTAL | VERTICAL)
      layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
      padding?: {
        top: number
        right: number
        bottom: number
        left: number
      }
      // margin相关信息
      margin?: {
        top?: number
        right?: number
        bottom?: number
        left?: number
      }
    }
  
  7. 分割线处理：当节点包含divider字段时，表示这是一个分割线，必须使用以下方式处理分割线：
     - 作为父元素/兄弟元素的border，根据实际情况判断应该运用的位置
     这是相关的字段定义和描述
     divider?: {
        orientation: 'horizontal' | 'vertical'
        // 分割线样式
        style: {
           // 分割线颜色，用于border-color
           color: string
           // 分割线粗细，用于border-width
           thickness: number
           // 线条样式，用于border-style
           lineStyle?: 'solid' | 'dashed' | 'dotted'
        }
        // 分割线布局
        layout: {
           // 是否全宽，true表示width:100%
           fullWidth?: boolean
           // 是否全高，true表示height:100%
           fullHeight?: boolean
        }
     }
  8.需注意浏览器默认样式，比如button等元素，默认有border，需要根据实际情况判断是否需要去除。
  
  代码质量要求：
     - 减少重复代码：必须将所有重复的节点转换为 v-for 循环，提高复用性。
     - 优化样式管理：提取共用的样式类，避免内联样式，并使用语义化的 class 命名。
     - 提高可读性：优化模板逻辑，使代码更加清晰，避免不必要的逻辑嵌套。
     - 提高可维护性：添加必要的注释，说明关键代码的作用，方便后续维护。
       不应该使用v-if index ===1 v-if index ===2 这种写法来区分 如果有需要区分应该定义一个变量来区分
  
  
  禁止事项：
     - 出现重复的模板代码
  `.trim()
}
