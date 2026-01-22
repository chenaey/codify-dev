# 代码生成规范

基于设计 JSON 数据生成前端组件代码的通用规范。

## 首先：查阅项目规范

生成代码前，检查项目中的以下文件以确定技术栈和规范：

```bash
# 查找项目规范文件
find . -name "*.md" -path "*/docs/*" | head -20
find . -name ".eslintrc*" -o -name "stylelint*" | head -10
cat package.json | grep -A 20 '"dependencies"'
```

根据项目确定：

- **框架**：Vue2/Vue3/React/其他
- **CSS 方案**：CSS Modules/Tailwind/Styled Components/Less/Sass
- **组件规范**：项目已有的组件写法

## 通用规范

### 响应式设计

**容器组件禁止设置固定尺寸**：

- 禁止：`width: 200px`、`height: 100px`、`min-width: 300px`
- 允许：`width: 100%`、`max-width: 600px`

**固定尺寸仅限原子元素**：按钮、图标、头像等

### 布局处理

严格遵循 JSON 中的 `layoutMode`：

| layoutMode   | 含义                                            |
| ------------ | ----------------------------------------------- |
| `HORIZONTAL` | `display: flex`（水平）                         |
| `VERTICAL`   | `display: flex; flex-direction: column`（垂直） |

**必须递归处理所有嵌套层级**

### 层级优化

简化不必要的嵌套：

```html
<!-- 错误 -->
<div>
  <div><div>内容</div></div>
</div>

<!-- 正确 -->
<div>内容</div>
```

合并条件：

- 相同布局方向的连续容器
- 无样式/间距影响的中间层

### 数据驱动视图

**文本内容数据化**：

```html
<!-- 错误 -->
<div>标题</div>

<!-- 正确 -->
<div>{{ title }}</div>
```

**循环复用**：

- 相似度 > 60% 的重复结构使用循环
- 禁止 `data[0]`、`v-if index === 1` 等硬编码

### 样式处理

1. **优先使用 `customStyle`**：已格式化的 CSS，直接应用
2. **保留单位函数**：`rem()`、`px()` 等不转换
3. **过滤默认值**：省略 `font-size: normal` 等
4. **间距计算**：使用 `layout.margin` 计算元素间距

### 矢量图标处理

当节点包含 `vector` 字段时：

1. **有 `assetPath`**：使用资源引用
2. **有 `svgContent`**：使用内联 SVG

### 分割线处理

`divider` 字段转换为父/兄弟元素的 border。

### 自定义组件

`custom_component` 字段：导入并使用指定组件，传递 props。

## 代码质量

- **减少重复**：重复结构用循环
- **语义化命名**：class 名称有意义
- **避免内联样式**：除非动态绑定必要
- **添加必要注释**：关键逻辑说明
