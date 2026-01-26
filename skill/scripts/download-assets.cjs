/**
 * 资源下载脚本 - 从 Codify Dev API Server 下载设计资源
 *
 * 使用方法:
 *   node download-assets.cjs --nodes '<JSON数组>'
 *
 * 参数:
 *   --nodes   JSON 数组，每个元素包含:
 *             - nodeId: 节点 ID (必需)
 *             - outputPath: 输出文件完整路径 (必需)
 *             - format: 'svg' | 'png' | 'jpg' | 'webp' (可选，默认 'png')
 *             - scale: 缩放比例 (可选，默认 1)
 *
 * 示例:
 *   node download-assets.cjs --nodes '[
 *     {"nodeId":"0:123","outputPath":"/project/src/icons/arrow.svg","format":"svg"},
 *     {"nodeId":"0:456","outputPath":"/project/src/images/bg.png","format":"png","scale":2}
 *   ]'
 *
 * 输出 (MCP 风格文本):
 *   Downloaded 2 assets (2 success, 0 failed):
 *     ✓ /project/src/icons/arrow.svg (24x24)
 *     ✓ /project/src/images/bg.png (48x48)
 *
 * 部分失败时:
 *   Downloaded 2 assets (1 success, 1 failed):
 *     ✓ /project/src/icons/arrow.svg (24x24)
 *     ✗ /project/src/images/bg.png - NODE_NOT_FOUND: Node "0:456" not found
 *
 * 错误输出:
 *   Error: NOT_CONNECTED - 无法连接到 Skill Server
 */

var fs = require('fs')
var http = require('http')
var path = require('path')

var BASE_URL = 'http://127.0.0.1:13580'

// 解析命令行参数
function parseArgs() {
  var args = process.argv.slice(2)
  var result = { nodes: null }

  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--nodes' && args[i + 1]) {
      try {
        result.nodes = JSON.parse(args[i + 1])
      } catch (e) {
        console.log('Error: INVALID_PARAMS - --nodes 参数不是有效的 JSON')
        process.exit(1)
      }
      i++
    }
  }

  return result
}

// 发送 HTTP POST 请求
function postRequest(urlPath, body) {
  return new Promise(function (resolve, reject) {
    var postData = JSON.stringify(body)
    var options = {
      hostname: '127.0.0.1',
      port: 13580,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    var req = http.request(options, function (res) {
      var chunks = []
      res.on('data', function (chunk) {
        chunks.push(chunk)
      })
      res.on('end', function () {
        var data = Buffer.concat(chunks).toString()
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', function (e) {
      reject(e)
    })

    req.write(postData)
    req.end()
  })
}

// 确保目录存在
function ensureDir(filePath) {
  var dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// 保存资源到文件
function saveAsset(asset, outputPath) {
  ensureDir(outputPath)

  var data = asset.data

  // 处理 base64 数据
  if (data.startsWith('data:')) {
    var base64Data = data.split(',')[1]
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'))
  } else {
    // SVG 是纯文本
    fs.writeFileSync(outputPath, data, 'utf8')
  }
}

// 主函数
async function main() {
  var args = parseArgs()

  // 验证参数
  if (!args.nodes || !Array.isArray(args.nodes) || args.nodes.length === 0) {
    console.log('Error: INVALID_PARAMS - --nodes 必须是非空 JSON 数组')
    process.exit(1)
  }

  // 验证每个节点的必需字段
  for (var i = 0; i < args.nodes.length; i++) {
    var node = args.nodes[i]
    if (!node.nodeId) {
      console.log('Error: INVALID_PARAMS - nodes[' + i + '] 缺少 nodeId')
      process.exit(1)
    }
    if (!node.outputPath) {
      console.log('Error: INVALID_PARAMS - nodes[' + i + '] 缺少 outputPath')
      process.exit(1)
    }
  }

  // 构建请求体
  var requestNodes = args.nodes.map(function (node) {
    return {
      nodeId: node.nodeId,
      format: node.format || 'png',
      scale: node.scale || 1
    }
  })

  // 调用 API
  var response
  try {
    response = await postRequest('/get_assets', { nodes: requestNodes })
  } catch (e) {
    console.log('Error: NOT_CONNECTED - 无法连接到 Skill Server (' + BASE_URL + ')')
    console.log('请确保 Codify Dev 扩展已连接')
    process.exit(1)
  }

  // 处理全局错误响应（如连接问题）
  if (response.error) {
    console.log('Error: ' + response.error.code + ' - ' + response.error.message)
    process.exit(1)
  }

  // 处理资源列表
  var assets = response.assets || []
  var summary = response.summary || { total: assets.length, success: 0, failed: 0 }
  var downloaded = []
  var failed = []

  for (var i = 0; i < assets.length; i++) {
    var asset = assets[i]
    var outputPath = args.nodes[i].outputPath

    // 检查单个资源是否有错误
    if (asset.error) {
      failed.push({
        path: outputPath,
        nodeId: asset.nodeId,
        error: asset.error
      })
      continue
    }

    // 尝试保存资源
    try {
      saveAsset(asset, outputPath)
      downloaded.push({
        path: outputPath,
        width: asset.width,
        height: asset.height
      })
    } catch (e) {
      failed.push({
        path: outputPath,
        nodeId: asset.nodeId,
        error: {
          code: 'SAVE_FAILED',
          message: e.message
        }
      })
    }
  }

  // 输出结果 (MCP 风格)
  var totalCount = downloaded.length + failed.length
  if (totalCount === 0) {
    console.log('No assets to download')
    return
  }

  console.log(
    'Downloaded ' +
      totalCount +
      ' assets (' +
      downloaded.length +
      ' success, ' +
      failed.length +
      ' failed):'
  )

  // 输出成功的资源
  downloaded.forEach(function (item) {
    console.log('  ✓ ' + item.path + ' (' + item.width + 'x' + item.height + ')')
  })

  // 输出失败的资源
  failed.forEach(function (item) {
    console.log('  ✗ ' + item.path + ' - ' + item.error.code + ': ' + item.error.message)
  })

  // 如果有失败，退出码为 1（但不是完全失败）
  if (failed.length > 0 && downloaded.length === 0) {
    // 全部失败
    process.exit(1)
  } else if (failed.length > 0) {
    // 部分失败，退出码为 0（允许继续流程），但输出警告
    console.log('')
    console.log('Warning: ' + failed.length + ' asset(s) failed to download')
  }
}

main()