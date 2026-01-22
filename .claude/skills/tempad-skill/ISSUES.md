# TemPad Skill - 问题追踪

本文档追踪 D2C 过程中发现的问题，关联 [CONTRIBUTING.md](./CONTRIBUTING.md) 的迭代流程。

---

## 待处理问题

### 1. 绝对定位节点被丢弃 ⭐⭐⭐ 高优先级

**问题文件**: `packages/extension/utils/uiExtractor.ts`

**问题描述**: 
绝对定位元素被完全丢弃，导致设计还原不完整（如头像徽章、浮动按钮等）

**当前行为**:
```typescript
if (uiNode.customStyle?.['position'] === 'absolute') {
  return null  // ❌ 直接丢弃
}
```

**期望行为**:
```json
{
  "type": "FRAME",
  "layout": {
    "positioning": "absolute",
    "x": 10,
    "y": 20,
    "width": 32,
    "height": 32
  }
}
```

**参考方案**:
- Figma MCP 保留所有节点的位置信息（x, y, width, height）
- 让代码生成层决定如何处理绝对定位

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

参考 [CONTRIBUTING.md](./CONTRIBUTING.md#issue-模板) 的 Issue 模板。