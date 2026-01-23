# 复杂设计处理流程

复杂设计需要外化记忆：先写分析文件，再逐组件实现。

## 流程

1. **写入 structure.md** — 组件清单 + 布局结构
2. **存储 design.json** — 完整设计数据
3. **逐组件实现** — 每次一个，完成后更新状态
4. **组装页面** — 所有组件完成后整合

---

## 1. 写入 structure.md

将分析结果写入文件，防止遗忘：

```markdown
# 设计分析

## 组件清单

| 组件名      | 职责     | 节点 ID | 状态 |
| ----------- | -------- | ------- | ---- |
| Header      | 顶部导航 | 待定位  | ⬜   |
| ProductCard | 商品卡片 | 待定位  | ⬜   |

## 布局结构

[主要区域划分]
```

状态：⬜ 待实现 / ✅ 已完成

---

## 2. 存储 design.json

```bash
curl -s -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" -d '{}' \
  > design.json
```

---

## 3. 逐组件实现

每次只处理一个组件：

```bash
# 骨架定位
node .claude/skills/tempad-skill/scripts/query-design.cjs design.json --skeleton

# 提取子树
node .claude/skills/tempad-skill/scripts/query-design.cjs design.json --id "123:456"
```

应用 [codegen-rules.md](codegen-rules.md) 生成代码，完成后更新 structure.md 状态。

---

## 4. 组装页面

所有组件 ✅ 后，创建页面入口整合。
