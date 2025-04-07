// 我提供给你一个figma节点的部分信息，帮我根据这些信息还原vue2的组件，使用module css，用less语法，注意less模块划分。
// 提供的信息格式为json，其中每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的key则优先用customStyle的，不需要修改转换里面的rem等函数。
// 注意保持生成的组件结构简单和可维护性，遇到逻辑样式一致的节点，需要用循环的方式。需要注意响应式设计，针对容器节点一般不写死width和height。下面是json数据：
const mvvmPrompt = `

核心要求：
1. 基于提供的Figma节点JSON数据，生成Vue2组件
2. 使用CSS Module + Less语法
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

3. 特殊处理标记：
   固定尺寸元素仅限：
   - 按钮/图标/头像等原子元素
   - 需要精确控制大小的UI控件

4. 自定义组件处理：
   - 当节点包含custom_component字段时，表示这是一个自定义Vue2组件
   - 需要在组件内添加对应的import语句，使用importPath信息
   - 使用组件时遵循props中定义的属性列表

5. 图标/SVG处理：
   - 当节点包含vector字段时，表示这是一个矢量图标或SVG元素（
   - 优先使用以下方式处理SVG图标（按优先级顺序）：
     
     1. 如果存在vector.assetPath，使用require导入本地资源：
        <img :src="require([vector.assetPath])"  alt="图标" />
        注意：这里不需要遵循数据驱动视图原则，不需要在data中定义，直接在template中使用。
     
     2. 如果不存在vector.resourceId但有paths数据，则转换为内联SVG：
        <svg :width="vector.width" :height="vector.height" :viewBox="vector.viewBox" xmlns="http://www.w3.org/2000/svg">
          <path 
            v-for="(path, index) in vector.paths" 
            :key="index"
            :d="path.d" 
            :fill="path.fill || vector.color || 'currentColor'" 
            :stroke="path.stroke"
            :stroke-width="path.strokeWidth"
            :fill-rule="path.fillRule" />
        </svg>
   
     3. 对于isMultiPath为true的复杂图标，简化为色块：
        <svg :width="vector.width" :height="vector.height" :viewBox="vector.viewBox" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" :fill="vector.color || '#409EFF'" />
        </svg>

6. 严格遵循数据驱动视图原则：将模板内容数据化，避免硬编码，使数据和视图解耦。
   - 数据结构相似性/UI相似性达60%以上时，应该明确使用v-for，差异的部分用字段来标识
   - template中的文本内容都应该使用数据驱动，需要明确定义在 data/props 中
     如： <div>标题</div> 应该转换为 <div>{{ data.title }}</div> 
   - 根据提供的JSON结构设计合理的组件数据结构，比如根据children字段来设计应用v-for的列表数据结构,注意不是所有的都需要v-for。
   - 确保组件数据结构合理，必须包含JSON中所有可见文本节点，不要遗漏任何数据。

样式处理规则：

1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
2. 当customStyle没有包含间距相关样式时，应该回退到layout.spacing数据
3. 单位保留：不转换rem()等函数，原样保留
4. 默认值过滤：如font-size:normal等默认值应省略
5. 非必要不使用:style绑定样式
6. 在使用customStyle、style的基础上，应该用每个节点layout.spacing.siblings字段（如有）来推算出准确的父子元素之间、兄弟元素之间的间距，其中direction代表间距方向。
  - spacing.siblings.after需严格遵循"最近优先"的嵌套间距原则
  这是layout的相关字段定义和描述
  layout: {
    x: number // 布局x坐标
    y: number // 布局y坐标
    width?: number // 布局宽度
    height?: number // 布局高度
    rotation?: number 
    layoutMode?: string // 布局模式 (HORIZONTAL | VERTICAL)
    layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
    padding?: {
      top: number
      right: number
      bottom: number
      left: number
    }
    // 布局信息关系字段
    spacing?: {
      siblings?: {
        after?: number  // 与后一个兄弟节点的间距
        direction?: 'horizontal' | 'vertical' // 间距方向，水平或垂直
      }
    }
    // 布局意图描述
    intent?: string
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
`
const cbgPrompt = `

核心要求：
1. 基于提供的Figma节点JSON数据，生成Vue3组件
2. 使用Script Setup +CSS Module + Less语法
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


3. 特殊处理标记：
   固定尺寸元素仅限：
   - 按钮/图标/头像等原子元素
   - 需要精确控制大小的UI控件

4. 自定义组件处理：
   - 当节点包含custom_component字段时，表示这是一个自定义Vue2组件
   - 需要在组件内添加对应的import语句，使用importPath信息
   - 使用组件时遵循props中定义的属性列表

5. 图标/SVG处理：
   - 当节点包含vector字段时，表示这是一个矢量图标或SVG元素（
   - 优先使用以下方式处理SVG图标（按优先级顺序）：
     
     1. 如果存在vector.assetPath，使用require导入本地资源：
        <img :src="require([vector.assetPath])"  alt="图标" />
        注意：这里不需要遵循数据驱动视图原则
     
     2. 如果不存在vector.resourceId但有paths数据，则转换为内联SVG：
        <svg :width="vector.width" :height="vector.height" :viewBox="vector.viewBox" xmlns="http://www.w3.org/2000/svg">
          <path 
            v-for="(path, index) in vector.paths" 
            :key="index"
            :d="path.d" 
            :fill="path.fill || vector.color || 'currentColor'" 
            :stroke="path.stroke"
            :stroke-width="path.strokeWidth"
            :fill-rule="path.fillRule" />
        </svg>
   
     3. 对于isMultiPath为true的复杂图标，简化为色块：
        <svg :width="vector.width" :height="vector.height" :viewBox="vector.viewBox" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" :fill="vector.color || '#409EFF'" />
        </svg>

6. 严格遵循数据驱动视图原则：将模板内容数据化，避免硬编码，使数据和视图解耦。
   - 数据结构相似性/UI相似性达60%以上时，应该明确使用v-for，差异的部分用字段来标识
   - template中的文本内容都应该使用数据驱动，需要明确定义在 data/props 中
     如： <div>标题</div> 应该转换为 <div>{{ data.title }}</div> 
   - 根据提供的JSON结构设计合理的组件数据结构，比如根据children字段来设计应用v-for的列表数据结构,注意不是所有的都需要v-for。
   - 确保组件数据结构合理，必须包含JSON中所有可见文本节点，不要遗漏任何数据。

样式处理规则：

1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
2. 当customStyle没有包含间距相关样式时，应该回退到layout.spacing数据
3. 单位保留：不转换rem()等函数，原样保留
4. 默认值过滤：如font-size:normal等默认值应省略
5. 非必要不使用:style绑定样式
6. 在使用customStyle、style的基础上，应该用每个节点layout.spacing.siblings字段（如有）来推算出准确的父子元素之间、兄弟元素之间的间距，其中direction代表间距方向。
  - spacing.siblings.after需严格遵循"最近优先"的嵌套间距原则
  这是layout的相关字段定义和描述
  layout: {
    x: number // 布局x坐标
    y: number // 布局y坐标
    width?: number // 布局宽度
    height?: number // 布局高度
    rotation?: number 
    layoutMode?: string // 布局模式 (HORIZONTAL | VERTICAL)
    layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
    padding?: {
      top: number
      right: number
      bottom: number
      left: number
    }
    // 布局信息关系字段
    spacing?: {
      siblings?: {
        after?: number  // 与后一个兄弟节点的间距
        direction?: 'horizontal' | 'vertical' // 间距方向，水平或垂直
      }
    }
    // 布局意图描述
    intent?: string
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
`
const iosPrompt = `
核心要求：
1. 基于提供的设计节点JSON数据，生成React Native组件
2. 严格遵循React Native响应式设计原则
3. 输出组件代码，不要输出任何解释

组件开发规范：

1. 响应式布局原则：
   - 优先使用flex布局
   - 避免使用固定宽高（除非特殊UI要求）
   - 使用Dimensions获取屏幕尺寸进行自适应
   - 支持不同设备分辨率

2. 样式编写准则：
   - 使用StyleSheet.create定义样式
   - 遵循项目既有的样式命名规范
   - 样式属性按照布局、尺寸、外观的顺序排列

3. 代码质量要求：
   - 相似节点使用map循环渲染
   - 抽取可复用的样式
   - 使用语义化的命名
   - 添加必要的类型注释和代码注释

4. 特殊处理规则：
   固定尺寸仅用于：
   - 图标/头像等固定比例元素
   - 需要精确控制的UI组件
   - 项目特定的自定义组件

样式处理规范：

1. 样式优先级：
   - 忽略customStyle中定义的样式
   - 保持原有的单位和函数调用



禁止事项：
- 不得出现重复的模板代码
- 不使用内联样式（除非动态样式）
- 不使用已废弃的React Native API
`
const androidPrompt = `
核心要求：
1. 基于提供的设计节点JSON数据，生成Android XML布局文件和对应的Kotlin代码
2. 使用XML编写UI布局，不使用Jetpack Compose
3. 严格遵循Android Material Design设计规范
4. 符合Android MVVM架构模式
5. 输出完整代码，不要输出任何解释

XML布局规范：

1. 布局结构：
   - 每个组件必须包含：
     * layout/xxx_activity.xml 或 layout/xxx_fragment.xml（主布局）
     * layout/xxx_item.xml（列表项布局，如需）
     * layout/xxx_include.xml（可复用布局，如需）
   - 使用<merge>标签优化include布局
   - 使用<ViewStub>处理按需加载的布局

2. 布局命名规范：
   - 布局文件：layout_module_function.xml
   - 控件ID：module_function_control_type
   例如：
   - home_user_tv_name（home模块用户名TextView）
   - order_list_rv_container（订单列表RecyclerView容器）

3. 布局属性规范：
   - android:layout_width/height优先使用wrap_content/match_parent
   - android:layout_margin使用@dimen资源引用
   - android:padding使用@dimen资源引用
   - android:textSize使用@dimen资源引用
   - android:textColor使用@color资源引用
   - android:background优先使用selector或shape drawable

4. 约束布局规则：
   - ConstraintLayout作为根布局
   - 使用约束链（chain）处理等分布局
   - 使用guideline辅助定位
   - 使用barrier处理动态内容
   - 使用group管理多个控件可见性



布局优化准则：

1. 层级优化：
   - 布局层级不超过5层
   - 合理使用include复用布局
   - 使用merge标签减少层级
   - 使用Space替代margin（适当场景）

2. 性能考虑：
   - 避免过度绘制
   - 合理使用ViewStub
   - 减少布局嵌套
   - 使用tools命名空间预览数据

3. 适配处理：
   - 使用dp作为尺寸单位
   - 使用sp作为文字单位
   - 支持横竖屏适配（如需）
   - 使用限定符资源适配不同屏幕

XML与代码交互：

1. 视图绑定：
   - 使用ViewBinding替代findViewById
   - 在Activity/Fragment中正确初始化ViewBinding
   - 在onDestroyView中释放绑定引用

2. 事件处理：
   - XML中定义onClick属性
   - 使用lambda表达式处理点击事件
   - 实现自定义属性的绑定适配器

禁止事项：
- 不在XML中硬编码文本内容
- 不使用具体数值（使用dimens）
- 不使用硬编码颜色值（使用colors）
- 不过度使用RelativeLayout
- 不在列表项布局中使用复杂嵌套
- 不使用px单位
- 不在布局中写死宽高（特殊情况除外）
`

// 项目类型映射
const projectMap: Record<string, string> = {
  mvvm: mvvmPrompt,
  cbg: cbgPrompt,
  ios: iosPrompt,
  android: androidPrompt
}

const getPrompt = (projectId: string) => {
  if (!projectMap[projectId]) {
    throw new Error(`Project ID ${projectId} not found`)
  }
  return projectMap[projectId]
}

export const createUserPrompt = (projectId: string, uiInfo: any) => {
  return `
${getPrompt(projectId)}

请基于以下JSON数据生成组件：
${JSON.stringify(uiInfo)}

`.trim()
}
