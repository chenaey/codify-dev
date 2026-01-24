#!/usr/bin/env node

/**
 * query-design.cjs - 从 design.json 提取节点数据
 *
 * 用法:
 *   node query-design.cjs <file> --skeleton [--depth N]
 *   node query-design.cjs <file> --id <nodeId>
 *   node query-design.cjs <file> --path <jsonPath>
 */

const fs = require('fs')

// 参数解析
const args = process.argv.slice(2)
const opts = { file: null, skeleton: false, id: null, path: null, depth: Infinity }

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--skeleton') opts.skeleton = true
  else if (arg === '--id') opts.id = args[++i]
  else if (arg === '--path') opts.path = args[++i]
  else if (arg === '--depth') opts.depth = parseInt(args[++i], 10)
  else if (!arg.startsWith('--')) opts.file = arg
}

if (!opts.file) {
  console.error('用法: node query-design.cjs <file> [--skeleton] [--id <id>] [--path <path>] [--depth N]')
  process.exit(1)
}

// 读取 JSON
const data = JSON.parse(fs.readFileSync(opts.file, 'utf-8'))

// 骨架模式：只保留 id, type, children, repeatCount, characters(TEXT)
function toSkeleton(node, depth, maxDepth) {
  if (Array.isArray(node)) return node.map((n) => toSkeleton(n, depth, maxDepth))
  if (!node || typeof node !== 'object') return node

  const out = {}
  if (node.id) out.id = node.id
  if (node.type) out.type = node.type
  if (node.repeatCount) out.repeatCount = node.repeatCount
  if (node.type === 'TEXT' && node.text?.content) out.characters = node.text.content

  if (node.children?.length) {
    out.children =
      depth < maxDepth
        ? node.children.map((c) => toSkeleton(c, depth + 1, maxDepth))
        : `[...${node.children.length}]`
  }
  return out
}

// 按 ID 查找
function findById(nodes, id) {
  for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
    if (node.id === id) return node
    if (node.children) {
      const found = findById(node.children, id)
      if (found) return found
    }
  }
  return null
}

// 按路径提取
function getByPath(obj, path) {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce((o, k) => o?.[k], obj)
}

// 执行查询
let result = data
if (opts.id) {
  result = findById(data, opts.id)
  if (!result) {
    console.error(`未找到 ID: ${opts.id}`)
    process.exit(1)
  }
}
if (opts.path) {
  result = getByPath(data, opts.path)
  if (result == null) {
    console.error(`路径不存在: ${opts.path}`)
    process.exit(1)
  }
}
if (opts.skeleton) {
  result = toSkeleton(result, 0, opts.depth)
}

console.log(JSON.stringify(result, null, 2))