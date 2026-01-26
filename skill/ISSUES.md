# Codify Skill - 问题追踪

本文档追踪 D2C 过程中发现的问题，关联 [CONTRIBUTING.md](./CONTRIBUTING.md) 的迭代流程。

---

## 待处理问题

### 1. API 缺少设计结构概览 ⭐⭐⭐

**Issue ID**: #design-outline

**问题描述**:
`get_design` API 只返回深度嵌套的 `design` 树，模型需要遍历整个树才能理解设计结构，容易遗漏内容区域。

**当前行为**:
```json
{
  "rootNodeId": "13:3808",
  "design": [...深度嵌套的完整树...],
  "assets": [...]
}
```

**期望行为**:
```json
{
  "rootNodeId": "13:3808",
  "outline": [
    { "id": "13:3809", "type": "RECTANGLE", "name": "背景图" },
    { "id": "13:3811", "type": "FRAME", "name": "导航栏", "childCount": 3 },
    { "id": "13:4377", "type": "FRAME", "name": "阵容卡片", "childCount": 5 },
    { "id": "17:6940", "type": "GROUP", "name": "底部内容", "childCount": 2 }
  ],
  "design": [...],
  "assets": [...]
}
```

**预期效果**:
1. 模型一眼看到所有主要区域
2. 不需要遍历整个 JSON 树
3. 减少遗漏的可能性

**实现方案**:
1. 修改 `GetDesignResult` 类型，增加 `outline` 字段
2. 在 `handleGetDesign` 中提取根节点的直接子节点信息
3. 更新 `design-schema.md` 文档

**涉及文件**:
- `packages/extension/skill/types.ts`
- `packages/extension/skill/handlers.ts`
- `skill/references/design-schema.md`

**状态**: 🟡 实现中

---

### 2. Agent 执行时跳过资源下载步骤 ⭐⭐⭐

**Issue ID**: #asset-download-skipped

**问题描述**:
Agent 在执行 codify-design-to-code 流程时，完全跳过了 SKILL.md Step 5 的资源下载步骤，导致所有 ICON 和图片背景都没有实际资源文件。

**当前行为**:
```vue
<!-- 图标用 emoji 代替 -->
<span class="fire-icon">🔥</span>

<!-- 背景用纯色/渐变代替实际图片 -->
.product-image {
  background: linear-gradient(135deg, #2d1616 0%, #1c0b0b 100%);
}
```

**期望行为**:
1. 调用 `download-assets.cjs` 下载所有 `type: "ICON"` 的节点
2. 调用 `download-assets.cjs` 下载所有 `url(<path-to-image>)` 背景的节点
3. 在代码中引用下载的实际文件

```bash
# 应该执行的命令
node skill/scripts/download-assets.cjs --nodes '[
  {"nodeId":"322:443","outputPath":"src/assets/fire-icon.svg","format":"svg"},
  {"nodeId":"13:3809","outputPath":"src/assets/bg-image.png","format":"png"}
]'
```

**根因分析**:
1. SKILL.md 中资源下载是 Step 5，但 Agent 在 Step 4 生成代码后直接结束
2. 资源下载步骤标注为「按需」，Agent 错误理解为「可选」
3. 缺少强制检查机制确保资源被下载

**改进方案**:
1. 在 SKILL.md 中将资源下载从「按需」改为「必须」
2. 添加检查清单：`[ ] 所有 ICON 节点已下载 SVG` `[ ] 所有图片背景已下载 PNG`
3. 在 codegen-rules.md 添加禁止性规则：`❌ 用 emoji/占位符代替图标`

**涉及文件**:
- `skill/SKILL.md`
- `skill/references/codegen-rules.md`

**状态**: � 已解决 (v3.0) - Step 5 资源检查清单已强化

---

### 3. 复杂设计未严格执行分步流程 ⭐⭐

**Issue ID**: #phased-workflow-skipped

**问题描述**:
Agent 正确判断了设计复杂度（路径 B），但没有严格执行 phased-workflow.md 的分步流程：
1. 没有创建 `implementation-plan.md`
2. 没有逐个组件实现
3. 一次性生成了整个 800+ 行的页面组件

**当前行为**:
```markdown
## 复杂度判断
**骨架层级**：6 层
**判定结果**：复杂
→ 选择路径：B

[然后直接一次性生成完整代码]
```

