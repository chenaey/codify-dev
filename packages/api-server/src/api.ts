import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
  GetAssetRequest,
  GetAssetsRequest,
  GetAssetsResponse,
  GetDesignRequest,
  GetDesignResponse,
  GetScreenshotRequest,
  GetScreenshotResponse,
  SkillAction,
  SkillError,
  StatusResponse
} from './types'

import * as cache from './cache'
import { log } from './config'
import { extractIconAssets } from './utils'
import {
  callExtension,
  getActiveExtension,
  getExtensions,
  registerPreloadHandler
} from './websocket'

export const app = new Hono()

app.use('*', cors())

// Helper: create error response
function errorResponse(code: SkillError['code'], message: string) {
  return { error: { code, message } }
}

// Helper: call extension with typed response, routing by file_key (via file_key param)
async function call<T>(
  action: SkillAction,
  params: Record<string, unknown> = {}
): Promise<T | { error: SkillError }> {
  const fileKey = typeof params.file_key === 'string' ? params.file_key : undefined

  if (!fileKey && !getActiveExtension()) {
    return errorResponse('NOT_CONNECTED', 'No extension connected')
  }

  try {
    return await callExtension<T>(action, params, fileKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('timed out')) {
      return errorResponse('TIMEOUT', message)
    }
    return errorResponse('EXPORT_FAILED', message)
  }
}

// GET / — Status
app.get('/', (c) => {
  const ext = getActiveExtension()
  const extensions = getExtensions()
  const response: StatusResponse = ext
    ? {
        ready: true,
        platform: ext.info?.platform,
        activeId: ext.id,
        count: extensions.length
      }
    : { ready: false, count: extensions.length }
  return c.json(response)
})

// Helper: resolve nodeId from request params
function resolveNodeId(params: { nodeId?: string; node_id?: string }): string | undefined {
  return params.node_id || params.nodeId
}

// Helper: parse base64 data URI → Buffer
function dataUriToBuffer(dataUri: string): Buffer {
  const base64 = dataUri.split(',')[1] || dataUri
  return Buffer.from(base64, 'base64')
}

// Helper: return binary data as Response with proper headers
function binaryResponse(
  data: Buffer | string,
  contentType: string,
  headers: Record<string, string> = {}
): Response {
  const allHeaders: Record<string, string> = { 'Content-Type': contentType, ...headers }
  if (typeof data === 'string') {
    return new Response(data, { headers: allHeaders })
  }
  return new Response(new Uint8Array(data), { headers: allHeaders })
}

// POST /get_design — Get design data (JSON, with cache)
app.post('/get_design', async (c) => {
  const params = await c.req.json<GetDesignRequest>().catch(() => ({}) as GetDesignRequest)
  const fileKey = typeof params.file_key === 'string' ? params.file_key : undefined
  const nodeId = resolveNodeId(params)
  const mode = (params as Record<string, unknown>).mode === 'skeleton' ? 'skeleton' : 'design'

  // Try cache
  if (fileKey && nodeId) {
    const cached = cache.getJson(fileKey, nodeId, mode)
    if (cached) {
      log.info({ fileKey, nodeId, mode }, 'Cache hit: get_design')
      return c.json(cached)
    }
  }

  const result = await call<GetDesignResponse>('get_design', params as Record<string, unknown>)

  // Post-process: extract ICON nodes to assets
  if (result && !('error' in result) && result.design) {
    result.assets = extractIconAssets(result.design, result.assets || [])
  }

  // Write cache
  if (fileKey && nodeId && result && !('error' in result)) {
    cache.putJson(fileKey, nodeId, mode, result)
  }

  return c.json(result)
})

// POST /get_screenshot — Returns binary JPG (with cache)
app.post('/get_screenshot', async (c) => {
  const params = await c.req.json<GetScreenshotRequest>().catch(() => ({}) as GetScreenshotRequest)
  const fileKey = typeof params.file_key === 'string' ? params.file_key : undefined
  const nodeId = resolveNodeId(params)

  // Try cache
  if (fileKey && nodeId) {
    const cached = cache.getScreenshot(fileKey, nodeId)
    if (cached) {
      log.info({ fileKey, nodeId }, 'Cache hit: get_screenshot')
      return binaryResponse(cached.buffer, 'image/jpeg', {
        'X-Image-Width': String(cached.width),
        'X-Image-Height': String(cached.height)
      })
    }
  }

  // Call extension (still returns JSON with base64 internally)
  const result = await call<GetScreenshotResponse>(
    'get_screenshot',
    params as Record<string, unknown>
  )
  if ('error' in result) return c.json(result, 400)

  // Decode base64 → binary buffer
  const buffer = dataUriToBuffer(result.image)

  // Write cache
  if (fileKey && nodeId) {
    cache.putScreenshot(fileKey, nodeId, buffer, result.width, result.height)
  }

  // Return binary
  return binaryResponse(buffer, 'image/jpeg', {
    'X-Image-Width': String(result.width),
    'X-Image-Height': String(result.height)
  })
})

