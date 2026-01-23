---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计转换为前端组件代码。通过 HTTP API 与 TemPad Dev Skill Server 集成。
  前提条件：TemPad Dev 浏览器扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计转代码

## 核心原则

> **截图理解布局，JSON 提取样式。两者必须结合。**

## 工作流程

### 1. 获取截图（必须）

具备多模态读取本地图片能力时：

```bash
curl -s -X POST http://127.0.0.1:13580/get_screenshot -H "Content-Type: application/json" -d '{}'
```

然后读取 `/tmp/design-screenshot.png`。

否则引导用户上传截图。

### 2. 分析设计

观察截图，识别布局结构、组件边界、重复模式。

**复杂设计**（满足任一）：≥3 个独立组件 / ≥4 层嵌套 / 完整页面布局 / ≥5 个列表项
→ 遵循 [phased-workflow.md](references/phased-workflow.md)

**简单设计**：继续下方步骤。

### 3. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

返回 `design`（节点树）和 `assets`（可导出资源列表）。

### 4. 生成代码

应用 [codegen-rules.md](references/codegen-rules.md)：

- 样式从 `customStyle` 精确复制
- 文本从 `text.content` 提取
- 图标从 assets 下载
- 图片从 `customStyle.background` 提取 URL（禁止 placeholder）

### 5. 下载资源

`type: "ICON"` 节点必须下载实际资源文件：

```bash
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/project/src/icons/xxx.svg","format":"svg"}
]'
```

## 常见错误

| 错误做法         | 正确做法                        |
| ---------------- | ------------------------------- |
| 猜测样式值       | 从 `customStyle` 精确复制       |
| 图标用占位符     | 下载 assets 中的实际资源        |
| 复杂页面一次生成 | 遵循 phased-workflow 分组件实现 |

## 参考文档

| 文档                                                | 何时读取             |
| --------------------------------------------------- | -------------------- |
| [codegen-rules.md](references/codegen-rules.md)     | 生成代码前必读       |
| [design-schema.md](references/design-schema.md)     | 理解 JSON 结构       |
| [phased-workflow.md](references/phased-workflow.md) | **复杂设计必须先读** |
| [api.md](references/api.md)                         | API 详细参数         |

## 错误处理

| 错误码          | 处理                                               |
| --------------- | -------------------------------------------------- |
| `NOT_CONNECTED` | 提示用户打开 Figma/MasterGo 并启用 TemPad Dev 扩展 |
| `NO_SELECTION`  | 提示用户选择要转换的节点                           |
| `TIMEOUT`       | 重试（最多 3 次）                                  |