**期望行为**:
```markdown
## 实现追踪
**复杂度**：复杂（层级 6，区域 4 个）
**路径**：B（分步实现）

| # | 区域 | 节点 ID | 状态 |
|---|------|---------|------|
| 1 | Header | 13:3811 | ⬜ |
| 2 | LineupCard | 13:4377 | ⬜ |
...

[然后逐个区域实现，每完成一个更新状态为 ✅]
```

**根因分析**:
1. phased-workflow.md 的检查点机制不够强制
2. Agent 倾向于一次性完成任务，而非分步骤
3. 缺少「Phase 完成确认」的阻断机制

**改进方案**:
1. SKILL.md Step 3 合并"复杂度判断"和"实现追踪"为一体
2. phased-workflow.md 开头添加禁止/必须表格，强化约束
3. 明确完成条件：所有区域状态为 ✅

**状态**: � 已解决 (v3.0)

---

### 4. 样式值估算而非精确复制 ⭐⭐

**Issue ID**: #style-estimation

**问题描述**:
部分样式值是 Agent 估算的，不是从 `customStyle` 精确复制，违反 codegen-rules.md 的核心原则。

**当前行为**:
```less
.lineup-grid {
  gap: 8px;  // ❌ JSON 中没有 gap 属性
}

.tip-banner {
  margin-top: 12px;  // ❌ 估算值
  padding: 8px 12px;  // ❌ 估算值
}
```

**JSON 中的实际值**:
```json
{
  "id": "13:4382",
  "customStyle": {
    "display": "flex",
    "align-items": "flex-start",
    "align-content": "flex-start",
    "flex-wrap": "wrap"
    // 没有 gap 属性
  }
}
```

**期望行为**:
- 只使用 `customStyle` 中存在的属性
- 如果需要间距，从子节点的 `margin-right` 等属性获取
- 不确定时，不添加

**根因分析**:
1. Agent 基于视觉截图推断间距，而非从 JSON 提取
2. codegen-rules.md 的「禁止估算」规则不够醒目

**改进方案**:
1. 在 codegen-rules.md 添加检查清单：
   - `[ ] 每个样式属性都能在 customStyle 中找到来源`
   - `[ ] 没有添加 customStyle 不存在的属性`

**状态**: 🔴 待处理

---

### 5. 固定宽度违反响应式原则 ⭐

**Issue ID**: #fixed-width-responsive

**问题描述**:
生成的代码使用了多个固定宽度值，违反响应式设计原则。

**当前行为**:
```less
.zhenrong-page {
  max-width: 375px;  // ❌ 硬编码设计稿宽度
}

.bg-image {
  width: 375px;  // ❌ 固定宽度
}
```

**期望行为**:
```less
.zhenrong-page {
  width: 100%;  // ✅ 容器宽度自适应
}

.bg-image {
  width: 100%;  // ✅ 背景图自适应
}
```

**根因分析**:
- Agent 直接复制了设计稿的 375px 画布宽度
- codegen-rules.md 的响应式规则没有被充分理解

**状态**: 🔴 待处理

---

## 已解决问题

### ✅ 资源下载部分失败处理 (v2.9)

**Issue ID**: #partial-asset-failure

**原问题**:
`get_assets` API 在导出多个资源时，如果任意一个资源导出失败，整个请求返回失败，无法获取其他成功的资源。

**表现**:
```
Error: EXPORT_FAILED - Unknown error
```

**根因分析**:
1. `handleGetAssets` 使用单一 try-catch 包裹所有资源导出
2. 任一资源异常会中断整个循环
3. 错误信息不包含具体失败的节点 ID

**解决方案**:

1. **后端 (`handlers.ts`)**:
   - 每个资源独立 try-catch
   - 失败的资源返回 `error` 字段而非抛出异常
   - 添加 `summary` 字段统计成功/失败数量

2. **类型定义 (`types.ts`)**:
   - `ExportedAsset` 新增可选 `error` 字段
   - `GetAssetsResult` 新增可选 `summary` 字段

3. **脚本 (`download-assets.cjs`)**:
   - 处理部分成功的响应
   - 成功的资源显示 ✓，失败的显示 ✗ 并附带错误原因
   - 部分失败时退出码为 0（允许继续流程）
   - 全部失败时退出码为 1

**改进后输出**:
```
Downloaded 3 assets (2 success, 1 failed):
  ✓ src/icons/arrow.svg (24x24)
  ✓ src/icons/close.svg (16x16)
  ✗ src/images/bg.png - NODE_NOT_FOUND: Node "0:456" not found

Warning: 1 asset(s) failed to download
```

