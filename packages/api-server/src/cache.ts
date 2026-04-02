import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { log } from './config'

// ── Config ────────────────────────────────────────────────────
const CACHE_DIR = path.join(os.homedir(), '.tempad-dev', 'skill-cache')
const META_FILE = path.join(CACHE_DIR, 'meta.json')
const MAX_ENTRIES = 50
const FLUSH_DEBOUNCE_MS = 1000

// ── Types ─────────────────────────────────────────────────────
type CacheAction = 'skeleton' | 'design' | 'screenshot' | 'asset'

interface NodeMeta {
  fileKey: string
  nodeId: string
  cachedAt: number
  has: CacheAction[]
}

interface CacheMeta {
  version: 1
  date: string // "YYYY-MM-DD"
  lru: string[] // "fileKey:nodeId", most recent at end
  nodes: Record<string, NodeMeta>
}

// ── State ─────────────────────────────────────────────────────
let meta: CacheMeta = createEmptyMeta()
let flushTimer: NodeJS.Timeout | null = null

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function createEmptyMeta(): CacheMeta {
  return { version: 1, date: todayStr(), lru: [], nodes: {} }
}

/** Sanitise nodeId for use as directory name: `:` → `_`, `/` → `__` */
function sanitizeNodeId(nodeId: string): string {
  return nodeId.replace(/\//g, '__').replace(/:/g, '_')
}

function nodeDir(fileKey: string, nodeId: string): string {
  return path.join(CACHE_DIR, fileKey, sanitizeNodeId(nodeId))
}

function lruKey(fileKey: string, nodeId: string): string {
  return `${fileKey}:${nodeId}`
}

// ── Init / Flush ──────────────────────────────────────────────
export function initCache(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true })

  if (fs.existsSync(META_FILE)) {
    try {
      const raw = fs.readFileSync(META_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as CacheMeta
      if (parsed.date === todayStr()) {
        meta = parsed
        log.info({ entries: Object.keys(meta.nodes).length }, 'Cache loaded')
        return
      }
      // Stale date → wipe
      log.info({ old: parsed.date, today: todayStr() }, 'Cache expired, clearing')
    } catch {
      log.warn('Corrupt meta.json, resetting cache')
    }
  }

  // Fresh start: wipe data dir but keep CACHE_DIR
  clearAllDataDirs()
  meta = createEmptyMeta()
  flushMeta()
}

function clearAllDataDirs(): void {
  if (!fs.existsSync(CACHE_DIR)) return
  for (const entry of fs.readdirSync(CACHE_DIR)) {
    const full = path.join(CACHE_DIR, entry)
    if (entry === 'meta.json') continue
    if (fs.statSync(full).isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true })
    }
  }
}

function flushMeta(): void {
  if (flushTimer) return // already scheduled
  flushTimer = setTimeout(() => {
    flushTimer = null
    try {
      const tmp = META_FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf-8')
      fs.renameSync(tmp, META_FILE)
    } catch (err) {
      log.error({ err }, 'Failed to flush meta.json')
    }
  }, FLUSH_DEBOUNCE_MS)
}

// ── LRU helpers ───────────────────────────────────────────────
function touchLru(key: string): void {
  const idx = meta.lru.indexOf(key)
  if (idx > -1) meta.lru.splice(idx, 1)
  meta.lru.push(key)
}

function evictIfNeeded(): void {
  while (meta.lru.length > MAX_ENTRIES) {
    const oldest = meta.lru.shift()!
    const entry = meta.nodes[oldest]
    if (entry) {
      const dir = nodeDir(entry.fileKey, entry.nodeId)
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        /* best-effort */
      }
      delete meta.nodes[oldest]
    }
  }
}

// ── File helpers ──────────────────────────────────────────────
function actionFile(fileKey: string, nodeId: string, action: CacheAction, extra?: string): string {
  const dir = nodeDir(fileKey, nodeId)
  switch (action) {
    case 'skeleton':
      return path.join(dir, 'skeleton.json')
    case 'design':
      return path.join(dir, 'design.json')
    case 'screenshot':
      return path.join(dir, 'screenshot.jpg')
    case 'asset':
      return path.join(dir, 'assets', extra ?? 'unknown')
  }
}

function screenshotMetaFile(fileKey: string, nodeId: string): string {
  return path.join(nodeDir(fileKey, nodeId), 'screenshot.meta.json')
}

function assetManifestFile(fileKey: string, nodeId: string): string {
  return path.join(nodeDir(fileKey, nodeId), 'assets', 'manifest.json')
}

// ── Write ─────────────────────────────────────────────────────

/** Cache a JSON response (for get_design skeleton/full) */
export function putJson(
  fileKey: string,
  nodeId: string,
  action: 'skeleton' | 'design',
  data: unknown
): void {
  const file = actionFile(fileKey, nodeId, action)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data), 'utf-8')
  markCached(fileKey, nodeId, action)
}

