/**
 * Skill API 测试脚本
 *
 * 使用方法:
 *   1. 启动 Skill Server: pnpm dev
 *   2. 在 Figma/MasterGo 中打开插件并连接
 *   3. 选中一个节点
 *   4. 运行测试: npx tsx scripts/test-api.ts
 *
 * 可选参数:
 *   --base-url <url> 指定 API 地址 (默认 http://127.0.0.1:13580)
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://127.0.0.1:13580'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  response?: unknown
}

const results: TestResult[] = []

// 从 get_design 响应中提取的真实 nodeId（自动获取）
let extractedNodeId: string | null = null

// Helper: 发送请求
async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json()
    return { data, error: null, status: res.status }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error', status: 0 }
  }
}

// Helper: 运行测试
async function test(
  name: string,
  fn: () => Promise<{ passed: boolean; error?: string; response?: unknown }>
): Promise<void> {
  const start = Date.now()
  try {
    const result = await fn()
    results.push({
      name,
      passed: result.passed,
      duration: Date.now() - start,
      error: result.error,
      response: result.response
    })
  } catch (err) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}

// ============================================================
// 测试用例
// ============================================================

async function runTests() {
  console.log('\n🧪 Skill API 测试\n')
  console.log(`📍 Base URL: ${BASE_URL}\n`)

  // ----------------------------------------------------------
  // 1. 状态接口测试
  // ----------------------------------------------------------

  await test('GET / - 服务状态', async () => {
    const { data, error } = await request<{
      ready: boolean
      platform?: string
      activeId?: string
      count: number
    }>('GET', '/')

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    const hasRequiredFields = 'ready' in data && 'count' in data
    if (!hasRequiredFields) {
      return { passed: false, error: 'Missing required fields', response: data }
    }

    if (!data.ready) {
      return { passed: false, error: 'Service not ready (no extension connected)', response: data }
    }

    return { passed: true, response: data }
  })

  // ----------------------------------------------------------
  // 2. get_design 测试（同时提取真实 nodeId）
  // ----------------------------------------------------------

  await test('POST /get_design - 默认选中节点', async () => {
    const { data, error } = await request<{
      design?: unknown[]
      assets?: Array<{ nodeId: string; name: string; type: string }>
      error?: { code: string; message: string }
    }>('POST', '/get_design', {})

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    const hasDesign = Array.isArray(data.design) && data.design.length > 0
    if (!hasDesign) {
      return { passed: false, error: 'Empty design data', response: data }
    }

    // 自动提取第一个 asset 的 nodeId 用于后续测试
    if (data.assets?.length) {
      extractedNodeId = data.assets[0].nodeId
    }

    return {
      passed: true,
      response: {
        designCount: data.design.length,
        assetsCount: data.assets?.length || 0,
        extractedNodeId
      }
    }
  })

  await test('POST /get_design - 无效 nodeId', async () => {
    const { data, error } = await request<{
      error?: { code: string; message: string }
    }>('POST', '/get_design', { nodeId: 'invalid-node-id-12345' })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (!data.error) {
      return { passed: false, error: 'Expected error for invalid nodeId', response: data }
    }

    if (data.error.code !== 'NODE_NOT_FOUND') {
      return { passed: false, error: `Expected NODE_NOT_FOUND, got ${data.error.code}`, response: data }
    }

    return { passed: true, response: data }
  })

  // 使用提取的真实 nodeId 测试
  await test('POST /get_design - 指定真实 nodeId', async () => {
    if (!extractedNodeId) {
      return { passed: false, error: 'No nodeId extracted from previous test' }
    }

    const { data, error } = await request<{
      design?: unknown[]
      error?: { code: string; message: string }
    }>('POST', '/get_design', { nodeId: extractedNodeId })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    return { passed: true, response: { nodeId: extractedNodeId, designCount: data.design?.length || 0 } }
  })

  // ----------------------------------------------------------
  // 3. get_screenshot 测试
  // ----------------------------------------------------------

  await test('POST /get_screenshot - 默认选中节点', async () => {
    const { data, error } = await request<{
      image?: string
      width?: number
      height?: number
      error?: { code: string; message: string }
    }>('POST', '/get_screenshot', {})

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    if (!data.image?.startsWith('data:image/png;base64,')) {
      return { passed: false, error: 'Invalid image format', response: { image: data.image?.slice(0, 50) } }
    }

    const imageSize = Math.round((data.image.length * 3) / 4 / 1024)
    return {
      passed: true,
      response: { width: data.width, height: data.height, sizeKB: imageSize }
    }
  })

  await test('POST /get_screenshot - 无效 nodeId', async () => {
    const { data, error } = await request<{
      error?: { code: string; message: string }
    }>('POST', '/get_screenshot', { nodeId: 'invalid-node-id-12345' })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (!data.error) {
      return { passed: false, error: 'Expected error for invalid nodeId', response: data }
    }

    if (data.error.code !== 'NODE_NOT_FOUND') {
      return { passed: false, error: `Expected NODE_NOT_FOUND, got ${data.error.code}`, response: data }
    }

    return { passed: true, response: data }
  })

  await test('POST /get_screenshot - 指定真实 nodeId', async () => {
    if (!extractedNodeId) {
      return { passed: false, error: 'No nodeId extracted from previous test' }
    }

    const { data, error } = await request<{
      image?: string
      width?: number
      height?: number
      error?: { code: string; message: string }
    }>('POST', '/get_screenshot', { nodeId: extractedNodeId })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    return { passed: true, response: { nodeId: extractedNodeId, width: data.width, height: data.height } }
  })

  // ----------------------------------------------------------
  // 4. get_assets 测试
  // ----------------------------------------------------------

  await test('POST /get_assets - 空数组', async () => {
    const { data, error } = await request<{
      error?: { code: string; message: string }
    }>('POST', '/get_assets', { nodes: [] })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (!data.error) {
      return { passed: false, error: 'Expected error for empty nodes array', response: data }
    }

    if (data.error.code !== 'NO_SELECTION') {
      return { passed: false, error: `Expected NO_SELECTION, got ${data.error.code}`, response: data }
    }

    return { passed: true, response: data }
  })

  await test('POST /get_assets - 无效 nodeId', async () => {
    const { data, error } = await request<{
      error?: { code: string; message: string }
    }>('POST', '/get_assets', {
      nodes: [{ nodeId: 'invalid-node-id-12345', format: 'png' }]
    })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (!data.error) {
      return { passed: false, error: 'Expected error for invalid nodeId', response: data }
    }

    if (data.error.code !== 'NODE_NOT_FOUND') {
      return { passed: false, error: `Expected NODE_NOT_FOUND, got ${data.error.code}`, response: data }
    }

    return { passed: true, response: data }
  })

  await test('POST /get_assets - PNG 格式 (真实节点)', async () => {
    if (!extractedNodeId) {
      return { passed: false, error: 'No nodeId extracted from previous test' }
    }

    const { data, error } = await request<{
      assets?: Array<{
        nodeId: string
        name: string
        format: string
        width: number
        height: number
        data: string
      }>
      error?: { code: string; message: string }
    }>('POST', '/get_assets', {
      nodes: [{ nodeId: extractedNodeId, format: 'png', scale: 2 }]
    })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    if (!data.assets?.length) {
      return { passed: false, error: 'No assets returned', response: data }
    }

    const asset = data.assets[0]
    const isPng = asset.data?.startsWith('data:image/png;base64,')
    return {
      passed: isPng,
      error: isPng ? undefined : 'Invalid PNG data',
      response: {
        nodeId: asset.nodeId,
        name: asset.name,
        format: asset.format,
        size: `${asset.width}x${asset.height}`
      }
    }
  })

  await test('POST /get_assets - SVG 格式 (真实节点)', async () => {
    if (!extractedNodeId) {
      return { passed: false, error: 'No nodeId extracted from previous test' }
    }

    const { data, error } = await request<{
      assets?: Array<{
        nodeId: string
        name: string
        format: string
        width: number
        height: number
        data: string
      }>
      error?: { code: string; message: string }
    }>('POST', '/get_assets', {
      nodes: [{ nodeId: extractedNodeId, format: 'svg' }]
    })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    if (!data.assets?.length) {
      return { passed: false, error: 'No assets returned', response: data }
    }

    const asset = data.assets[0]
    const isSvg = asset.data?.startsWith('<svg') || asset.data?.includes('xmlns')
    return {
      passed: isSvg,
      error: isSvg ? undefined : 'Invalid SVG data',
      response: {
        nodeId: asset.nodeId,
        name: asset.name,
        format: asset.format,
        size: `${asset.width}x${asset.height}`,
        dataPreview: asset.data?.slice(0, 80) + '...'
      }
    }
  })

  await test('POST /get_assets - 批量导出 (PNG + SVG)', async () => {
    if (!extractedNodeId) {
      return { passed: false, error: 'No nodeId extracted from previous test' }
    }

    const { data, error } = await request<{
      assets?: Array<{
        nodeId: string
        name: string
        format: string
        width: number
        height: number
      }>
      error?: { code: string; message: string }
    }>('POST', '/get_assets', {
      nodes: [
        { nodeId: extractedNodeId, format: 'png', scale: 1 },
        { nodeId: extractedNodeId, format: 'svg' }
      ]
    })

    if (error) return { passed: false, error }
    if (!data) return { passed: false, error: 'No response data' }

    if (data.error) {
      return { passed: false, error: `${data.error.code}: ${data.error.message}`, response: data }
    }

    if (data.assets?.length !== 2) {
      return { passed: false, error: `Expected 2 assets, got ${data.assets?.length || 0}`, response: data }
    }

    return {
      passed: true,
      response: data.assets.map((a) => ({ nodeId: a.nodeId, format: a.format, size: `${a.width}x${a.height}` }))
    }
  })

  // ----------------------------------------------------------
  // 5. 404 测试
  // ----------------------------------------------------------

  await test('GET /unknown - 404 处理', async () => {
    const { status } = await request<unknown>('GET', '/unknown-endpoint')

    if (status !== 404) {
      return { passed: false, error: `Expected 404, got ${status}` }
    }

    return { passed: true, response: { status } }
  })

  // ----------------------------------------------------------
  // 输出结果
  // ----------------------------------------------------------

  console.log('\n📊 测试结果\n')
  console.log('─'.repeat(60))

  let passed = 0
  let failed = 0

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    const status = result.passed ? 'PASS' : 'FAIL'
    console.log(`${icon} ${status} | ${result.name} (${result.duration}ms)`)

    if (result.response) {
      console.log(`   └─ ${JSON.stringify(result.response)}`)
    }
    if (result.error && !result.passed) {
      console.log(`   └─ Error: ${result.error}`)
    }

    if (result.passed) passed++
    else failed++
  }

  console.log('─'.repeat(60))
  console.log(`\n📈 总计: ${passed} 通过, ${failed} 失败, 共 ${results.length} 个测试\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

// 运行测试
runTests().catch((err) => {
  console.error('测试运行失败:', err)
  process.exit(1)
})