**涉及文件**:
- `packages/extension/skill/types.ts`
- `packages/extension/skill/handlers.ts`
- `packages/api-server/src/types.ts`
- `skill/scripts/download-assets.cjs`

---

### ✅ 复杂设计未拆分组件 (v2.7)

**Issue ID**: #component-split-enforcement

**原问题**:
1. 虽然创建了 `structure.md` 规划，但最终还是一次性在 App.vue 中实现所有代码
2. 没有真正拆分组件，导致还原度不够
3. `phased-workflow.md` 只是"指导"而非"约束"

**根因分析**:
- SKILL.md 中的"复杂设计"判断只是建议，没有强制约束
- phased-workflow.md 缺少明确的检查点和禁止性规则
- 没有机制阻止跳过分组件实现直接写大文件

**解决方案**:

1. **SKILL.md 强化**:
   - 将"遵循"改为"必须遵循"
   - 添加醒目警告：`⚠️ 复杂设计禁止一次性生成所有代码`
   - 简化流程，复杂度判断前置

2. **phased-workflow.md 重构**:
   - 引入 3-Phase 强制流程：规划 → 逐个实现 → 组装
   - 每个 Phase 添加检查点，必须确认后才能进入下一个
   - 明确禁止性规则：直接写 App.vue 包含所有代码 = ❌
   - 添加示例演示正确执行流程

3. **检查点机制**:
   - Phase 1 检查点：structure.md 已创建、组件已列出
   - Phase 2 检查点：所有组件状态为 ✅、每个组件有独立文件
   - Phase 3 检查点：页面入口文件已创建、组件已正确导入

**涉及文件**:
- `skill/codify-skill/SKILL.md`
- `skill/codify-skill/references/phased-workflow.md`
- `skill/codify-skill/ISSUES.md`

---

### 4. 绝对定位节点信息缺失 ⭐⭐⭐ 高优先级（历史问题）

**问题文件**: `packages/extension/utils/uiExtractor.ts`

**问题描述**:
`layoutPositioning: "ABSOLUTE"` 的节点信息在提取过程中被丢弃。

**原始数据**（已确认存在）:

```json
{
  "id": "0:5756",
  "layoutPositioning": "ABSOLUTE",
  "constraints": { "horizontal": "END", "vertical": "START" },
  "x": 339,
  "y": 3,
  "width": 16,
  "height": 16
}
```

**输出 JSON**: 该节点作为普通 flex 子元素，无定位信息。

**期望输出**:

```json
{
  "type": "ICON",
  "layout": {
    "positioning": "absolute",
    "constraints": { "horizontal": "END", "vertical": "START" },
    "x": 339,
    "y": 3,
    "width": 16,
    "height": 16
  }
}
```

**排查方向**:

1. `uiExtractor.ts` 是否过滤了 `layoutPositioning === "ABSOLUTE"` 的节点？
2. `layoutExtractor.ts` 是否忽略了 `layoutPositioning` 字段？

**状态**: 🔴 待处理

---

## 调试工具

### 节点树打印工具

已添加 `packages/extension/utils/debugNodeTree.ts`，提供递归序列化：

```typescript
// 选中节点时自动在控制台输出完整 JSON
// 可直接复制用于分析
```

在 `selection.ts` 中已启用，选中节点时会自动打印完整节点树。

---

## 已解决问题

### ✅ Skill 文档精简优化 (v2.6)

**Issue ID**: #complex-workflow-enforce, #image-resources

**原问题**:

1. 复杂工作流规则冗长，违反"模型很聪明"原则
2. 图片资源规则示例过多，重复啰嗦
3. phased-workflow.md 检查点过度形式化

**解决方案**: 按 skill-creator 原则精简

1. **SKILL.md**: 移除流程图、冗余分支，用一行条件判断替代
2. **phased-workflow.md**: 从 180+ 行精简至 ~60 行，保留核心流程
3. **codegen-rules.md**: 图片资源规则从 30+ 行精简至 1 行
4. **移除"跳转"概念**: 用清晰的条件分支替代

**原则**:

- 信任模型推理能力
- 一句话能说清就不用一段话
- 示例只在必要时提供

**涉及文件**:

