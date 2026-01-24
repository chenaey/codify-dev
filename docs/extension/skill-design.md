# Skill 能力设计文档

## 概述

Skill 是 TemPad Dev 提供的一套轻量级 HTTP API 能力，允许外部 Agent（如 AI 编程助手、自动化脚本等）通过 HTTP 请求获取 Figma/MasterGo 设计稿的结构化数据、截图和资源文件。

与 MCP（Model Context Protocol）不同，Skill 采用更简单的 HTTP API 架构，适合需要快速集成的场景。

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                         整体架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐       HTTP        ┌──────────────┐                │
│   │  Agent  │ ◄───────────────► │ Skill Server │                │
│   │ (Cursor │   POST /get_xxx   │   (Node.js)  │                │
│   │  Trae)  │                   └──────┬───────┘                │
│   └─────────┘                          │                         │
│                                        │ WebSocket               │
│                                        │ ws://127.0.0.1:13581    │
│                                        ▼                         │
│                           ┌────────────────────────┐            │
│                           │   Browser Extension    │            │
│                           │   (Figma/MasterGo)     │            │
│                           │   ┌────────────────┐   │            │
│                           │   │ Skill Handlers │   │            │
│                           │   └────────────────┘   │            │
│                           └────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 组件说明

| 组件                       | 位置                                      | 职责                                                              |
| -------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| **API Server**             | `packages/api-server/`                    | 独立 Node.js 服务,提供 HTTP API,通过 WebSocket 与浏览器扩展通信 |
| **Extension Skill Module** | `packages/extension/skill/`               | 浏览器扩展中的 Skill 处理模块，执行实际的设计数据提取             |
| **Skill Composable**       | `packages/extension/composables/skill.ts` | Vue composable，管理 Skill 连接状态和自动激活逻辑                 |

## 端口配置

| 服务      | 默认端口 | 环境变量        |
| --------- | -------- | --------------- |
| HTTP API  | `13580`  | `SKILL_PORT`    |
| WebSocket | `13581`  | `SKILL_WS_PORT` |

## API 接口

### 1. 状态查询

```http
GET /
```

**响应示例：**

```json
{
  "ready": true,
  "platform": "figma",
  "activeId": "abc123",
  "count": 2
}
```

| 字段       | 类型    | 说明                            |
| ---------- | ------- | ------------------------------- |
| `ready`    | boolean | 是否有活跃的扩展连接            |
| `platform` | string  | 当前平台 (`figma` / `mastergo`) |
| `activeId` | string  | 当前活跃扩展的 ID               |
| `count`    | number  | 已连接的扩展数量                |

### 2. 获取设计数据

```http
POST /get_design
Content-Type: application/json

{
  "nodeId": "123:456"  // 可选，不传则使用当前选中节点
}
```

**响应示例：**

```json
{
  "design": {
    "id": "123:456",
    "name": "Button",
    "type": "FRAME",
    "layout": { ... },
    "customStyle": { ... },
    "children": [ ... ]
  },
  "assets": [
    {
      "nodeId": "123:500",
      "name": "icon-arrow.svg",
      "type": "VECTOR"
    },
    {
      "nodeId": "123:501",
      "name": "avatar.png",
      "type": "IMAGE"
    }
  ]
}
```

**设计数据结构：**

- 递归的 UI 节点树，包含布局、样式、文本等信息
- 经过 `uiExtractor` 和 `uiParser` 处理，输出适合前端开发的结构
- 根据项目类型（Web/Vue/React/React Native/小程序）进行样式转换

**资源分类逻辑：**

| 类型     | 说明                 | 导出格式 |
| -------- | -------------------- | -------- |
| `VECTOR` | 矢量图形/图标（SVG） | SVG      |
| `IMAGE`  | 位图/照片（PNG）     | PNG      |

### 3. 获取截图

```http
POST /get_screenshot
Content-Type: application/json

{
  "nodeId": "123:456"  // 可选
}
```

