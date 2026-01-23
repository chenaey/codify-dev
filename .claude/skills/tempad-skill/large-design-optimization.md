# 大型设计节点优化方案（V7 - 内联压缩版）

## 核心设计理念

> **性能优先：在遍历时压缩，不提取重复数据**
> **重复内容压缩：节点 + 资源都去重**
> **算法统一简单：INSTANCE 用 mainComponent.id，其他用结构签名**

---

## 性能优化核心策略

### 关键洞察

传统方案：提取所有数据 → 后处理压缩 → **性能瓶颈：getCSSAsync 调用太多**

优化方案：**在遍历过程中检测重复 → 跳过重复节点的完整提取**

```
❌ 旧方案（慢）
   遍历 50 个节点 → 提取 50 份 CSS → 压缩为 1 份
   
✅ 新方案（快）
   遍历时检测重复 → 只提取 1 份 CSS + 标记 49 个重复 ID
```

### 主线程让步（防止 UI 冻结）

```typescript
let nodeProcessedCount = 0
const YIELD_INTERVAL = 30

async function maybeYield(): Promise<void> {
  nodeProcessedCount++
  if (nodeProcessedCount % YIELD_INTERVAL === 0) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}
```

---

## 重复节点压缩（核心！）

### 数据结构理解

在 Figma/MasterGo 中：
- `COMPONENT` 是组件定义（设计师创建的可复用组件）
- `INSTANCE` 是组件实例，有 `mainComponent.id` 指向对应的 `COMPONENT`
- 所有指向同一个 `mainComponent.id` 的 INSTANCE 被视为"重复"

### 场景

```
ProductList
├── ProductCard (COMPONENT)     ← 组件定义
├── ProductCard (INSTANCE)      ← 实例，mainComponent.id = 上面的 id
├── ProductCard (INSTANCE)      ← 相同！
├── ProductCard (INSTANCE)      ← 相同！
└── ... x 20
```

### 类型定义

```typescript
// compress.ts
interface RepeatInfo {
  repeatCount: number      // 重复节点总数（包括样本）
  repeatNodeIds: string[]  // 被跳过的节点 ID（不包括样本）
}

interface RepeatPattern {
  sampleId: string         // 样本节点 ID
  repeatInfo: RepeatInfo   // 重复信息
}
```

### 签名计算

```typescript
function computeNodeSignature(node: SceneNode): string {
  // INSTANCE 节点：使用 mainComponent.id（最可靠）
  if (node.type === 'INSTANCE') {
    const mainComponentId = (node as InstanceNode).mainComponent?.id
    if (mainComponentId) {
      return `component:${mainComponentId}`
    }
  }
  
  // 其他节点：使用结构签名（type + 尺寸 + 子节点数）
  const parts = [
    node.type,
    Math.round(node.width),
    Math.round(node.height)
  ]
  if ('children' in node && Array.isArray(node.children)) {
    parts.push(node.children.length)
  }
  return `struct:${parts.join(':')}`
}
```

### 核心 API

```typescript
// 检测重复模式
function detectRepeatingPatterns(
  children: readonly SceneNode[],
  minCount = 3
): Map<string, RepeatPattern>

// 构建需要跳过的节点 ID 集合
function buildSkipIds(patterns: Map<string, RepeatPattern>): Set<string>

// 获取节点的重复信息（如果它是样本节点）
function getRepeatInfo(
  nodeId: string,
  patterns: Map<string, RepeatPattern>
): RepeatInfo | null
```

### 使用方式（在 uiExtractor.ts 中）

```typescript
if (node.children) {
  const visibleChildren = node.children.filter(c => c.visible !== false)
  
  // 检测重复模式
  const patterns = detectRepeatingPatterns(visibleChildren)
  const skipIds = buildSkipIds(patterns)
  
  for (const child of node.children) {
    // 🚀 跳过重复节点 - 不调用 getCSSAsync！
    if (skipIds.has(child.id)) continue
    
    const childNode = await extractUINode(child, ...)
    
    // 为样本节点添加重复信息
    if (childNode) {
      const repeatInfo = getRepeatInfo(child.id, patterns)
      if (repeatInfo) {
        childNode.repeatCount = repeatInfo.repeatCount
        childNode.repeatNodeIds = repeatInfo.repeatNodeIds
      }
    }
  }
}
```

