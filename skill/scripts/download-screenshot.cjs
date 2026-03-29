/**
 * 截图下载脚本 - 从 Codify Dev API Server 下载节点截图
 *
 * 使用方法:
 *   node download-screenshot.cjs --nodeId "317:03206" --fileKey "131" --output "/path/to/screenshot.png"
 *
 * 参数:
 *   --nodeId     节点 ID (可选，不传则使用当前选中节点)
 *   --fileKey   文件 Key (必需)
 *   --output     输出文件完整路径 (必需)
 *
 * 示例:
 *   node download-screenshot.cjs --output "/project/src/assets/screenshot.png"
 *   node download-screenshot.cjs --nodeId "317:03206" --output "/project/src/assets/screenshot.png"
 *
 * 输出:
 *   ✓ /project/src/assets/screenshot.png (800x600)
 *
 * 错误输出:
 *   Error: NOT_CONNECTED - 无法连接到 Skill Server
 */

var fs = require('fs')
var http = require('http')
var path = require('path')

// 解析命令行参数
function parseArgs() {
  var args = process.argv.slice(2)
  var result = { nodeId: null, fileKey: null, output: null }

  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--nodeId' && args[i + 1]) {
      result.nodeId = args[i + 1]
      i++
    } else if (args[i] === '--fileKey' && args[i + 1]) {
      result.fileKey = args[i + 1]
      i++
    } else if (args[i] === '--output' && args[i + 1]) {
      result.output = args[i + 1]
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

// 主函数
async function main() {
  var args = parseArgs()

  if (!args.output) {
    console.log('Error: INVALID_PARAMS - 缺少 --output 参数')
    process.exit(1)
  }

  // 调用 API
  var response
  try {
    var params = {}
    if (args.nodeId) params.nodeId = args.nodeId
    if (args.fileKey) params.file_key = args.fileKey
    response = await postRequest('/get_screenshot', params)
  } catch (e) {
    console.log('Error: NOT_CONNECTED - 无法连接到 Skill Server')
    process.exit(1)
  }

  if (response.error) {
    console.log('Error: ' + response.error.code + ' - ' + response.error.message)
    process.exit(1)
  }

  // 保存截图（自动修正扩展名以匹配实际图片格式）
  try {
    ensureDir(args.output)
    var parts = response.image.split(',')
    var base64Data = parts[1]
    // 从 data URI 提取实际 MIME 类型，如 data:image/jpeg;base64
    var mimeMatch = parts[0].match(/data:image\/(\w+)/)
    var actualExt = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'png'
    // 修正输出路径扩展名
    var outputExt = path.extname(args.output).slice(1).toLowerCase()
    var outputPath = args.output
    if (outputExt !== actualExt && outputExt !== (actualExt === 'jpg' ? 'jpeg' : '')) {
      outputPath = args.output.replace(/\.[^.]+$/, '.' + actualExt)
    }
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'))
    console.log('✓ ' + outputPath + ' (' + response.width + 'x' + response.height + ')')
  } catch (e) {
    console.log('Error: SAVE_FAILED - ' + e.message)
    process.exit(1)
  }
}

main()
