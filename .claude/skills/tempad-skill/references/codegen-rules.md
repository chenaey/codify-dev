# 代码生成规范

## 首先：确定项目规范

检查 `package.json` 确定框架（Vue2/Vue3/React）和 CSS 方案（Less/Sass/Tailwind）。

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

- 容器禁止固定宽高，用 `100%` 或 `max-width`
- 固定尺寸仅限原子元素：图标、按钮、头像

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
- 重复结构用循环

### 矢量图标

节点有 `vector` 字段时：

- 有 `svgContent`：内联 SVG
- 有 `id`：可下载后使用
- 纯色块/简单形状：用 CSS 实现，不下载

### 状态切换尺寸稳定性

状态间有 `border` 差异时，基础状态用 `border: Xpx solid transparent` 预留空间。

### 其他

- `divider` → border
- `custom_component` → 导入指定组件
- 简化不必要嵌套层级

## 代码质量

- **减少重复**：重复结构用循环
- **语义化命名**：class 名称有意义
- **避免内联样式**：除非动态绑定必要
- **添加必要注释**：关键逻辑说明
- **类型定义**：TypeScript 项目必须定义 Props 接口