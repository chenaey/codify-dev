---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计转换为前端组件代码。通过 HTTP API 与 TemPad Dev Skill Server 集成。
  前提条件：TemPad Dev 浏览器扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计转代码

## 核心原则

> **截图用于理解布局结构，JSON 用于提取精确样式。两者必须结合使用。**

## 工作流程

### 1. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

返回结构：
```json
{
  "rootNodeId": "0:1234",  // 根节点 ID，用于下载截图
  "design": [...],         // 节点树
  "assets": [...]          // 可导出资源列表（图标等）
}
```

### 2. 获取截图（必须先完成再继续）

**重要**：必须在查看截图后才能继续生成代码，不能跳过此步骤。

根据你的能力选择方式：

#### 方式 A：具备多模态读取本地图片能力

使用返回的 `rootNodeId` 下载截图：

```bash
# 使用 rootNodeId
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"0:1234","outputPath":"/tmp/design-screenshot.png","format":"png","scale":2}
]'
```

然后用多模态能力读取 `/tmp/design-screenshot.png`。

#### 方式 B：不具备多模态读取本地图片能力（默认方式）

**大多数场景应使用此方式**。引导用户上传截图：

> 请在 Figma/MasterGo 中对选中的组件截图并上传给我，我需要先查看设计效果才能生成代码。

**必须等待用户上传截图后才能继续下一步。**

#### 如何判断自己的能力？

- 能否调用工具直接"查看"本地图片文件（不是 read_file 读取二进制）？
- 如果不确定，请使用**方式 B**

### 3. 分析设计（截图 + JSON 结合）

| 信息来源 | 用途 |
|---------|------|
| **截图** | 整体布局结构、组件层级、视觉效果 |
| **JSON** | 精确样式值、文本内容、布局参数 |

**关键规则**：
- ✅ 样式值**必须从 `customStyle` 精确复制**，不能猜测
- ❌ 不要根据截图"看起来像"就自行添加样式

### 4. 组件规划（按需）

| 设计复杂度 | 处理方式 |
|-----------|---------|
| 原子组件（按钮、卡片等） | 直接实现 |
| 复合页面（多个独立区域） | 先规划再实现 |

**复合页面规划要点**：
1. 识别可拆分的独立区域 → 组件清单
2. 设计数据流向和 Props 接口
3. 确定实现顺序（从底层到顶层）

### 5. 生成组件代码

1. 查阅项目 `package.json` 确定技术栈
2. 应用代码规范：[references/codegen-rules.md](references/codegen-rules.md)
3. **逐节点提取 `customStyle`**，直接作为 CSS 使用
4. **文本默认值从 `text.content` 提取**

### 6. 图标资源

**原则**：`type: "ICON"` 节点必须使用实际资源文件。

```bash
# 从 assets 数组获取 nodeId，下载到项目目录
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/project/src/icons/xxx.svg","format":"svg"}
]'
```

**禁止**：空占位符、CSS 模拟、第三方图标库替代。

## 常见错误 ❌

| 错误做法 | 正确做法 |
|---------|---------|
| 猜测样式值 | 从 `customStyle` 精确复制 |
| 图标用空占位符 | 下载 assets 中的实际资源 |
| 复杂页面一次性实现 | 先规划组件结构 |

## 参考文档

| 文档 | 何时读取 |
|------|---------|
| [codegen-rules.md](references/codegen-rules.md) | 生成代码前必读 |
| [design-schema.md](references/design-schema.md) | 理解 JSON 字段结构时 |
| [api.md](references/api.md) | 需要 API 详细参数时 |

## 错误处理

| 错误码 | 处理 |
|-------|------|
| `NOT_CONNECTED` | 提示用户打开 Figma/MasterGo 并启用 TemPad Dev 扩展 |
| `NO_SELECTION` | 提示用户在设计工具中选择要转换的节点 |
| `TIMEOUT` | 重试请求（最多 3 次） |