### 返回示例

**场景**：1 个 COMPONENT + 9 个 INSTANCE（都指向同一个 mainComponent）

**压缩后**：
```json
{
  "children": [
    {
      "id": "362:58841",
      "type": "COMPONENT",
      // ... 组件定义的完整数据
    },
    {
      "id": "377:66257",
      "type": "INSTANCE",
      "repeatCount": 9,
      "repeatNodeIds": ["377:66238", "377:66276", "377:66219", ...],
      // ... 样本实例的完整数据（8 个被跳过）
    }
  ]
}
```

**说明**：
- `repeatCount: 9` = 共有 9 个相同的 INSTANCE
- `repeatNodeIds` = 8 个被跳过的节点 ID（不包括样本自己）
- COMPONENT 不在重复组中（签名不同）

---

## 资源去重（统一算法）

### 问题

原始 assets（60 个）：
```
1:501 → icon-star (在 ProductCard 1:201 内)
1:601 → icon-star (在 ProductCard 1:202 内)  ← 相同！
1:701 → icon-star (在 ProductCard 1:203 内)  ← 相同！
```

### 统一算法：父签名

**IMAGE 和 VECTOR 都用同一个逻辑**：

```typescript
function computeAssetSignature(node: SceneNode, ancestors: SceneNode[]): string {
  // Step 1: 基础信息
  const baseInfo = `${Math.round(node.width)}x${Math.round(node.height)}`
  
  // Step 2: 查找最近的 INSTANCE 祖先
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i]
    if (ancestor.type === 'INSTANCE') {
      const componentId = (ancestor as InstanceNode).mainComponent?.id
      if (componentId) {
        // 在组件实例内 → 用 componentId + 位置索引
        return `${baseInfo}:${componentId}:${i}`
      }
    }
  }
  
  // Step 3: 不在组件内 → 用基础信息 + 节点类型
  return `${baseInfo}:${node.type}`
}
```

---

## 元数据

```typescript
interface ExtractionMeta {
  totalNodes: number
  extractedNodes: number
  
  // 压缩统计
  compression?: {
    repeatingGroups: number    // 检测到的重复组数
    compressedNodes: number    // 压缩掉的节点数
  }
  
  // 资源统计
  assetStats?: {
    total: number
    unique: number
  }
}
```

---

## AI 工作流

```
1. get_design()
   │
   ├── 检查 node.repeatCount
   │   └── 有值 → 生成循环渲染代码
   │       例如：v-for="i in 9" 或 Array(9).map(...)
   │
   └── 检查 assets
       └── 按 representativeNodeId 下载
       └── 代码中复用同一资源
```

---

## 实现文件清单

| 文件 | 状态 | 功能 |
|------|------|------|
| `packages/extension/skill/extract/compress.ts` | ✅ 完成 | 节点签名 + 重复检测 + buildSkipIds |
| `packages/extension/utils/uiExtractor.ts` | ✅ 完成 | 内联压缩 + yield 机制 |
| `packages/extension/skill/extract/assets.ts` | 📋 待完善 | 资源签名 + AssetCollector |
| `packages/extension/skill/extract/optimized.ts` | 📋 待完善 | 提取入口 + 统计 |

---

## 与 V6 的差异

| 项目 | V6 | V7 |
|------|-----|-----|
| 压缩时机 | 提取后压缩 | 遍历时压缩 |
| 性能瓶颈 | getCSSAsync 调用多 | 跳过重复节点 |
| UI 冻结 | 可能卡死 | yield 机制 |
| 算法复杂度 | 中等 | 低 |
| repeatNodeIds 语义 | 所有节点 ID | 仅被跳过的 ID |

---

## 性能对比

| 场景 | V6 (后处理) | V7 (内联压缩) |
|------|------------|--------------|
| 50 个相同列表项 | 提取 50 次 CSS | 提取 1 次 CSS |
| 大型设计稿 (500+ 节点) | 可能卡死 | 每 30 节点 yield |
| JSON 体积 | 压缩后相同 | 压缩后相同 |
| 提取时间 | ~5s | ~1s |