**响应示例：**

```json
{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "width": 800,
  "height": 600
}
```

- 默认导出 2x 分辨率的 PNG
- 返回 Base64 编码的 Data URL

### 4. 导出资源

```http
POST /get_assets
Content-Type: application/json

{
  "nodes": [
    { "nodeId": "123:500", "format": "svg" },
    { "nodeId": "123:501", "format": "png", "scale": 2 }
  ]
}
```

**响应示例：**

```json
{
  "assets": [
    {
      "nodeId": "123:500",
      "name": "icon-arrow",
      "format": "svg",
      "width": 24,
      "height": 24,
      "data": "<svg>...</svg>"
    },
    {
      "nodeId": "123:501",
      "name": "avatar",
      "format": "png",
      "width": 200,
      "height": 200,
      "data": "data:image/png;base64,..."
    }
  ]
}
```

## 错误处理

所有 API 在出错时返回统一的错误结构：

```json
{
  "error": {
    "code": "NO_SELECTION",
    "message": "Expected 1 node, got 0"
  }
}
```

**错误码：**

| 错误码           | 说明                         |
| ---------------- | ---------------------------- |
| `NOT_CONNECTED`  | 没有扩展连接到服务器         |
| `NO_SELECTION`   | 没有选中节点或选中数量不正确 |
| `NODE_NOT_FOUND` | 指定的 nodeId 不存在或不可见 |
| `EXPORT_FAILED`  | 导出失败                     |
| `TIMEOUT`        | 请求超时（默认 30 秒）       |

## WebSocket 协议

### 消息流程

```
Extension                    Server                      Agent
    │                           │                           │
    │──── connect ─────────────►│                           │
    │◄─── registered {id} ──────│                           │
    │──── activate {info} ─────►│                           │
    │◄─── state {activeId} ─────│                           │
    │                           │◄──── POST /get_design ────│
    │◄─── skillCall {action} ───│                           │
    │──── skillResult {data} ──►│                           │
    │                           │────► JSON Response ───────►│
    │                           │                           │
```

### 消息类型

**Server → Extension:**

| 类型         | 说明                            |
| ------------ | ------------------------------- |
| `registered` | 连接注册成功，返回分配的 ID     |
| `state`      | 广播当前状态（活跃 ID、连接数） |
| `skillCall`  | 转发 API 请求                   |

**Extension → Server:**

| 类型          | 说明             |
| ------------- | ---------------- |
| `activate`    | 请求激活当前扩展 |
| `skillResult` | 返回处理结果     |

## 多标签页支持

Skill 支持多个浏览器标签页同时连接，但同一时间只有一个**活跃标签页**会响应 API 请求。

### 激活机制

1. **首次连接自动激活**：第一个连接的扩展自动成为活跃状态
2. **手动激活**：用户可在 TemPad Dev 面板中点击激活按钮
3. **自动激活**：当用户在某个标签页中选中元素时，该标签页自动激活

### 自动激活逻辑

```typescript
// composables/skill.ts
watch(
  () => selection.value,
  (newSelection) => {
    // 满足以下条件时自动激活：
    // 1. Skill 已连接
    // 2. 有选中的元素
    // 3. 当前标签页不是活跃的
    // 4. 窗口是活跃的（用户正在操作）
    if (
      status.value === 'connected' &&
      newSelection.length > 0 &&
      !selfActive.value &&
      isWindowActive.value
    ) {
      activate()
    }
  }
)
```

这意味着用户只需在目标设计稿中点击选中一个元素，该标签页就会自动成为活跃标签页，无需手动切换。

## 资源识别与分类

### 图标识别逻辑

Skill 使用 `iconExtractor.ts` 中的 `isIconNode` 函数判断节点是否为图标：

