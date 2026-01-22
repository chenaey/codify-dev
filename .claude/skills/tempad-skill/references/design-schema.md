# 设计数据结构

## 节点类型

| 类型                    | 说明     |
| ----------------------- | -------- |
| `FRAME`                 | 容器     |
| `INSTANCE`              | 组件实例 |
| `TEXT`                  | 文本     |
| `RECTANGLE` / `ELLIPSE` | 形状     |
| `GROUP`                 | 分组     |
| `VECTOR`                | 矢量     |

## 核心字段

```typescript
interface UINode {
  id?: string     // 节点 ID（根节点必有，用于下载截图；子节点无此字段）
  name?: string   // 节点名称（已移除以减少 JSON 体积）
  type: string

  layout: {
    layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
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

  // 矢量图标
  vector?: {
    id: string        // 节点 ID，用于下载资源
    assetPath: string // 资源路径
    svgContent?: string // 内联 SVG
    width: number
    height: number
  }

  // 自定义组件
  custom_component?: {
    name: string
    importPath: string
    props: Record<string, any>
  }

  // 分割线
  divider?: {
    orientation: 'horizontal' | 'vertical'
    style: { color; thickness; lineStyle? }
  }

  children?: UINode[]
}
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

`get_design` 返回的 `assets` 数组：

```typescript
interface AssetInfo {
  nodeId: string // 用于 get_assets
  name: string // 文件名
  type: 'VECTOR' | 'IMAGE'
}
```