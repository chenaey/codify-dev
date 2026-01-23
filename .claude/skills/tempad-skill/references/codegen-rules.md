# 代码生成规范

## 首先：确定项目规范

按优先级检查以下来源： 确定框架（Vue2/Vue3/React等）和 样式 方案（Less/Sass/Tailwind等）。



| 优先级 | 来源 | 示例 |
|-------|------|------|
| 1 | `agents.md` / 项目规范文档 | 技术栈声明、编码约定 |
| 2 | `README.md` | 技术栈说明 |
| 3 | `package.json` | 依赖项判断 |
| 4 | 已有代码结构 | 文件后缀、import 语句、API 风格 |
| 5 | 配置文件 | `vite.config.*`、`tailwind.config.*` |

**确定后**：生成代码必须符合该技术栈的最佳实践和项目已有代码风格。

## 核心原则

### 截图 vs JSON 的职责分工

| 信息来源 | 职责 | 示例 |
|---------|------|------|
| **截图** | 理解整体结构、布局方向、组件层级 | 这是一个弹窗、列表是纵向排列 |
| **JSON** | 提取精确的样式值、文本内容、尺寸 | `background: #F2F2F2`、`padding: 10px 12px` |

> ⚠️ **绝对禁止**：根据截图"看起来像"就自行添加样式属性

### 样式必须从 JSON 精确提取

```javascript
// ❌ 错误：看截图觉得有边框就加
.option-tag {
  border: 1px solid #e5e5e5;  // JSON 中没有这个属性！
}

// ✅ 正确：JSON 中 customStyle 没有 border，就不加
// JSON 数据：
{
  "customStyle": {
    "background": "#F2F2F2",
    "border-radius": "4px",
    "padding": "10px 12px"
  }
  // 注意：没有 border 属性
}

// 生成的 CSS：
.option-tag {
  background: #F2F2F2;
  border-radius: 4px;
  padding: 10px 12px;
  // 不加 border，因为 JSON 中没有
}
```

### 不同状态的样式区分

设计稿中可能有多个状态（默认、选中、悬停等），需要从 JSON 中找到对应的节点：

```javascript
// 默认状态节点的 customStyle
{
  "background": "#F2F2F2"
  // 无 border
}

// 选中状态节点的 customStyle
{
  "border": "1px solid rgba(255, 58, 54, 0.2)",
  "background": "rgba(255, 58, 54, 0.05)"
}

// ✅ 正确生成：
.option-tag {
  background: #F2F2F2;
}
.option-tag.active {
  border: 1px solid rgba(255, 58, 54, 0.2);
  background: rgba(255, 58, 54, 0.05);
}
```

### 文本内容从 `text.content` 读取

```javascript
// JSON 数据
{
  "type": "TEXT",
  "text": { "content": "本回答由AI生成，内容仅供参考" }
}

// ✅ 正确：用作默认值
props: {
  warningText: { default: '本回答由AI生成，内容仅供参考' }
}
```

### 图标识别依据 JSON 位置

`assets` 列表仅提供可导出资源，**不表示使用位置**。根据 JSON 树中 `vector` 节点的位置判断用途：

```javascript
// 头部第一个 INSTANCE → 加载动画 icon
// 底部操作栏的 COMPONENT → 操作按钮 icon
```

## 通用规范

### 响应式

严格遵循响应式设计原则，组件应适配任意父容器宽度，不假设特定屏幕尺寸。

**原则**：容器宽度自适应父级，不硬编码设计稿的固定宽度。

- 容器（有子节点）→ `width: 100%`
- 原子元素（图标、图片）→ 保留固定尺寸
- 有 `padding` 时 → 添加 `box-sizing: border-box`

> 设计稿的画板宽度（375px）是设计工具约束，不是组件实际宽度。

### 布局

严格遵循 `layoutMode`：

- `HORIZONTAL` → `display: flex`
- `VERTICAL` → `display: flex; flex-direction: column`

### 样式提取检查清单

生成每个元素的样式时，按此清单检查：

1. ✅ 该属性是否存在于 `customStyle` 中？
2. ✅ 属性值是否完全复制（包括单位、函数）？
3. ✅ 是否遗漏了 `customStyle` 中的属性？
4. ❌ 是否添加了 `customStyle` 中不存在的属性？

### 数据驱动

- 文本默认值从 `text.content` 提取
- `repeatCount` 表示设计稿中该结构重复出现的次数（实际渲染由数据或逻辑决定）

### 图标资源（重要）

**核心原则**：图标必须从设计稿导出，禁止自行实现。

#### assets 数组

API 返回的 `assets` 数组包含所有可导出的图标资源：

