---
name: codify-design-to-code
description: >-
  将设计稿转换为可用于业务的 UI 代码。精准还原视觉效果，
  同时生成结构合理、数据驱动的代码。适用于任意 UI 框架。
---

# Codify Dev - 设计转代码

## 核心原则

> **截图看布局，骨架定边界，JSON 取样式。三者协同，缺一不可。**

| 数据源   | 告诉你什么                             | 不告诉你什么                |
| -------- | -------------------------------------- | --------------------------- |
| **截图** | 视觉效果、颜色感知、间距比例、整体氛围 | 精确数值、层级结构、节点 ID |
| **骨架** | 组件边界、布局方向、重复模式、节点层级 | 具体样式、颜色、字体大小    |
| **JSON** | 精确 CSS 值、节点属性、资源 ID         | 视觉上下文、设计意图        |

**协同**：截图 + 骨架 → 理解意图、规划拆分；骨架 + JSON → 精确实现；截图 + JSON → 验证还原。

---

## 工作流程

### Step 1. 获取骨架

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{"node_id": "节点ID", "mode": "skeleton"}'
```

骨架返回缩进式文本树，标记含义见 [design-schema.md](references/design-schema.md)。

### Step 2. 获取视觉图片（可选）

复杂设计（层级深或区域多）且具备图片读取能力时，获取截图辅助理解：

来源：用户上传 或 下载后阅读：

```bash
node skill/scripts/download-screenshot.cjs --output "$TMPDIR/design-screenshot.jpg"
```

带着问题看图：UI 类型？视觉区域？主体 vs 装饰？重复模式？

### Step 3. 分析结构与组件规划

根据骨架分析设计结构，规划组件拆分和实现顺序。

- 骨架太大时，按子节点 ID 分步获取 JSON 并逐个实现
- 组件拆分与接口设计规则见 [codegen-rules.md](references/codegen-rules.md)

### Step 4. 获取 JSON 并生成代码

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{"node_id": "节点ID"}'
```

生成代码前阅读 [codegen-rules.md](references/codegen-rules.md)。

### Step 5. 下载资源

所有图标和图片通过脚本下载，不使用占位符。
资源识别规则见 [codegen-rules.md](references/codegen-rules.md)，下载命令见 [api.md](references/api.md)。

---

## 完成前回顾

生成代码后，内部检查：

- 骨架中的关键节点是否都已实现
- 业务数据是否通过 Props 传入（非硬编码）
- 重复结构是否使用数组循环
- 所有资源是否已下载，路径真实
- 资源引用方式是否与项目已有代码一致

---

## 参考文档

| 文档                                            | 何时读取           |
| ----------------------------------------------- | ------------------ |
| [codegen-rules.md](references/codegen-rules.md) | 生成代码前         |
| [design-schema.md](references/design-schema.md) | 理解 JSON 结构时   |
| [api.md](references/api.md)                     | 调用 API 或下载资源时 |

## 错误处理

见 [api.md](references/api.md) 错误格式与错误码。