# API 参考

Server: `http://127.0.0.1:13580`

## GET /

检查连接状态。

```json
{ "ready": true, "platform": "figma", "count": 1 }
```

## POST /get_design

获取设计数据，支持两种模式。

### 请求参数

```typescript
{
  node_id?: string             // 节点 ID，不传则使用当前选中
  window_id: string            // 窗口 ID，用于路由到指定窗口
  mode?: 'full' | 'skeleton'  // 默认 'full'
}
```

### mode: 'skeleton'（推荐先用）

返回缩进式文本树，快速理解结构。标记含义和详细格式见 [design-schema.md](design-schema.md)。

### mode: 'full'（默认）

返回完整设计数据（含 CSS 样式）：

```json
{
  "rootNodeId": "0:1234",
  "design": [
    {
      /* UINode 树 */
    }
  ],
  "assets": [
    { "nodeId": "123:456", "name": "icon-arrow", "type": "ICON", "width": 14, "height": 14 },
    { "nodeId": "789:012", "name": "image", "type": "IMAGE" }
  ]
}
```

| 字段         | 说明                               |
| ------------ | ---------------------------------- |
| `rootNodeId` | 根节点 ID，用于下载截图            |
| `design`     | 节点树数组                         |
| `assets`     | 可导出资源列表（含所有 ICON 节点） |

## 下载资源

使用脚本下载图标和图片资源：

```bash
node $SKILL_DIR/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/path/to/icon.svg","format":"svg"},
  {"nodeId":"789:012","outputPath":"/path/to/bg.png","format":"png"}
]'
```

### 参数

| 字段         | 类型               | 必需 | 说明               |
| ------------ | ------------------ | ---- | ------------------ |
| `nodeId`     | string             | ✓    | 节点 ID            |
| `outputPath` | string             | ✓    | 输出文件完整路径   |
| `format`     | `'svg'` \| `'png'` |      | 默认 `'png'`       |
| `scale`      | number             |      | 缩放比例，默认 `1` |

### 输出

```
Downloaded 2 assets (2 success, 0 failed):
  ✓ /path/to/icon.svg (24x24)
  ✓ /path/to/bg.png (100x100)
```

## 下载截图

使用脚本下载节点截图：

```bash
node $SKILL_DIR/scripts/download-screenshot.cjs --nodeId "317:03206" --windowId "abc4xk" --output "/path/to/screenshot.png"
```

### 参数

| 参数         | 必需 | 说明                        |
| ------------ | ---- | --------------------------- |
| `--nodeId`   |      | 节点 ID，不传则使用当前选中 |
| `--windowId` | ✓    | 窗口 ID                     |
| `--output`   | ✓    | 输出文件完整路径            |

### 输出

```
✓ /path/to/screenshot.png (800x600)
```

## 错误格式

```json
{ "error": { "code": "NO_SELECTION", "message": "..." } }
```

| 错误码           | 含义       |
| ---------------- | ---------- |
| `NOT_CONNECTED`  | 无扩展连接 |
| `NO_SELECTION`   | 未选择节点 |
| `NODE_NOT_FOUND` | 节点不存在 |
| `TIMEOUT`        | 超时       |
