---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计转换为前端组件代码。通过 HTTP API 与 TemPad Dev Skill Server 集成。
  使用场景：(1) 查看设计截图理解 UI，(2) 获取设计节点 JSON 数据，(3) 下载图标/图片资源，(4) 基于数据生成符合项目规范的组件代码。
  前提条件：TemPad Dev 浏览器扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计转代码

## 工作流程

### 1. 获取截图理解设计

```bash
curl -X POST http://127.0.0.1:13580/get_screenshot -H "Content-Type: application/json" -d '{}'
```

返回 Base64 PNG，用于理解整体视觉效果。

### 2. 获取设计数据

```bash
curl -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

返回 `design`（UI 节点树）和 `assets`（可导出资源列表）。

### 3. 下载资源

```bash
node scripts/download-assets.cjs --nodes '[
  {"nodeId":"0:123","outputPath":"/project/src/icons/arrow.svg","format":"svg"},
  {"nodeId":"0:456","outputPath":"/project/src/images/bg.png","format":"png","scale":2}
]'
```

输出示例：

```
Downloaded 2 assets:
  - /project/src/icons/arrow.svg (24x24)
  - /project/src/images/bg.png (48x48)
```

**节点参数说明：**

- `nodeId`：节点 ID（必需）
- `outputPath`：输出文件完整路径（必需）
- `format`：`svg` | `png` | `jpg` | `webp`（可选，默认 `png`）
- `scale`：缩放比例（可选，默认 1）

### 4. 生成组件代码

1. **查阅项目规范**：检查项目的技术栈和代码风格
2. **应用通用规范**：见 [references/codegen-rules.md](references/codegen-rules.md)
3. **基于 JSON 数据生成代码**

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
