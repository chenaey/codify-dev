# TemPad Skill - 插件层问题追踪

本文档记录在 D2C 过程中发现的插件层问题，用于指导后续优化。

---

## 待处理问题

### 1. Vector 节点信息冗余 ⭐ 中优先级

**问题文件**: `packages/extension/utils/uiExtractor.ts` + `iconExtractor.ts`

**当前结构** (冗余字段):
```json
{
  "type": "INSTANCE",
  "layout": { "width": 14, "height": 14 },
  "vector": {
    "id": "0:6520",
    "type": "INSTANCE",
    "name": "图标动画/展开按钮",
    "width": 14,           // 与 layout 重复
    "height": 14,          // 与 layout 重复
    "resourceId": "0:6520", // 与 id 重复
    "fileName": "icon-xxx.svg",
    "svgContent": "..."    // 用于内联
  }
}
```

**建议精简结构**:
```json
{
  "type": "ICON",
  "layout": { "width": 14, "height": 14 },
  "icon": {
    "fileName": "icon-展开按钮.svg",
    "svgContent": "..."  // 简单图标内联，否则省略
  }
}
```

**状态**: � 待处理

---

### 2. 绝对定位节点被丢弃 ⭐ 高优先级

**问题文件**: `packages/extension/utils/uiExtractor.ts`

```typescript
// 过滤掉绝对定位的节点 这个需要额外处理
if (uiNode.customStyle) {
  const isAbsolute = uiNode.customStyle['position'] === 'absolute'
  if (isAbsolute) {
    return null  // ❌ 直接丢弃
  }
}
```

**问题**: 绝对定位的元素被完全丢弃，导致设计还原不完整（如头像、徽章、浮动按钮等）

**Figma MCP 参考行为**: 
Figma MCP 不会丢弃任何节点，而是保留所有节点的位置信息（x, y, width, height），让代码生成层决定如何处理。

**建议方案**:
- 保留绝对定位节点
- 在 `layout` 中标记 `positioning: 'absolute'`
- 保留完整的 x, y 坐标信息

**状态**: � 待处理

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

### ✅ Divider 边距信息缺失 (已移除设计)

**原问题**: 使用 90% 阈值判断 `fullWidth` 过于粗糙，没有返回具体边距值

**解决方案**: 
- 移除专门的 `Divider` 类型设计
- 分割线作为标准 `RECTANGLE`/`LINE` 节点返回
- 提供精确的几何信息（width, height, x, y）
- AI 通过极端宽高比（如 313 x 0.5）推断分隔线语义

**参考依据**: Figma MCP 的设计 - 不使用语义类型，提供几何事实

---

### ✅ 跨平台 Divider 实现差异 (随上一问题解决)

**原问题**: 插件返回的 `divider` 结构过于面向 Web

**解决方案**: 返回原始几何信息，让代码生成层根据目标平台决定实现方式

---

### ✅ 根节点 ID 缺失 (v1.4)

**问题**: `get_design` API 没有返回根节点 ID，导致截图下载困难

**解决方案**: 在 API 响应中添加 `rootNodeId` 字段

---

## 问题分类标准

| 维度 | 说明 | 示例 |
|------|------|------|
| **结构解析** | 节点树的层级关系、嵌套深度、冗余节点 | 层级过深、无意义包裹节点 |
| **样式提取** | customStyle 的完整性和准确性 | 缺少边框、颜色值不准、渐变丢失 |
| **布局算法** | layoutMode、间距、对齐方式的转换 | Flex 方向错误、间距计算不准 |
| **资源导出** | 图标、图片的识别和导出 | 图标未识别、导出格式/尺寸问题 |
| **语义描述** | 节点命名、类型标注的准确性 | 类型标注错误、命名无语义 |