- `skill/codify-skill/SKILL.md`
- `skill/codify-skill/references/phased-workflow.md`
- `skill/codify-skill/references/codegen-rules.md`

---

### ✅ 复杂设计分阶段处理 (v2.5)

**Issue ID**: #phased-workflow

**原问题**:

1. **组件规划承诺未兑现**: Agent 说"会拆分多组件"，实际只创建一个大组件
2. **样式还原精度不足**: 大 JSON 导致注意力分散，样式值被猜测而非精确复制
3. **代码语法错误**: 如 `</script` 缺少闭合 `>`

**根因分析**:

- 复杂设计的 JSON 超过 1000 行，LLM 无法有效处理全部信息
- 图片分析结果随对话推进丢失
- 一次性生成导致注意力分散

**解决方案**: 分阶段工作流

1. **外化记忆**: 图片分析写入 `structure.md`
2. **按需加载**: 设计数据存入 `design.json`，使用工具按需查询
3. **两阶段读取**: 骨架定位 → 子树提取
4. **逐区域实现**: 按结构分析顺序逐个实现

**工具支持**:

- `query-design.cjs`: 支持 `--skeleton`、`--id`、`--path`、`--depth`
- 插件层保留 `id` 字段

**涉及文件**:

- `skill/codify-skill/SKILL.md` - 简化主流程，复杂逻辑引用参考文档
- `skill/codify-skill/scripts/query-design.cjs` - 查询工具
- `skill/codify-skill/references/phased-workflow.md` - 复杂设计处理指南
- `packages/extension/utils/jsonOptimizer.ts` - 保留 ID 字段

---

### ✅ 选中节点 UI 响应优化 (v2.4)

**Issue ID**: #selection-lag

**原问题**: 点击大型/复杂元素时页面会卡顿，特别是包含大量子节点的组件

**根因分析**:

1. `getCSSAsync(node)` - Figma/MasterGo CSS 计算是同步阻塞操作
2. 每次选择变化都重新计算，即使是同一节点也会重复计算
3. 快速切换节点时，旧计算仍在进行，浪费资源

**解决方案**: 三层优化策略

1. **防抖 (Debounce)** - 100ms
   - 使用 `useDebounceFn` 包装 `updateCode`
   - 快速连续点击只执行最后一次计算

2. **结果缓存 (LRU Cache)**
   - 缓存键 = `nodeId:cssUnit:rootFontSize:scale:project:pluginId`
   - 限制缓存大小为 50 条，超出时 LRU 淘汰
   - 重复选择同一节点时瞬间响应

3. **过时请求取消**
   - 使用 `updateVersion` 计数器标记请求版本
   - 异步操作后检查版本，过时请求直接放弃
   - 避免旧结果覆盖新结果

**性能提升**:
| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 首次点击大型节点 | 卡顿 500-2000ms | 卡顿 (无法避免) |
| 重复点击同一节点 | 每次都卡顿 | **瞬间响应** |
| 快速连续点击不同节点 | 每次都阻塞 | **只计算最后一个** |

**涉及文件**:

- `packages/extension/components/sections/CodeSection.vue` - 防抖、缓存、取消逻辑

---

### ✅ 压缩优化：内容感知 + 连续性检测 + GROUP 豁免 (v2.3.1)

**Issue ID**: #compression-refinement

**原问题**: V7 压缩存在三个边缘问题

1. **内容丢失**: 相同组件但文本/图标不同（如菜单项），被压缩后信息丢失
2. **布局错乱**: 非连续的重复节点（如分隔线穿插菜单项）被错误压缩，破坏层次关系
3. **元数据噪音**: GROUP 内部出现 `repeatNodeIds`，语义冗余

**解决方案**:

1. **内容感知哈希** (`computeContentHash`)
   - 递归收集：文本内容、图片哈希、矢量尺寸
   - 使用 djb2 哈希算法生成内容指纹
   - 签名变为 `component:{mainComponent.id}:{contentHash}`

2. **连续性检测**
   - 只压缩连续的重复节点
   - 非连续重复保持独立，保留布局层次

3. **GROUP 豁免**
   - `node.type === 'GROUP'` 时跳过子节点重复检测
   - GROUP 是视觉容器，内部重复通常无系统性意义

**涉及文件**:

- `packages/extension/skill/extract/compress.ts` - `computeContentHash`, `detectRepeatingPatterns`
- `packages/extension/utils/uiExtractor.ts` - GROUP 豁免逻辑、cssCache 集成