```json
{
  "assets": [
    {"nodeId": "924:5696", "name": "icon-ip.svg", "type": "VECTOR"},
    {"nodeId": "924:5699", "name": "icon-close.svg", "type": "VECTOR"}
  ]
}
```

#### 处理流程

1. **识别图标节点** - 在 JSON 树中找到 `type: "ICON"` 的节点
2. **匹配 assets** - 通过 `id` 字段匹配 assets 中的 `nodeId`
3. **下载资源** - 使用 download-assets 脚本导出 SVG/PNG
4. **代码中引用** - 使用符合项目规范的方式引用

#### 例外情况

以下情况可用 CSS 实现，无需下载：

- 纯色矩形/圆形背景装饰
- 简单的分隔线
- 设计稿明确标注为「可用 CSS 实现」的元素

### 状态切换尺寸稳定性

状态间有 `border` 差异时，基础状态用 `border: Xpx solid transparent` 预留空间。

### 绝对定位节点

`layout.positioning === 'absolute'` 时：
- **父容器需要 `position: relative`**
- `customStyle` 中已包含计算好的定位样式，直接使用：
  - `position: absolute`
  - `left/right/top/bottom` 等

```json
// 示例：右上角关闭按钮
{
  "layout": {
    "positioning": "absolute",
    "width": 16,
    "height": 16
  },
  "customStyle": {
    "position": "absolute",
    "right": "3px",
    "top": "3px"
  }
}
```

> 无需手动计算定位值，插件已根据 Figma/MasterGo 的 constraints 自动生成。

### 其他

- `divider` → border
- `custom_component` → 导入指定组件
- 简化不必要嵌套层级

## 交互状态规则

设计稿通常只展示静态状态。对于交互相关内容，遵循以下规则：

### 允许推断：行为逻辑

事件处理、状态管理等**功能性代码**可以根据语义合理推断：

| 元素类型 | 允许推断的行为 |
|---------|---------------|
| 按钮 | `@click` 处理函数、加载状态、禁用状态 |
| 表单输入 | `v-model` 绑定、验证逻辑 |
| 可选标签 | 选中/取消切换逻辑 |
| 弹窗/抽屉 | 打开/关闭控制 |
| 列表项 | 点击选中、删除确认 |

### 谨慎推断：交互样式

视觉交互效果（hover/active/focus）**默认不添加**，除非：

1. **设计稿中有对应状态节点** → 直接从 JSON 提取
2. **用户明确要求** → 按用户指定风格添加

#### 如果需要添加交互样式

当确实需要添加时（如按钮没有 hover 会显得呆板），遵循**最小化原则**：

| 效果类型 | 推荐做法 | 避免 |
|---------|---------|------|
| hover | `opacity: 0.9` 或同色系微调亮度 | 换完全不同的颜色 |
| active | `opacity: 0.8` 或 `transform: scale(0.98)` | 大幅度视觉变化 |
| focus | 表单元素添加 `outline` (无障碍需求) | 去除默认 focus 样式 |
| transition | `transition: all 0.2s ease` | 复杂动画 |
| cursor | 可点击元素始终添加 `cursor: pointer` | - |

#### 颜色微调算法（可选）

如果使用同色系微调，基于设计稿原色：

```
hover:  亮度 -5%（深色）或 +5%（浅色背景）
active: 亮度 -10%（深色）或 +10%（浅色背景）
```

示例：按钮 `#FF3A36`
- hover: 可用 `filter: brightness(0.95)` 或不添加
- active: 可用 `filter: brightness(0.9)` 或 `opacity: 0.8`

### 必须添加

以下交互样式**始终添加**，不视为"推断"：

- `cursor: pointer` - 所有可点击元素
- `user-select: none` - 按钮、标签等非文本内容
- `outline: none` 配合自定义 focus 样式 - 表单元素（保证无障碍）

### 示例对比

```css
/* ❌ 过度推断：添加了设计稿没有的复杂效果 */
.btn:hover {
  background: #e63430;  /* 凭空猜测的颜色 */
  box-shadow: 0 4px 12px rgba(255, 58, 54, 0.3);  /* 设计稿没有阴影 */
  transform: translateY(-2px);  /* 不必要的动效 */
}

/* ✅ 最小化推断：保守、不破坏设计意图 */
.btn {
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.btn:hover {
  opacity: 0.9;
}
.btn:active {
  opacity: 0.8;
}
```

## 代码质量

- **减少重复**：重复结构用循环
- **语义化命名**：class 名称有意义
- **避免内联样式**：除非动态绑定必要
- **添加必要注释**：关键逻辑说明
- **类型定义**：TypeScript 项目必须定义 Props 接口
