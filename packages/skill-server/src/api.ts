import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
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

import { callExtension, getActiveExtension, getExtensions } from './websocket'

export const app = new Hono()

app.use('*', cors())

// Helper: create error response
function errorResponse(code: SkillError['code'], message: string) {
  return { error: { code, message } }
}

// Helper: call extension with typed response
async function call<T>(action: SkillAction, params: unknown = {}): Promise<T | { error: SkillError }> {
  const ext = getActiveExtension()
  if (!ext) {
    return errorResponse('NOT_CONNECTED', 'No extension connected')
  }

  try {
    return await callExtension<T>(action, params)
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

// POST /get_design — Get design data
app.post('/get_design', async (c) => {
  const params = await c.req.json<GetDesignRequest>().catch(() => ({}))
  const result = await call<GetDesignResponse>('get_design', params)
  return c.json(result)
})

// POST /get_screenshot — Get screenshot
app.post('/get_screenshot', async (c) => {
  const params = await c.req.json<GetScreenshotRequest>().catch(() => ({}))
  const result = await call<GetScreenshotResponse>('get_screenshot', params)
  return c.json(result)
})

// POST /get_assets — Export assets
app.post('/get_assets', async (c) => {
  const params = await c.req.json<GetAssetsRequest>().catch(() => ({ nodes: [] }))
  if (!params.nodes?.length) {
    return c.json(errorResponse('NO_SELECTION', 'No nodes specified'))
  }
  const result = await call<GetAssetsResponse>('get_assets', params)
  return c.json(result)
})

// 404
app.all('*', (c) => c.json(errorResponse('NOT_CONNECTED', 'Not found'), 404))