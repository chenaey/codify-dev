# 复杂设计处理流程

> **复杂设计必须严格按照本流程执行。**

## 流程概览

```
┌─────────────────────────────────────────────┐
│ 1. 写入分析文件                              │
│    structure.md（布局分析 + 组件清单）        │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 2. 存储设计数据                              │
│    get_design() → design.json               │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 3. 逐组件实现（循环清单）                     │
│    骨架定位 → 子树提取 → 生成代码 → 检查      │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 4. 组装页面                                  │
└─────────────────────────────────────────────┘
```

---

## 1. 写入分析文件

将 SKILL.md 步骤 2 的分析结果写入 `structure.md`，防止后续对话遗忘。

### 目录

```
{TMPDIR}/tempad-dev/{session}/
├── structure.md    # 分析结果
└── design.json     # 设计数据
```

### structure.md 格式

直接写入步骤 2 的分析内容，并添加状态跟踪列：

```markdown
# 设计分析

## 组件清单

| # | 组件名 | 职责 | 状态 |
|---|--------|------|------|
| 1 | Header | 顶部导航 | ⬜ |
| 2 | ProductCard | 商品卡片 | ⬜ |
| 3 | Footer | 底部 | ⬜ |
```

状态：⬜ 待实现 / ✅ 已完成

---

## 2. 存储设计数据

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" -d '{}' \
  > {TMPDIR}/tempad-dev/{session}/design.json
```

写入后使用查询工具按需提取。

---

## 3. 逐组件实现

按清单顺序，每个组件执行：

### 3.1 骨架定位

```bash
node .claude/skills/tempad-skill/scripts/query-design.cjs design.json --skeleton
```

找到目标节点 ID。

### 3.2 子树提取

```bash
node .claude/skills/tempad-skill/scripts/query-design.cjs design.json --id "123:456"
```

获取完整数据。

### 3.3 生成代码

应用 [codegen-rules.md](codegen-rules.md)。

### 3.4 完成检查

每个组件完成后检查：

- [ ] 样式来自 `customStyle`
- [ ] 文本来自 `text.content`
- [ ] ICON 已下载资源
- [ ] 代码可运行

更新清单状态：⬜ → ✅

---

## 4. 组装页面

所有组件完成后，整合为完整页面。

---

## query-design 工具

```bash
# 骨架
node query-design.cjs <file> --skeleton

# 按 ID
node query-design.cjs <file> --id "123:456"

# 限制深度
node query-design.cjs <file> --skeleton --depth 5
```