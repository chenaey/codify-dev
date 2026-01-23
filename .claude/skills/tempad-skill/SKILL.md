---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计还原为前端代码（支持任意框架）。
  通过 HTTP API 获取设计数据（截图 + JSON），基于数据生成高还原度代码。
  前提：TemPad Dev 扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计还原

## 核心原则

> **截图理解布局结构，JSON 提取样式。框架由项目上下文决定。**

---

## 工作流程

### Step 1. 获取截图
具备多模态读取本地图片能力时：

```bash
curl -s -X POST http://127.0.0.1:13580/get_screenshot -H "Content-Type: application/json" -d '{}'
```
读取 `/tmp/design-screenshot.png`，或引导用户上传。

### Step 2. 判断复杂度

| 满足任一 | 处理方式 |
|---------|---------|
| ≥3 组件 / 完整页面 / ≥5 重复项 | → 阅读 [phased-workflow.md](references/phased-workflow.md) |
| 以上都不满足 | → 继续 Step 3 |
**⚠️ 复杂设计禁止一次性生成所有代码，必须拆分组件逐个实现。**

### Step 3. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

### Step 4. 生成代码

阅读 [codegen-rules.md](references/codegen-rules.md) 后生成代码。

### Step 5. 下载资源

```bash
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/path/to/icon.svg","format":"svg"}
]'
```

---

## 参考文档

| 文档                                                | 何时读取             |
| --------------------------------------------------- | -------------------- |
| [codegen-rules.md](references/codegen-rules.md)     | 生成代码前必读       |
| [design-schema.md](references/design-schema.md)     | 理解 JSON 结构       |
| [phased-workflow.md](references/phased-workflow.md) | **复杂设计必须先读** |
| [api.md](references/api.md)                         | API 详细参数         |

## 错误处理

| 错误码 | 处理 |
|-------|------|
| `NOT_CONNECTED` | 提示启用 TemPad Dev 扩展 |
| `NO_SELECTION` | 提示选择节点 |
| `TIMEOUT` | 重试（最多 3 次） |