// POST /get_asset — Single asset, returns binary/text (with cache)
app.post('/get_asset', async (c) => {
  const params = await c.req.json<GetAssetRequest>().catch(() => ({}) as GetAssetRequest)
  const fileKey = typeof params.file_key === 'string' ? params.file_key : undefined
  const nodeId = resolveNodeId(params)
  const format = params.format || 'png'

  if (!nodeId) {
    return c.json(errorResponse('NO_SELECTION', 'node_id is required'), 400)
  }

  // Try cache (asset cache keyed by the asset's own nodeId as both nodeId and assetNodeId)
  if (fileKey) {
    const cached = cache.getAsset(fileKey, nodeId, nodeId)
    if (cached) {
      log.info({ fileKey, nodeId, format }, 'Cache hit: get_asset')
      const ct = cached.format === 'svg' ? 'image/svg+xml' : 'image/png'
      return binaryResponse(cached.data as Buffer | string, ct, {
        'X-Image-Width': String(cached.width),
        'X-Image-Height': String(cached.height),
        'X-Asset-Name': cached.name
      })
    }
  }

  // Call extension via get_assets (single node)
  const assetParams = {
    nodes: [{ nodeId, format, scale: params.scale || (format === 'png' ? 2 : 1) }],
    file_key: fileKey
  }
  const result = await call<GetAssetsResponse>('get_assets', assetParams as Record<string, unknown>)
  if ('error' in result) return c.json(result, 400)

  const asset = result.assets?.[0]
  if (!asset || asset.error) {
    const err = asset?.error || { code: 'EXPORT_FAILED', message: 'Asset export failed' }
    return c.json({ error: err }, 400)
  }

  // Convert and return binary
  if (asset.format === 'svg') {
    // SVG is plain text
    if (fileKey) {
      cache.putAsset(fileKey, nodeId, nodeId, 'svg', asset.data, {
        nodeId,
        name: asset.name,
        format: 'svg',
        width: asset.width,
        height: asset.height
      })
    }
    return binaryResponse(asset.data, 'image/svg+xml', {
      'X-Image-Width': String(asset.width),
      'X-Image-Height': String(asset.height),
      'X-Asset-Name': asset.name
    })
  }

  // PNG: decode base64 → binary
  const buffer = dataUriToBuffer(asset.data)
  if (fileKey) {
    cache.putAsset(fileKey, nodeId, nodeId, 'png', buffer, {
      nodeId,
      name: asset.name,
      format: 'png',
      width: asset.width,
      height: asset.height
    })
  }
  return binaryResponse(buffer, 'image/png', {
    'X-Image-Width': String(asset.width),
    'X-Image-Height': String(asset.height),
    'X-Asset-Name': asset.name
  })
})

// POST /get_assets — Export assets (kept for compatibility, returns JSON)
app.post('/get_assets', async (c) => {
  const params = await c.req
    .json<GetAssetsRequest>()
    .catch(() => ({ nodes: [] }) as GetAssetsRequest)
  if (!params.nodes?.length) {
    return c.json(errorResponse('NO_SELECTION', 'No nodes specified'))
  }
  const result = await call<GetAssetsResponse>(
    'get_assets',
    params as unknown as Record<string, unknown>
  )
  return c.json(result)
})

// POST /preload — Trigger cache preload for a node
app.post('/preload', async (c) => {
  const body = await c.req
    .json<{ file_key?: string; node_id?: string }>()
    .catch(() => ({}) as { file_key?: string; node_id?: string })
  const fileKey = typeof body.file_key === 'string' ? body.file_key : undefined
  const nodeId = typeof body.node_id === 'string' ? body.node_id : undefined

  if (!fileKey || !nodeId) {
    return c.json(errorResponse('NO_SELECTION', 'file_key and node_id are required'), 400)
  }

  if (!cache.shouldPreload(fileKey, nodeId)) {
    return c.json({ status: 'throttled' })
  }

  // Fire-and-forget preload
  preloadNode(fileKey, nodeId)
  return c.json({ status: 'preloading' })
})

// Background preload: fetch skeleton + design + screenshot (sequential to avoid overloading extension)
async function preloadNode(fileKey: string, nodeId: string): Promise<void> {
  const baseParams = { node_id: nodeId, file_key: fileKey }
  let succeeded = 0
  const total = 3

  // 1. Skeleton (fastest, do first)
  try {
    const r = await call<GetDesignResponse>('get_design', { ...baseParams, mode: 'skeleton' })
    if (r && 'error' in r) {
      log.warn({ fileKey, nodeId, error: r.error }, 'Preload skeleton failed')
    } else {
      cache.putJson(fileKey, nodeId, 'skeleton', r)
      succeeded++
    }
  } catch (err) {
    log.warn({ fileKey, nodeId, err: String(err) }, 'Preload skeleton rejected')
  }

  // 2. Screenshot (needs exportAsync, do before full design to avoid queue delay)
  try {
    const r = await call<GetScreenshotResponse>('get_screenshot', baseParams)
    if (r && 'error' in r) {
      log.warn({ fileKey, nodeId, error: r.error }, 'Preload screenshot failed')
    } else {
      const buffer = dataUriToBuffer(r.image)
      cache.putScreenshot(fileKey, nodeId, buffer, r.width, r.height)
      succeeded++
    }
  } catch (err) {
    log.warn({ fileKey, nodeId, err: String(err) }, 'Preload screenshot rejected')
  }

  // 3. Full design (heaviest, do last)
  try {
    const r = await call<GetDesignResponse>('get_design', { ...baseParams, mode: 'full' })
    if (r && 'error' in r) {
      log.warn({ fileKey, nodeId, error: r.error }, 'Preload design failed')
    } else {
      r.assets = extractIconAssets(r.design, r.assets || [])
      cache.putJson(fileKey, nodeId, 'design', r)
      succeeded++
    }
  } catch (err) {
    log.warn({ fileKey, nodeId, err: String(err) }, 'Preload design rejected')
  }

  log.info({ fileKey, nodeId, succeeded, total }, 'Preload complete')
}

// Register preload handler for WebSocket-based preload messages
registerPreloadHandler((fileKey, nodeId) => {
  if (!cache.shouldPreload(fileKey, nodeId)) {
    log.info({ fileKey, nodeId }, 'Preload throttled')
    return
  }
  preloadNode(fileKey, nodeId)
})

// 404
app.all('*', (c) => c.json(errorResponse('NOT_CONNECTED', 'Not found'), 404))
