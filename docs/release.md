# 发布指南

## 1. 发布 API Server (`@codify-dev/api-server`)

### 构建

```bash
cd /Users/N26950/code/agithub/tempad-dev
pnpm --filter @codify-dev/api-server build
```

### 升版本

```bash
cd packages/api-server
npm version patch   # 补丁：bug 修复
npm version minor   # 次版本：新功能
npm version major   # 主版本：不兼容变更
# 加 --no-git-tag-version 可跳过自动 git tag
```

### 检查产物

```bash
npm publish --access public --dry-run
```

### 发布

```bash
npm publish --access public
```

---

## 2. 同步 Skill 仓库 (`codify-dev-skill`)

Skill 目录 (`skill/`) 通过 `git subtree` 同步到独立仓库 [codify-dev-skill](https://github.com/chenaey/codify-dev-skill)。

### 前提

确保 `skill/` 的改动已 commit 到当前仓库：

```bash
git add skill/
git commit -m "feat: 描述你的改动"
```

### 推送

```bash
git subtree push --prefix=skill https://github.com/chenaey/codify-dev-skill.git main
```

> `git subtree` 会自动提取 `skill/` 目录相关的 commit 历史推送到目标仓库，无需手动 clone。

---

## 3. 构建浏览器扩展

```bash
pnpm build:ext
pnpm zip          # 打包为 zip 分发
```

---

## 常用检查

```bash
pnpm typecheck    # 全量类型检查
pnpm lint:fix     # lint + 自动修复
```
