# API 参考

Server: `http://127.0.0.1:13580`

## GET /

检查连接状态。

```json
{ "ready": true, "platform": "figma", "count": 1 }
```

## POST /get_screenshot

获取选中节点截图（2x PNG）。

```json
{
  "screenshot": {
    "data": "data:image/png;base64,...",
    "width": 800,
    "height": 600
  }
}
```

## POST /get_design

获取设计数据，支持两种模式。

### 请求参数

```typescript
{
  node_id?: string       // 节点 ID，不传则使用当前选中
  mode?: 'full' | 'skeleton'  // 默认 'full'
}
```

### mode: 'skeleton'（推荐先用）

返回**缩进式文本树**，快速理解结构，**跳过 CSS 提取**：

```json
{
  "rootNodeId": "13:3808",
  "structure": "FRAME 13:3808\n├─ FRAME: ICON + TEXT \"标题\"\n...",
  "assets": [...]
}
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

### mode: 'full'（默认）

返回完整设计数据（含 CSS 样式）：

```json
{
  "rootNodeId": "0:1234",
  "design": [{ /* UINode 树 */ }],
  "assets": [
    { "nodeId": "123:456", "name": "icon-arrow", "type": "ICON", "width": 14, "height": 14 },
    { "nodeId": "789:012", "name": "image", "type": "IMAGE" }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `rootNodeId` | 根节点 ID，用于下载截图 |
| `design` | 节点树数组 |
| `assets` | 可导出资源列表（含所有 ICON 节点） |

## POST /get_assets

导出资源文件。

**请求：**

```json
{
  "nodes": [
    { "nodeId": "123:456", "format": "svg" },
    { "nodeId": "789:012", "format": "png" }
  ]
}
```

**响应（全部成功）：**

```json
{
  "assets": [
    { "nodeId": "123:456", "name": "icon", "format": "svg", "width": 24, "height": 24, "data": "<svg>..." },
    { "nodeId": "789:012", "name": "image", "format": "png", "width": 100, "height": 100, "data": "data:image/png;base64,..." }
  ],
  "summary": { "total": 2, "success": 2, "failed": 0 }
}
```

**响应（部分失败）：**

```json
{
  "assets": [
    { "nodeId": "123:456", "name": "icon", "format": "svg", "width": 24, "height": 24, "data": "<svg>..." },
    { "nodeId": "789:012", "name": "", "format": "png", "width": 0, "height": 0, "data": "", "error": { "code": "NODE_NOT_FOUND", "message": "Node \"789:012\" not found" } }
  ],
  "summary": { "total": 2, "success": 1, "failed": 1 }
}
```

| 字段 | 说明 |
|------|------|
| `assets[].error` | 可选，单个资源导出失败时的错误信息 |
| `summary` | 汇总：总数、成功数、失败数 |

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