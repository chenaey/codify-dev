---
name: codify-design-to-code
description: >-
  将 Figma/MasterGo 设计转换为前端组件代码。通过 API 获取设计数据和截图，
  精准提取样式属性，生成高质量、可维护的 React/Vue等任意框架 组件代码。
  适用于需要将设计稿转换为可用代码的场景。
---

# Codify Dev - 设计还原

## 核心原则

> **截图看布局，骨架定边界，JSON 取样式。三者协同，缺一不可。样式必须从 customStyle 精确复制，禁止估算**

---

## 理解三种数据源

| 数据源 | 告诉你什么 | 不告诉你什么 |
|--------|-----------|-------------|
| **截图** | 视觉效果、颜色感知、间距比例、整体氛围 | 精确数值、层级结构、节点 ID |
| **骨架** | 组件边界、布局方向、重复模式、节点层级 | 具体样式、颜色、字体大小 |
| **JSON** | 精确 CSS 值、节点属性、资源 ID | 视觉上下文、设计意图 |

**协同使用**：
- 截图 + 骨架 → **理解设计意图，规划组件拆分**
- 骨架 + JSON → **精确实现，确保不遗漏节点**
- 截图 + JSON → **验证还原效果**

---

## 工作流程

### Step 1. 建立视觉认知（如有截图）

用户上传截图时：
- 识别主要区域和层级关系
- 观察视觉模式（重复元素、对齐方式）
- 注意装饰细节（阴影、圆角、渐变）

> 无截图时跳过此步，直接进入 Step 2。

### Step 2. 获取结构骨架

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{"node_id": "节点ID", "mode": "skeleton"}'
```

**骨架示例**：

```
FRAME 13:3808
├─ FRAME [V] 13:4000
│  ├─ TEXT "标题"
│  └─ TEXT "描述"
├─ FRAME [H] 13:4382
│  └─ FRAME ×3: ICON + TEXT
└─ FRAME [V] 17:6940
   └─ TEXT "更多内容"
```

**结合截图理解**（如有）：将骨架节点与截图中的视觉区域对应起来。

**骨架标记速查**：
- `[H]`/`[V]` → flex 水平/垂直布局
- `×N` → 重复 N 次，只实现模板
- `ID` → 关键节点，可单独获取
- `:` → 简单子节点，合并显示

### Step 3. 决策：整体还是分步（强制检查点）

**获取骨架后，必须先输出复杂度判断：**

```markdown
## 复杂度判断

**骨架层级**：X 层
**独立区域数**：N 个（列出带 ID 的 [H]/[V] 节点）
**判定结果**：简单 / 复杂

→ 选择路径：A（整体实现）/ B（分步实现）
```

| 条件 | 判定 | 执行路径 |
|------|------|---------|
| 层级 ≤3 且 独立区域 ≤2 | 简单 | → **路径 A**：Step 4 |
| 层级 >3 或 独立区域 >2 | 复杂 | → **路径 B**：阅读并按照文档执行[phased-workflow.md](references/phased-workflow.md) |

>  **禁止跳过此判断**。复杂设计必须走路径 B，否则生成质量无法保证。

---

### Step 4. 路径 A：整体实现（仅限简单设计）

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{"node_id": "节点ID"}'
```

获取 JSON 后，遵循 [codegen-rules.md](references/codegen-rules.md) 生成代码。

---

### Step 5. 下载资源

> **禁止跳过此步骤**。禁止用 emoji/占位符/纯色代替图标和图片。

**必须下载的资源**：
- `type: "ICON"` 节点 → 下载 SVG
- `url(<path-to-image>)` 背景 → 下载 PNG

**下载命令**：

```bash
node .claude/skills/codify-design-to-code/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/path/to/icon.svg","format":"svg"}
]'
```

**资源下载检查清单**：
- [ ] 代码中引用了实际下载的文件路径

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