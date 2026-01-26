# 设计数据结构

## 响应结构

`get_design` 支持两种模式：

### mode: 'skeleton'（轻量，推荐先用）

返回**缩进式文本树**，快速理解结构，**跳过 CSS 提取**：

```typescript
interface GetDesignResult {
  rootNodeId: string   // 根节点 ID
  structure: string    // 缩进式文本树
  assets: AssetInfo[]  // 可导出资源列表
}
```

**structure 示例：**

```
FRAME 13:3808
├─ FRAME: ICON + TEXT "标题"
├─ FRAME [H] 13:4382
│  ├─ FRAME ×3: TEXT "卡片内容"
│  └─ ICON
└─ GROUP 17:6940
   └─ FRAME: TEXT "底部"

[Assets] 13:3812, 17:6941
```

**文本格式说明：**

| 标记 | 含义 | 处理方式 |
|-----|------|---------|
| `[H]` / `[V]` | 水平/垂直布局 | flex-direction |
| `×N` | 重复 N 次 | 只实现一次，循环渲染 |
| `ID` | 关键节点 ID | 用于单独获取 full 数据 |
| `:` | 后接简单子节点 | 合并显示 |
| `+` | 并列节点 | 同级元素 |
| `"..."` | TEXT 内容 | 截断 30 字符 |

**ID 显示规则**（用于后续 `node_id` 参数）：
- 根节点
- 有布局方向的容器（`[H]`/`[V]`）
- 重复模板（`×N`）
- GROUP 类型

**skeleton 优化**：
- 装饰节点（RECTANGLE/ELLIPSE/LINE/VECTOR）被过滤
- 纯矢量容器折叠为 `ICON`
- 单子 GROUP 自动提升子节点
- 简单子节点合并到一行

### mode: 'full'（默认，完整）

返回完整设计数据（含 CSS 样式）：

```typescript
interface GetDesignResult {
  rootNodeId: string   // 根节点 ID
  design: UINode       // 完整设计树
  assets: AssetInfo[]  // 可导出资源列表
}
```

---

## 节点类型

| 类型                    | 说明     |
| ----------------------- | -------- |
| `FRAME`                 | 容器     |
| `INSTANCE`              | 组件实例 |
| `COMPONENT`             | 组件定义 |
| `TEXT`                  | 文本     |
| `RECTANGLE` / `ELLIPSE` | 形状     |
| `GROUP`                 | 分组     |
| `ICON`                  | 图标（SVG 资源） |

> **注意**：`ICON` 是插件生成的语义类型，表示该节点是可导出的图标资源。
> 原始 Figma 类型可能是 VECTOR、INSTANCE、FRAME 等，但如果满足图标条件会被标记为 `ICON`。

## 核心字段

```typescript
interface UINode {
  id: string      // 节点 ID（用于下载资源）
  name: string    // 节点名称
  type: string    // 节点类型，图标为 'ICON'
  
  // 重复节点
  repeatCount?: number      // 总重复次数（含自身）
  repeatNodeIds?: string[]  // 被跳过的节点 ID

  layout: {
    positioning?: 'absolute'  // 绝对定位标记
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
    width?: number | '100%'
    height?: number
    padding?: { top; right; bottom; left }
  }

  // 已格式化 CSS，直接使用
  customStyle?: Record<string, string>

  // 文本节点
  text?: {
    content: string
    fontSize: number
    fontWeight: string
  }

  children?: UINode[]
}
```

## customStyle 说明

已格式化的 CSS 属性，**直接复制到代码中，不修改值**：

```json
{
  "display": "flex",
  "padding": "0 rem(24)",
  "border-radius": "rem(16)",
  "background": "#F7F7F7"
}
```

## 图标节点（ICON）

图标节点通过 `type: "ICON"` 标识：

```json
{
  "type": "ICON",
  "id": "123:456",
  "name": "icon-arrow",
  "layout": {
    "width": 14,
    "height": 14,
    "layoutMode": "NONE"
  }
}
```

### 图标处理规则

| 属性 | 说明 |
|------|------|
| `id` | 用于下载资源的节点 ID |
| `layout.width/height` | 图标尺寸 |
| `customStyle` | 图标容器样式（通常无需关注） |

### 下载图标

```bash
node skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"./icons/arrow.svg","format":"svg"}
]'
```

## layoutMode 映射

```
HORIZONTAL → display: flex
VERTICAL   → display: flex; flex-direction: column
NONE       → 无自动布局
```

## 重复节点

相同结构的兄弟节点只保留第一个（样本），其余被跳过。

| 字段 | 说明 |
|------|------|
| `repeatCount` | 设计稿中该结构的重复次数 |
| `repeatNodeIds` | 被跳过的节点 ID（调试用） |

只实现一次，循环渲染。

---

## 资源列表

`assets` 数组包含所有可导出资源（含 ICON 节点）：

```typescript
interface AssetInfo {
  nodeId: string    // 用于 get_assets
  name: string      // 文件名
  type: 'ICON' | 'IMAGE' | 'VECTOR'
  width?: number    // 仅 ICON 类型
  height?: number   // 仅 ICON 类型
}
```

> ICON 节点同时存在于 `design` 树（保留位置关系）和 `assets` 数组（便于批量处理）。