# 代码生成规范

## 项目规范检测

按优先级检查：`agents.md` → `README.md` → `package.json` → 已有代码 → 配置文件

确定框架和样式方案后，遵循项目已有风格和最佳实践。

---

## 核心原则

### 数据驱动

**所有内容必须从 JSON 提取，禁止猜测。**

| 来源 | 用于 | 禁止用于 |
|------|------|---------|
| 截图 | 理解结构、布局方向 | 提取样式值 |
| JSON | 精确样式、文本、尺寸 | — |

### 响应式

严格遵循响应式设计原则，组件应适配任意父容器宽度，不假设特定屏幕尺寸。
**原则**：容器宽度自适应父级，不硬编码设计稿的固定宽度。

- 容器（有子节点）→ `width: 100%`
- 原子元素（图标、图片）→ 保留固定尺寸
- 有 `padding` 时 → 添加 `box-sizing: border-box`

> 设计稿画板宽度（如 375px）是设计工具约束，不是组件实际宽度。

---

## 数据提取
- 文本默认值从 `text.content` 提取
- `repeatCount` 表示设计稿中该结构重复出现的次数（实际渲染由数据或逻辑决定）
### 样式

从 `customStyle` 精确复制，**禁止添加不存在的属性**。

```
❌ 截图"看起来有边框" → 加 border
✅ customStyle 无 border → 不加
```

### 文本

从 `text.content` 提取。

### 多状态

设计稿有多个状态时，分别从对应节点的 `customStyle` 提取。



---

## 布局规则

| JSON 字段 | CSS |
|-----------|-----|
| `layoutMode: "HORIZONTAL"` | `display: flex` |
| `layoutMode: "VERTICAL"` | `flex-direction: column` |
| `layout.positioning: "absolute"` | 父容器加 `position: relative`，子元素用 `customStyle` 中的定位值 |

---

## 资源处理

**禁止使用占位符，必须从设计稿提取。**

### 图标（必须下载）

`type: "ICON"` 节点**必须下载实际资源文件**：

1. 从 `assets` 数组匹配 `nodeId`
2. 使用 `download-assets.cjs` 下载 SVG
3. 在代码中引用下载的文件

```bash
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"924:5696","outputPath":"src/assets/icon-close.svg","format":"svg"}
]'
```

### 图片

从 `customStyle.background` 提取 URL，直接使用。

### 例外（可用 CSS）

纯色背景、分隔线、渐变。

---

## 交互状态

### 允许推断：行为

按钮点击、表单绑定、弹窗控制等功能性代码。

### 谨慎推断：样式

hover/active/focus **默认不添加**，除非设计稿有对应状态或用户要求。

如需添加，用最小化方式：`opacity: 0.9` 或 `filter: brightness(0.95)`。

---

## 常见问题

| 问题 | 解决 |
|------|------|
| 状态切换尺寸跳动 | 基础状态用 `border: Xpx solid transparent` 预留 |
| 样式遗漏 | 检查 `customStyle` 所有属性是否复制 |
| 样式多余 | 检查是否添加了 `customStyle` 不存在的属性 |

---

## 代码质量

符合项目规范和对应技术栈的最佳实践：
- 组件逻辑清晰简洁
- 语法正确，可直接运行
- 重复结构用循环
- TypeScript 项目定义 Props 接口