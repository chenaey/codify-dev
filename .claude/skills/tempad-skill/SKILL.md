---
name: tempad-skill
description: |
  将 Figma/MasterGo 设计转换为前端组件代码。通过 HTTP API 与 TemPad Dev Skill Server 集成。
  前提条件：TemPad Dev 浏览器扩展已连接，Skill Server 运行在 http://127.0.0.1:13580
---

# TemPad Dev - 设计转代码

## 核心原则

> **截图用于理解布局结构，JSON 用于提取精确样式。两者必须结合使用。**
> **复杂设计采用分阶段工作流：分析写入文件 + 按需查询 + 逐组件实现。**

## 工作流程

```
截图 → 分析设计
            │
  ┌─────────┴─────────┐
  ↓                   ↓
简单                复杂
  │                   │
get_design()    写 structure.md（含组件清单）
  │                   │
生成代码        get_design() → 存 design.json
                      │
                ┌─────┴─────┐
                ↓ 循环清单   │
          query-design      │
          (骨架 → 定位)     │
                ↓           │
          query-design      │
          (ID → 完整)       │
                ↓           │
            生成组件 ───────┘
                │
            组装页面
```

### 1. 获取截图

**必须先完成**，不能跳过。

#### 方式 A：具备多模态读取本地图片能力
下载图片
```bash
curl -s -X POST http://127.0.0.1:13580/get_screenshot -H "Content-Type: application/json" -d '{}'
```

然后用多模态能力读取 `/tmp/design-screenshot.png`。

#### 方式 B：不具备多模态读取本地图片能力
引导用户上传截图：

> 请在 Figma/MasterGo 中对选中的组件截图并上传给我，我需要先查看设计效果才能生成代码。

**必须等待用户上传截图后才能继续下一步。**

#### 如何选择？
- 能否调用工具直接"查看"本地图片文件（不是 read_file 读取二进制）？
- 不确定 → 方式 B

### 2. 分析设计

观察截图，分析有助于还原 UI 的信息：

- 视觉层次与布局结构
- 区域划分与组件边界
- 重复模式
- 实现时需要注意的细节

1. **组件拆分决策**：单组件 or 多组件？
2. **组件清单**：需要实现哪些组件？各自职责？
3. **布局结构**：整体如何排布？
4. **重复模式**：哪些元素是同一组件的多个实例？
5. **实现顺序**：先实现什么？依赖关系？

根据复杂度选择后续流程：
- **简单设计**（单组件或少量组件）：继续下方步骤 3-5
- **复杂设计**（多组件/嵌套复杂）：**必须**按照 [phased-workflow.md](references/phased-workflow.md) 执行，将上述分析写入文件持久化

### 3. 获取设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design -H "Content-Type: application/json" -d '{}'
```

返回 `design`（节点树）和 `assets`（可导出资源列表）。

### 4. 生成代码

1. 应用代码规范：[codegen-rules.md](references/codegen-rules.md)
2. **逐节点提取 `customStyle`**，直接作为 CSS 使用
3. **文本默认值从 `text.content` 提取**

### 5. 下载资源

**原则**：`type: "ICON"` 节点必须使用实际资源文件。

```bash
# 从 assets 数组获取 nodeId，下载到项目目录
node .claude/skills/tempad-skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"123:456","outputPath":"/project/src/icons/xxx.svg","format":"svg"}
]'
```

**禁止**：空占位符、CSS 模拟、第三方图标库替代。

## 常见错误

| 错误做法 | 正确做法 |
|---------|---------|
| 猜测样式值 | 从 `customStyle` 精确复制 |
| 图标用空占位符 | 下载 assets 中的实际资源 |
| 复杂页面一次性读取完整 JSON | 分阶段：先骨架定位，再按 ID 查询 |
| 复杂页面一次性生成 | 分组件逐个实现 |

## 参考文档

| 文档 | 何时读取 |
|------|---------|
| [codegen-rules.md](references/codegen-rules.md) | 生成代码前必读 |
| [design-schema.md](references/design-schema.md) | 理解 JSON 结构 |
| [phased-workflow.md](references/phased-workflow.md) | 复杂设计处理前必读 |
| [api.md](references/api.md) | API 详细参数 |

## 错误处理

| 错误码 | 处理 |
|-------|------|
| `NOT_CONNECTED` | 提示用户打开 Figma/MasterGo 并启用 TemPad Dev 扩展 |
| `NO_SELECTION` | 提示用户选择要转换的节点 |
| `TIMEOUT` | 重试（最多 3 次） |