# 代码生成规范

## 项目规范检测（必须执行）

生成代码前，**检测项目已有代码**，遵循相同模式。
按优先级检查：`agents.md` → `README.md` → `package.json` → 已有代码 → 配置文件

检测项：技术框架、样式方案、路径别名、资源引用方式、命名规范

确定框架和样式方案后，遵循项目已有风格和最佳实践。

```
错误做法：假设资源引用方式（如直接用 import）
正确做法：检测项目已有组件如何引用资源，遵循相同模式
```

---

## 核心原则


**样式必须从 `customStyle` 提取，禁止估算或简化。**

**跨框架说明**：`customStyle` 为 CSS 格式。Web 项目直接使用；非 Web 项目（Flutter、React Native 等）根据目标框架转换为对应样式写法。
```
❌ 看截图"大概 12px" → padding: 12px
✅ customStyle 有 "padding": "0 rem(24)" → padding: 0 rem(24)

❌ 截图"看起来有圆角" → border-radius: 8px
✅ customStyle 有 "border-radius": "rem(16)" → border-radius: rem(16)
```

### 语法修正

`customStyle` 值可能包含无效 CSS 语法，**保留语义、修正语法**：

| 场景 | 原值 | 修正 |
|------|------|------|
| background 中的 fallback 颜色位置错误 | `url(...) lightgray 0px 0px / ...` | 移除 `lightgray` 或移至 background-color |
| 无效的简写组合 | 根据实际情况 | 拆分为多个有效属性 |

```
❌ 盲目复制无效语法 → 代码报错
❌ 随意修改值 → 丢失设计意图
✅ 保留所有有效值，仅修正语法结构
```

### 数据驱动

**所有内容必须从 JSON 提取，禁止猜测。**

| 来源 | 用于 | 禁止用于 |
|------|------|---------|
| 截图 | 理解结构、布局方向 | 提取样式值 |
| JSON | 精确样式、文本、尺寸 | — |

### Props 设计原则

**区分「业务数据」和「UI 文案」，避免过度设计：**

| 类型 | 判断标准 | 处理方式 |
|------|---------|---------|
| 业务数据 | 实际使用时从接口获取 | Props（required，无默认值） |
| UI 固定文案 | 实际使用时不会变化 | 直接硬编码 |

```
示例：商品卡片
- 商品名、价格、图片 → Props
- "立即购买"、"已售罄" → 硬编码
```

### 响应式

严格遵循响应式设计原则，组件应适配任意父容器宽度，不假设特定屏幕尺寸。
**原则**：容器宽度自适应父级，不硬编码设计稿的固定宽度。

- 容器（有子节点）→ `width: 100%`
- 原子元素（图标、图片）→ 保留固定尺寸
- 有 `padding` 时 → 添加 `box-sizing: border-box`

> 设计稿画板宽度（如 375px）是设计工具约束，不是组件实际宽度。

---

## 数据提取

### 样式

从 `customStyle` 精确提取，**禁止添加不存在的属性**。

| 检查项 | 说明 |
|-------|------|
| 属性遗漏 | `customStyle` 中的每个合理属性都必须出现在代码中 |
| 属性多余 | 禁止添加 `customStyle` 中不存在的属性 |

```
❌ 截图"看起来有边框" → 加 border
✅ customStyle 无 border → 不加
```

### 文本

- 文本默认值从 `text.content` 提取

### 重复结构

`repeatCount > 1` 或骨架中的 `×N` 表示重复节点：

- 设计为数组 Props，用循环渲染
- 在调用层提供 mock 数据用于预览（值来自设计稿）

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

**禁止使用占位符，必须下载实际资源。**

### 资源来源（按优先级）

| 优先级 | 来源 | 说明 |
|-------|------|------|
| 1 | **assets 数组** | **权威来源，必须全部遍历下载** |
| 2 | customStyle 中的 `url()` | 图片背景 |
| 3 | RECTANGLE + object-fit: cover | 隐式图片占位符（无 url 时） |

### 资源识别

| 类型 | 识别方式 | 格式 |
|-----|---------|-----|
| 图标 | `type: "ICON"` | SVG |
| 图片背景 | `customStyle` 含 `url(<path-to-image>)` | PNG |
| 图片占位符 | `RECTANGLE` + `object-fit: cover`（无 url） | PNG |

> **隐式图片**：`RECTANGLE` 类型 + `object-fit: cover` 但无 `url()` 的节点，是图片占位符，用节点 ID 下载 PNG。

### 下载命令

```bash
node skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"src/assets/icon.svg","format":"svg"},
  {"nodeId":"789:012","outputPath":"src/assets/bg.png","format":"png"}
]'
```

### 例外（可用 CSS）

纯色背景、分隔线、渐变（无 `url(<path-to-image>)` 标记）。

---

## 交互状态

### 允许推断：行为

按钮点击、表单绑定、弹窗控制等功能性代码。

### 谨慎推断：样式

hover/active/focus **默认不添加**，除非设计稿有对应状态或用户要求。

如需添加，用最小化方式：`opacity: 0.9` 或 `filter: brightness(0.95)`。

---

## 语义化
- 组件名称：符合项目已有命名规范
- 样式类名、下载的资源需要语义化

## 常见问题

| 问题 | 解决 |
|------|------|
| 样式与设计稿不一致 | 从 `customStyle` 精确提取，禁止估算 |
| 图片/图标显示空白 | 用节点 ID 下载资源 |
| 状态切换尺寸跳动 | 基础状态用 `border: Xpx solid transparent` 预留 |
| 样式遗漏 | 检查 `customStyle` 所有合理属性是否提取实现 |
| 样式多余 | 检查是否添加了 `customStyle` 不存在的属性 |

---

## 生成前自检（强制）

生成代码前，确认：

1. **文本**：每个 `text.content` 都已复制到代码中
2. **样式**：每个 `customStyle` 合理属性都已提取，无遗漏无多余
3. **资源**：
   - assets 数组已全部遍历下载
   - RECTANGLE + object-fit: cover 隐式图片已标记下载

**禁止**：代码中出现 JSON 里没有的文本或样式值。

---

## 代码质量（必须遵守）

- 符合项目规范和对应技术栈的最佳实践
- 复杂设计拆分为多个组件文件，职责单一
- 组件设计合理的 Props/接口，数据驱动渲染
- 语法正确，可直接运行