```typescript
function isIconNode(node): boolean {
  // 1. 尺寸检查：小于 64x64
  const sizeBasedIcon = node.width <= 64 && node.height <= 64

  // 2. 比例检查：接近正方形（宽高差 <= 2px）
  const isSquarish = Math.abs(node.width - node.height) <= 2

  // 3. 小尺寸矢量：<= 24px 的矢量（如箭头）
  const isSmallVector = node.width <= 24 && node.height <= 24

  // 4. 宽高比检查：避免把按钮背景误判为图标
  const aspectRatio = max(width, height) / min(width, height)
  const hasReasonableAspectRatio = aspectRatio <= 3

  // 组合判断...
}
```

### 矢量类型

支持的矢量节点类型（导出为 SVG）：

| Figma 类型          | MasterGo 类型       | 说明         |
| ------------------- | ------------------- | ------------ |
| `VECTOR`            | `VECTOR`            | 矢量路径     |
| `BOOLEAN_OPERATION` | `BOOLEAN_OPERATION` | 布尔运算     |
| `STAR`              | `STAR`              | 星形         |
| `LINE`              | `LINE`              | 线条         |
| `ELLIPSE`           | `ELLIPSE`           | 椭圆         |
| `POLYGON`           | `REGULAR_POLYGON`   | 多边形       |
| -                   | `PEN`               | 钢笔工具路径 |

## 目录结构

```
packages/
├── api-server/                   # API Server
│   ├── src/
│   │   ├── index.ts             # 入口，启动 HTTP + WebSocket 服务
│   │   ├── api.ts               # Hono HTTP API 路由
│   │   ├── websocket.ts         # WebSocket 连接管理
│   │   ├── types.ts             # 类型定义
│   │   └── config.ts            # 配置常量
│   └── package.json
│
└── extension/
    ├── skill/                    # Skill 扩展模块
    │   ├── index.ts             # 模块入口
    │   ├── connection.ts        # WebSocket 连接管理
    │   ├── handlers.ts          # Action 处理器
    │   └── types.ts             # 类型定义
    │
    ├── composables/
    │   └── skill.ts             # Vue composable
    │
    └── utils/
        ├── uiExtractor.ts       # UI 节点提取
        ├── uiParser.ts          # UI 信息解析
        └── iconExtractor.ts     # 图标识别
```

## 使用示例

### 启动服务

```bash
# 安装并启动 Skill Server
npx @codify-dev/api-server
```

### 在 Agent 中调用

```python
import requests

# 检查状态
status = requests.get("http://127.0.0.1:13580/").json()
if not status.get("ready"):
    print("请先打开 Figma 并选中一个元素")
    exit(1)

# 获取设计数据
design = requests.post(
    "http://127.0.0.1:13580/get_design",
    json={}
).json()

print(f"节点名称: {design['design']['name']}")
print(f"资源数量: {len(design['assets'])}")

# 导出资源
if design["assets"]:
    assets = requests.post(
        "http://127.0.0.1:13580/get_assets",
        json={
            "nodes": [
                {"nodeId": a["nodeId"], "format": "svg" if a["type"] == "VECTOR" else "png"}
                for a in design["assets"]
            ]
        }
    ).json()

    for asset in assets["assets"]:
        print(f"导出: {asset['name']}.{asset['format']}")
```

## 与 MCP 的对比

| 特性     | Skill              | MCP                           |
| -------- | ------------------ | ----------------------------- |
| 协议     | HTTP + WebSocket   | JSON-RPC over WebSocket/Stdio |
| 复杂度   | 简单               | 较复杂                        |
| 集成难度 | 低（标准 HTTP）    | 需要 MCP SDK                  |
| 资源传输 | Base64 内联        | 可选文件服务器                |
| 适用场景 | 快速集成、脚本调用 | 深度 AI 集成                  |
| 工具发现 | 固定 API           | 动态工具注册                  |

## 安全注意事项

- 服务仅监听 `127.0.0.1`，不对外暴露
- 适合本地开发环境使用
- 生产环境部署需要额外的安全措施
