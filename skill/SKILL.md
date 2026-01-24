---
name: codify-design-to-code
description: >-
  将 Figma/MasterGo 设计转换为前端组件代码。通过 API 获取设计数据和截图，
  精准提取样式属性，生成高质量、可维护的 React/Vue等任意框架 组件代码。
  适用于需要将设计稿转换为可用代码的场景。
---

# Codify Dev - 设计还原

## 核心原则

> **截图理解结构，JSON 提取样式。样式必须从 customStyle 精确复制，禁止估算。**

---

## 工作流程

### Step 1. 获取截图

用户上传图片则用于理解布局结构，未上传则跳过。

### Step 2. 判断复杂度

| 满足任一 | 处理方式 |
|---------|---------|
| ≥3 组件 / 完整页面 / ≥5 重复项 | → **必读** [phased-workflow.md](references/phased-workflow.md) |
| 以上都不满足 | → 继续 Step 3 |

### Step 3. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{"node_id": "节点ID，不传则使用当前选中节点"}'
```

### Step 4. 生成代码

**必读** [codegen-rules.md](references/codegen-rules.md)，然后生成代码。

### Step 5. 下载资源

`type: "ICON"` 节点和 `url(<path-to-image>)` 背景必须下载：

```bash
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/path/to/icon.svg","format":"svg"}
]'
```

---

## 参考文档

| 文档                                                | 何时读取             |
| --------------------------------------------------- | -------------------- |
| [codegen-rules.md](references/codegen-rules.md)     | **生成代码前必读**   |
| [design-schema.md](references/design-schema.md)     | 理解 JSON 结构       |
| [phased-workflow.md](references/phased-workflow.md) | **复杂设计必须先读** |
| [api.md](references/api.md)                         | API 详细参数         |

## 错误处理

| 错误码 | 处理 |
|-------|------|
| `NOT_CONNECTED` | 提示启用 Codify Dev 扩展 |
| `NO_SELECTION` | 提示选择节点 |
| `TIMEOUT` | 重试（最多 3 次） |