---

### ✅ 大型设计性能优化 - V7 Inline Compression (v2.3)

**Issue ID**: #large-design-optimization

**原问题**: 大型设计（如 10 个相同卡片组件）导致 JSON 数据冗余、CSS 提取缓慢

**解决方案**: V7 Inline Compression

1. **签名统一**：COMPONENT 和 INSTANCE 使用相同签名 `component:{mainComponent.id}`
2. **内联跳过**：在遍历子节点前检测重复模式，跳过冗余节点的 CSS 提取
3. **元数据标记**：样本节点附带 `repeatCount` 和 `repeatNodeIds`

**性能提升**：

- 10 个相同组件：CSS 提取从 10 次 → 1 次
- JSON 大小：从 N 条记录 → 1 条记录

**涉及文件**:

- `packages/extension/skill/extract/compress.ts` - 签名计算、模式检测
- `packages/extension/utils/uiExtractor.ts` - 集成压缩逻辑

**文档更新**: `design-schema.md`, `codegen-rules.md`

---

### ✅ 响应式规则完善 (v1.9)

**Issue ID**: #responsive-rules

**原问题**: 响应式规则过于简单，仅一句话「容器禁止固定宽高」，导致生成的组件在手机/PC端显示异常

**解决方案**: 在 codegen-rules.md 完善响应式规则（遵循抽象原则，不硬编码具体值）：

- 容器：`width: 100%`，按需添加 `max-width`
- 有 padding 的容器：添加 `box-sizing: border-box`
- 宽度继承：确保父→子不断链

**文档更新**: `codegen-rules.md`

---

### ✅ 状态切换尺寸稳定性 (v1.8)

**Issue ID**: #border-size-jump

**原问题**: 当元素有多个状态，状态间存在影响盒模型的属性差异（如 border），会导致尺寸跳动

**解决方案**: 在 codegen-rules.md 新增通用规则「状态切换尺寸稳定性」

- 状态间有 border 差异 → 基础状态添加 `border: Xpx solid transparent`
- 状态间有 outline/box-shadow 差异 → 无需处理（不影响盒模型）

**文档更新**: `codegen-rules.md`

---

### ✅ Vector 节点信息冗余 (v1.6)

**Issue ID**: #vector-redundancy

**原问题**: 图标节点使用嵌套 `vector` 对象，数据冗余

**解决方案**:

1. 类型切换语义 - 图标 `type` 设为 `'ICON'`
2. 移除嵌套对象 - 尺寸统一放 `layout`
3. API 层聚合 - `assets` 自动包含所有 ICON

**涉及文件**:

- `packages/extension/utils/uiExtractor.ts`
- `packages/extension/utils/iconExtractor.ts`
- `packages/skill-server/src/utils.ts`

**文档更新**: `design-schema.md`, `api.md`, `SKILL.md`

---

### ✅ 根节点 ID 缺失 (v1.4)

**Issue ID**: #rootNodeId

**原问题**: `get_design` API 没有返回根节点 ID，截图下载困难

**解决方案**: 在响应中添加 `rootNodeId` 字段

**文档更新**: `api.md`

---

### ✅ Divider 边距信息缺失 (v1.5)

**原问题**: 使用 90% 阈值判断 `fullWidth` 过于粗糙

**解决方案**:

- 移除专门的 `Divider` 类型
- 分割线作为标准几何节点返回
- AI 通过宽高比推断语义

**参考依据**: Figma MCP - 几何事实优先

**文档更新**: `design-schema.md`

---

### ✅ 跨平台 Divider 实现差异 (v1.5)

**原问题**: `divider` 结构过于面向 Web

**解决方案**: 返回原始几何信息，代码生成层按平台实现

---

## 问题分类

| 维度         | 说明               | 相关文件             |
| ------------ | ------------------ | -------------------- |
| **结构解析** | 节点树层级、嵌套   | `uiExtractor.ts`     |
| **样式提取** | customStyle 完整性 | `styleExtractor.ts`  |
| **布局算法** | layoutMode、间距   | `layoutExtractor.ts` |
| **资源导出** | 图标、图片识别     | `iconExtractor.ts`   |
| **语义描述** | 类型标注、命名     | `uiExtractor.ts`     |

---

## 提交新问题

参考 [CONTRIBUTING.md](./CONTRIBUTING.md#issue-模板) 的 Issue 模板。jiachu
