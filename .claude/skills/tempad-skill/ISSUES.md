# TemPad Skill - 问题追踪

本文档追踪 D2C 过程中发现的问题，关联 [CONTRIBUTING.md](./CONTRIBUTING.md) 的迭代流程。

---

## 待处理问题

### 1. 绝对定位节点信息缺失 ⭐⭐⭐ 高优先级

**问题文件**: `packages/extension/utils/uiExtractor.ts`

**问题描述**: 
`layoutPositioning: "ABSOLUTE"` 的节点信息在提取过程中被丢弃。

**原始数据**（已确认存在）:
```json
{
  "id": "0:5756",
  "layoutPositioning": "ABSOLUTE",
  "constraints": { "horizontal": "END", "vertical": "START" },
  "x": 339, "y": 3,
  "width": 16, "height": 16
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
    "x": 339, "y": 3,
    "width": 16, "height": 16
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

| 维度 | 说明 | 相关文件 |
|------|------|---------|
| **结构解析** | 节点树层级、嵌套 | `uiExtractor.ts` |
| **样式提取** | customStyle 完整性 | `styleExtractor.ts` |
| **布局算法** | layoutMode、间距 | `layoutExtractor.ts` |
| **资源导出** | 图标、图片识别 | `iconExtractor.ts` |
| **语义描述** | 类型标注、命名 | `uiExtractor.ts` |

---

## 提交新问题

参考 [CONTRIBUTING.md](./CONTRIBUTING.md#issue-模板) 的 Issue 模板。jiachu