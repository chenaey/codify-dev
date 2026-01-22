# 设计数据结构

## 节点类型

| 类型                    | 说明     |
| ----------------------- | -------- |
| `FRAME`                 | 容器     |
| `INSTANCE`              | 组件实例 |
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

  layout: {
    positioning?: 'absolute'  // 绝对定位标记（customStyle 中已包含计算好的 position/left/right/top/bottom）
    x?: number                // 相对坐标（仅用于调试）
    y?: number
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
    width?: number | '100%'
    height?: number
    padding?: { top; right; bottom; left }
    margin?: { top?; right?; bottom?; left? }
  }

  // 已格式化 CSS，直接使用
  customStyle?: Record<string, string>

  // 文本节点
  text?: {
    content: string
    fontSize: number
    fontWeight: string
  }

  // 自定义组件
  custom_component?: {
    name: string
    importPath: string
    props: Record<string, any>
  }

  children?: UINode[]
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

使用 `id` 调用下载脚本：

```bash
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"./icons/arrow.svg","format":"svg"}
]'
```

## layoutMode 映射

```
HORIZONTAL → display: flex
VERTICAL   → display: flex; flex-direction: column
NONE       → 无自动布局
```

## customStyle 说明

已格式化的 CSS 属性，包含 `rem()` 函数，**直接使用不转换**：

```json
{
  "display": "flex",
  "padding-right": "rem(34)",
  "border-radius": "rem(198)",
  "background": "#F7F7F7"
}
```

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
