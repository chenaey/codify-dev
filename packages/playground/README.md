# UI Playground

测试 TemPad Dev 生成的 UI 组件效果。

## 项目结构

```
playground/
├── vue2/          # Vue 2 + Vite 测试环境
├── vue3/          # Vue 3 + Vite 测试环境
└── shared/        # 共享资源 (icons, images)
```

## 使用方法

### Vue 3

```bash
cd packages/playground/vue3
pnpm install
pnpm dev
```

### Vue 2

```bash
cd packages/playground/vue2
pnpm install
pnpm dev
```

## 添加新框架

1. 在 `playground/` 下创建新目录 (如 `react/`)
2. 初始化 Vite 项目
3. 配置共享资源路径别名指向 `../shared/`

## 共享资源

`shared/` 目录用于存放从 Figma/MasterGo 下载的图标和图片资源，所有框架版本共享使用。
