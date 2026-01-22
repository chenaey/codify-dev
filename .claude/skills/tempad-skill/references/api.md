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

获取选中节点的设计数据。

```json
{
  "rootNodeId": "0:1234",
  "design": [
    { /* UINode 树 */ }
  ],
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

**响应：**

```json
{
  "assets": [{ "nodeId": "123:456", "name": "icon", "format": "svg", "data": "<svg>..." }]
}
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
