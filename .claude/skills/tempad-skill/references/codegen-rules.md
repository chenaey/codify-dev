# 代码生成规范

## 首先：确定项目规范

检查 `package.json` 确定框架（Vue2/Vue3/React）和 CSS 方案（Less/Sass/Tailwind）。

## 核心原则

### 样式必须从 JSON 精确提取

```javascript
// ❌ 错误：猜测颜色
background: rgba(255, 153, 0, 0.08)  // 自己编的

// ✅ 正确：直接复制 customStyle
customStyle: {
  "background": "rgba(255, 58, 54, 0.05)",  // ← 用这个
  "border": "0.50px solid #F7C9C9"          // ← 不要遗漏
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

### 样式提取

1. **直接复制 `customStyle`**：不要修改、不要猜测
2. 保留 `rem()`、`px()` 等函数
3. 用 `layout.margin` 计算间距

### 数据驱动

- 文本默认值从 `text.content` 提取
- 重复结构用循环

### 矢量图标

节点有 `vector` 字段时：

- 有 `svgContent`：内联 SVG
- 有 `id`：可下载后使用
- 纯色块/简单形状：用 CSS 实现，不下载

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