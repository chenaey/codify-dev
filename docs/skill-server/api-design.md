# Skill Server API 设计

## 概述

Skill Server 是一个轻量级的 HTTP/WebSocket 中转服务，为外部 Agent 提供访问 Figma/MasterGo 设计数据的能力。

### 架构

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Agent / Client                                                 │
│       │                                                          │
│       │  HTTP Request                                            │
│       ▼                                                          │
│   ┌─────────────────────┐                                        │
│   │  Skill Server       │  ← 纯转发，无状态                       │
│   └─────────┬───────────┘                                        │
│             │                                                    │
│             │  WebSocket                                         │
│             ▼                                                    │
│   ┌─────────────────────┐                                        │
│   │  Browser Extension  │  ← 实际执行，访问 Figma Plugin API      │
│   └─────────────────────┘                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 服务状态 |
| POST | `/get_design` | 获取设计数据 |
| POST | `/get_screenshot` | 获取节点截图 |
| POST | `/get_assets` | 批量导出资源 |

---

## 接口详情

### 1. `GET /` — 服务状态

```bash
curl http://127.0.0.1:13580/
```

**响应**

```jsonc
// 插件已连接
{ "ready": true, "platform": "figma" }

// 插件未连接
{ "ready": false }
```

---

### 2. `POST /get_design` — 获取设计数据

**请求**

```bash
curl -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{ "nodeId": "123:456" }'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nodeId` | string | 否 | 不传则使用当前选中节点 |

**响应**

```jsonc
{
  "design": { /* 设计数据 JSON */ },
  "assets": [
    { "nodeId": "123:500", "name": "hero-image", "type": "IMAGE" },
    { "nodeId": "123:501", "name": "icon-star", "type": "VECTOR" }
  ],
  "tokens": { "--color-primary": "#1890ff" }
}
```

---

### 3. `POST /get_screenshot` — 获取截图

**请求**

```bash
curl -X POST http://127.0.0.1:13580/get_screenshot \
  -H "Content-Type: application/json" \
  -d '{ "nodeId": "123:456" }'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nodeId` | string | 否 | 不传则使用当前选中节点 |

**响应**

```jsonc
{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "width": 640,
  "height": 400
}
```

---

### 4. `POST /get_assets` — 批量导出资源

**请求**

```bash
curl -X POST http://127.0.0.1:13580/get_assets \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      { "nodeId": "123:500", "format": "png", "scale": 2 },
      { "nodeId": "123:501", "format": "svg" }
    ]
  }'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nodes` | array | 是 | 要导出的节点列表 |
| `nodes[].nodeId` | string | 是 | 节点 ID |
| `nodes[].format` | string | 否 | `"png"` \| `"svg"`，默认 `"png"` |
| `nodes[].scale` | number | 否 | PNG 缩放比例，默认 `2` |

**响应**

```jsonc
{
  "assets": [
    {
      "nodeId": "123:500",
      "name": "hero-image",
      "format": "png",
      "width": 640,
      "height": 320,
      "data": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "nodeId": "123:501",
      "name": "icon-star",
      "format": "svg",
      "width": 24,
      "height": 24,
      "data": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
    }
  ]
}
```

**资源格式说明**

| 格式 | `data` 字段内容 |
|------|----------------|
| PNG | base64 Data URL (`data:image/png;base64,...`) |
| SVG | SVG 文本字符串 |

---

## 错误处理

```jsonc
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

| Code | 说明 |
|------|------|
| `NOT_CONNECTED` | 插件未连接 |
| `NO_SELECTION` | 未选中节点，且未提供 nodeId |
| `NODE_NOT_FOUND` | 指定的 nodeId 不存在 |
| `EXPORT_FAILED` | 资源导出失败 |
| `TIMEOUT` | 插件响应超时 |

---

## WebSocket 协议

Skill Server 与浏览器插件之间通过 WebSocket 通信。

| 服务 | 端口 |
|------|------|
| HTTP API | 13580 |
| WebSocket | 13581 |

**消息格式**

```jsonc
// Server → Extension
{
  "type": "skillCall",
  "id": "req-123",
  "action": "get_design",
  "params": { "nodeId": "123:456" }
}

// Extension → Server
{
  "type": "skillResult",
  "id": "req-123",
  "payload": { ... }
}
```
