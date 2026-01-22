---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计转换为前端组件代码。通过 HTTP API 与 TemPad Dev Skill Server 集成。
  前提条件：TemPad Dev 浏览器扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计转代码

## 工作流程

### 1. 获取截图理解设计

```bash
curl -s -X POST http://127.0.0.1:13580/get_screenshot -H "Content-Type: application/json" -d '{}'
```

返回 JSON: `{"image": "data:image/png;base64,..."}`

**查看方式**：直接读取 base64 数据，让模型解析图像内容。

### 2. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

返回 `design`（UI 节点树）和 `assets`（可导出资源列表）。

**重要**：
- `assets` 仅列出可导出资源，不表示使用位置
- 根据 `design` 树中 `vector` 节点的**位置**判断图标用途

### 3. 下载资源（按需）

根据 JSON 树结构判断需要哪些图标，通过 `vector.id` 下载：

```bash
node scripts/download-assets.cjs --nodes '[
  {"nodeId":"0:123","outputPath":"/project/src/icons/arrow.svg","format":"svg"}
]'
```

`nodeId` 来源：`assets[].nodeId` 或节点中的 `vector.id`。

### 4. 生成组件代码

1. 查阅项目规范（技术栈、代码风格）
2. 应用通用规范：[references/codegen-rules.md](references/codegen-rules.md)
3. **样式直接复制 `customStyle`，不要猜测**
4. **文本默认值从 `text.content` 提取**

## 参考文档

| 文档                                            | 何时读取         |
| ----------------------------------------------- | ---------------- |
| [codegen-rules.md](references/codegen-rules.md) | 生成代码时       |
| [design-schema.md](references/design-schema.md) | 理解 JSON 字段时 |
| [api.md](references/api.md)                     | 需要 API 详情时  |

## 错误处理

| 错误码          | 处理                      |
| --------------- | ------------------------- |
| `NOT_CONNECTED` | 提示打开 Figma 并启用扩展 |
| `NO_SELECTION`  | 提示在 Figma 中选择节点   |
| `TIMEOUT`       | 重试请求                  |