/** Cache screenshot as binary JPG + meta */
export function putScreenshot(
  fileKey: string,
  nodeId: string,
  jpgBuffer: Buffer,
  width: number,
  height: number
): void {
  const file = actionFile(fileKey, nodeId, 'screenshot')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, jpgBuffer)
  fs.writeFileSync(screenshotMetaFile(fileKey, nodeId), JSON.stringify({ width, height }), 'utf-8')
  markCached(fileKey, nodeId, 'screenshot')
}

/** Asset manifest entry stored alongside the binary files */
export interface AssetManifestItem {
  nodeId: string
  name: string
  format: 'png' | 'svg'
  width: number
  height: number
  fileName: string // file stored in assets/ dir
  error?: { code: string; message: string }
}

/** Cache a single asset binary/text file */
export function putAsset(
  fileKey: string,
  nodeId: string,
  assetNodeId: string,
  format: 'png' | 'svg',
  data: Buffer | string,
  assetMeta: Omit<AssetManifestItem, 'fileName'>
): void {
  const fileName = `${sanitizeNodeId(assetNodeId)}.${format}`
  const dir = path.join(nodeDir(fileKey, nodeId), 'assets')
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, fileName)
  if (typeof data === 'string') {
    fs.writeFileSync(filePath, data, 'utf-8')
  } else {
    fs.writeFileSync(filePath, data)
  }

  // Update manifest
  const manifestPath = assetManifestFile(fileKey, nodeId)
  let manifest: AssetManifestItem[] = []
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch {
      /* reset */
    }
  }
  // Replace or append
  const idx = manifest.findIndex((m) => m.nodeId === assetNodeId)
  const entry: AssetManifestItem = { ...assetMeta, fileName }
  if (idx > -1) manifest[idx] = entry
  else manifest.push(entry)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  markCached(fileKey, nodeId, 'asset')
}

function markCached(fileKey: string, nodeId: string, action: CacheAction): void {
  const key = lruKey(fileKey, nodeId)
  if (!meta.nodes[key]) {
    meta.nodes[key] = { fileKey, nodeId, cachedAt: Date.now(), has: [] }
  }
  const entry = meta.nodes[key]
  if (!entry.has.includes(action)) entry.has.push(action)
  entry.cachedAt = Date.now()
  touchLru(key)
  evictIfNeeded()
  flushMeta()
}

// ── Read ──────────────────────────────────────────────────────

/** Get cached JSON (skeleton or design) */
export function getJson(
  fileKey: string,
  nodeId: string,
  action: 'skeleton' | 'design'
): unknown | null {
  const key = lruKey(fileKey, nodeId)
  const entry = meta.nodes[key]
  if (!entry || !entry.has.includes(action)) return null

  const file = actionFile(fileKey, nodeId, action)
  if (!fs.existsSync(file)) return null

  try {
    touchLru(key)
    flushMeta()
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

/** Get cached screenshot as { buffer, width, height } */
export function getScreenshot(
  fileKey: string,
  nodeId: string
): { buffer: Buffer; width: number; height: number } | null {
  const key = lruKey(fileKey, nodeId)
  const entry = meta.nodes[key]
  if (!entry || !entry.has.includes('screenshot')) return null

  const file = actionFile(fileKey, nodeId, 'screenshot')
  const metaPath = screenshotMetaFile(fileKey, nodeId)
  if (!fs.existsSync(file) || !fs.existsSync(metaPath)) return null

  try {
    const buffer = fs.readFileSync(file)
    const { width, height } = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    touchLru(key)
    flushMeta()
    return { buffer, width, height }
  } catch {
    return null
  }
}

/** Get cached single asset file */
export function getAsset(
  fileKey: string,
  nodeId: string,
  assetNodeId: string
): {
  data: Buffer | string
  format: 'png' | 'svg'
  width: number
  height: number
  name: string
} | null {
  const key = lruKey(fileKey, nodeId)
  const entry = meta.nodes[key]
  if (!entry || !entry.has.includes('asset')) return null

  const manifestPath = assetManifestFile(fileKey, nodeId)
  if (!fs.existsSync(manifestPath)) return null

  try {
    const manifest: AssetManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    const item = manifest.find((m) => m.nodeId === assetNodeId)
    if (!item || item.error) return null

    const filePath = path.join(nodeDir(fileKey, nodeId), 'assets', item.fileName)
    if (!fs.existsSync(filePath)) return null

    const data =
      item.format === 'svg' ? fs.readFileSync(filePath, 'utf-8') : fs.readFileSync(filePath)

    touchLru(key)
    flushMeta()
    return { data, format: item.format, width: item.width, height: item.height, name: item.name }
  } catch {
    return null
  }
}

// ── Preload throttle ──────────────────────────────────────────
const preloadTimestamps = new Map<string, number>()
const PRELOAD_THROTTLE_MS = 3000

export function shouldPreload(fileKey: string, nodeId: string): boolean {
  const key = lruKey(fileKey, nodeId)
  const last = preloadTimestamps.get(key) ?? 0
  const now = Date.now()
  if (now - last < PRELOAD_THROTTLE_MS) return false
  preloadTimestamps.set(key, now)
  return true
}
