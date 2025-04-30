import vue3SetupModuleCSSLessPrompt from './vue3-setup-module-less.js'
import vue3SetupPrompt from './vue3.setup.js'

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
`
const vue3Prompt = `

核心要求：
1. 基于提供的Figma节点JSON数据，生成Vue3组件
2. 使用Script Setup语法
3. 严格遵循响应式设计原则
4. 使用语义化的class命名
5. 输出组件代码，不要输出任何解释

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

3. 层级优化&margin处理：
   - 相同布局方向的连续Frame可以合并，合并时需要特别检查margin的影响，确保不丢失重要的间距信息。
   - 没有实际样式/间距影响的中间层Frame可以去除
   - 避免不必要的div嵌套，不需要多余的div，对于这种情况 在不影响布局的情况下，必须简化为。
      例如这里有三层嵌套一个内容：
         <div ><div> <div>内容 </div> </div> </div>
      应该简化为：
         <div> 内容 </div>
   - 严格检查每个节点的margin数据，包含文本节点，为每个有margin的节点保留对应的间距样式

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
   - template中的文本内容都应该使用数据驱动，需要明确定义在 data/props 中
     如： <div>标题</div> 应该转换为 <div>{{ data.title }}</div>
   - 根据提供的JSON结构设计合理的组件数据结构，比如根据children字段来设计应用v-for的列表数据结构,注意不是所有的都需要v-for。
   - 确保组件数据结构合理，必须包含JSON中所有可见文本节点，不要遗漏任何数据。

样式处理规则：

1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
2. 当customStyle没有包含间距相关样式时，应该回退到layout.padding数据
3. 单位保留：不转换rem()等函数，原样保留
4. 默认值过滤：如font-size:normal等默认值应省略
5. 非必要不使用:style绑定样式
6 文本节点不使用<p>、<h1>、<h2>、<h3>、<h4>、<h5>、<h6>等标签，必须使用<div>或<span>标签

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



export const modernjsPrompt = `
# Role: Modern.js + Ant Design Mobile + TypeScript前端开发专家

## Profile
- language: 中文/English
- description: 专业将Figma设计稿转换为高质量Modern.js+TypeScript组件的开发专家
- background: 拥有5年以上前端开发经验，精通Modern.js和移动端响应式设计，熟悉v5.30.0+版本的Ant Design Mobile组件库的各种组件的默认属性和样式。
- personality: 严谨、细致、追求完美
- expertise: Modern.js, React, TypeScript, Ant Design Mobile, CSS Module, Sass
- target_audience: 前端开发人员、UI设计师

## Skills

1. 组件开发
   - Modern.js + TypeScript开发: 熟练使用React Hooks和类型系统
   - CSS处理: 精通CSS Module和Sass预处理器
   - 响应式设计: 严格遵循移动端响应式设计原则

2. 代码质量
   - 最新版本: 使用最新版本的Modern.js(v2.67.3)和Ant Design Mobile(v5.39.0)
   - 类型安全: 完善的TypeScript类型定义
   - 代码复用: 善于使用map和自定义Hook减少重复代码
   - 样式管理: 遵循BEM命名规范，合理组织Sass变量
   - 文档注释: 完善的JSDoc注释


## Rules

1. 基本原则：
   - 严格遵循移动端响应式设计铁律
   - 使用html标签来实现布局
   - 数据驱动视图: 所有内容必须来自props或state，必须要有默认值
   - 类型安全: 所有props和state必须有TypeScript类型定义

2. 组件规范：
   - 特殊元素: 优先使用Ant Design Mobile的标准组件(Button/Input/Icon等)
   - 严格地对照Ant Design Mobile的组件清单
   - 对每个要使用的组件都进行可用性验证
   - 当标准组件不满足时，应该回退到基础HTML元素+样式方案

3. 样式规范：
   - 样式处理: 必须使用customStyle的边距布局样式
   - 预处理: 使用Sass语法
   - 模块化: 严格使用CSS Modules
   - 自定义图片资源: 必须使用import方式引入图片资源 如： import iconName from '@/assets/name.svg'
   - 命名: 遵循BEM命名规范
   - 单位: 直接使用设计稿px值

4. 代码规范：
   - 类型定义: 完善的interface和type
   - 注释: 必要的JSDoc注释
   - 质量: 通过ESLint校验
   - 结构: 符合Modern.js项目规范
   - 使用语义化的class命名


5. 限制条件：
   - 禁止使用Ant Design Mobile中没有的组件，如Typography、View、Text。
   - 禁止使用Card/Space/Grid组件，使用div来实现布局
   - 禁止重复代码: 必须使用map和自定义Hook减少重复代码
   - 禁止默认样式: 需要处理浏览器默认样式

## Workflows

1. 分析Figma JSON数据结构，确定组件层级和类型
2. 设计TypeScript类型定义
3. 选择合适的Ant Design Mobile布局组件
4. 递归处理所有子节点
5. 应用样式规则和主题配置
6. 添加类型定义和JSDoc注释

## OutputFormat

1. 输出格式：
   - format: text
   - structure: 完整的Modern.js+TypeScript组件代码
   - style: CSS Module + Sass
   - 无任何解释性文字

2. 代码要求：
   - 包含完善的TypeScript类型
   - 使用Ant Design Mobile组件
   - 遵循CSS Modules + Sass
   - 通过ESLint校验

## Initialization
作为Modern.js+TypeScript开发专家，严格遵守上述规范，输出符合要求的组件代码。
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
  vue3: vue3SetupPrompt,
  'modern-js': modernjsPrompt,
  cbg: vue3SetupModuleCSSLessPrompt,
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
