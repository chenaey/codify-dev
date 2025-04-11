<script setup lang="ts">
import { Repl, useStore } from '@vue/repl'
import CodeMirror from '@vue/repl/codemirror-editor'
import { onMounted, ref } from 'vue'
import Button from '../Button.vue'

const props = defineProps<{
  code: string
  resources: Map<string, any>
}>()

// 自定义头部HTML，包含CSS样式
const headHTML = `
<style>
  html, body {
    margin: 0;
    padding: 0;
    display: flex;
    max-width: 750px;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    background-color: #f8f9fa;
  }
  #app {
    max-width: 375px;
    min-width: 375px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 0 8px;
  }

/*== reset start ==*/
* {
  box-sizing: border-box;
}

html,body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,h5,h6,pre,form,fieldset,input,textarea,p,blockquote,th,tr,td,section,a,input,span {
  margin: 0;
  padding: 0;
}

body {
  word-break: break-all;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  -webkit-text-size-adjust: none;
  -webkit-overflow-scrolling: auto;
  -webkit-user-select: none;
}

article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section {
  display: block;
}

iframe {
  vertical-align: bottom;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
}

fieldset,img {
  border: 0;
}

address,caption,cite,code,dfn,em,strong,th,var {
  font-style: normal;
  font-weight: normal;
}

ol,ul {
  list-style: none;
}

caption,th,td {
  text-align: center;
}

h1,h2,h3,h4,h5,h6 {
  font-size: 100%;
  font-weight: normal;
}

q:before,q:after {
  content: '';
}

input[type=button],button {
  -webkit-appearance: none;
  -webkit-user-select: none;
  margin: 0;
}

input[type=checkbox],type[type=radio] {
  width: .6rem;
  height: .6rem;
}

a,img {
  text-decoration: none;
  -webkit-touch-callout: none;
}

a,input,button,img,select,textarea {
  outline: none;
}

input[type=text],input[type=password],input[type=tel],input[type=number],input[type=search],textarea {
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

textarea {
  resize: none;
}

input::-webkit-clear-button,input::-webkit-inner-spin-button,input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

input::-webkit-search-cancel-button {
  display: none;
}

input:focus::-webkit-input-placeholder {
  opacity: 0;
}

input:invalid {
  box-shadow: none;
}

/* 可减少浏览器在用户点击屏幕时的延迟 */
a, button {
  touch-action: manipulation;
}

/*
::-webkit-scrollbar {
  display: none;
}
*/

.no-scrollbar{
  &::-webkit-scrollbar {
    display: none;
  }
}

</style>
`

const store = useStore({})
const previewContainer = ref<HTMLElement | null>(null)

// 从Figma导出图片为base64的函数
async function exportFigmaNodeToBase64(node: any): Promise<string> {
  try {
    // 获取节点的导出设置
    const settings = {
      format: 'SVG' // 或者根据需要使用 'PNG', 'JPG'
    }

    // 调用Figma API导出图片
    const response = await node.exportAsync(settings)

    // 将二进制数据转换为base64
    const base64 = btoa(
      new Uint8Array(response).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    console.log(base64, 'base64')
    // 返回完整的base64 URL
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error('Error exporting Figma node:', error)
    return ''
  }
}

// 替换代码中的图片引用为base64
async function replaceImagesWithBase64(code: string, resources: Map<string, any>): Promise<string> {
  let modifiedCode = code

  // 匹配两种格式：普通字符串和模板字符串
  const patterns = [
    /:src="require\(['"]@assets\/([^'"]+)['"]\)"/g, // 普通字符串格式
    /:src="require\(`@assets\/([^${}]+(?:\$\{[^}]+\}[^${}]*)*)`\)"/g // 模板字符串格式
  ]

  for (const pattern of patterns) {
    // 获取所有需要替换的图片
    const matches = [...code.matchAll(pattern)]
    console.log('Matches found:', matches)

    // 处理所有匹配的图片
    for (const [fullMatch, fileName] of matches) {
      console.log('Processing file:', fileName)

      // 处理包含${index}的情况
      let processedFileName = fileName
      if (fileName.includes('${index}')) {
        processedFileName = fileName.replace('${index}', '1')
      }

      // 直接从Map中获取资源
      for (const [nodeId, resource] of resources) {
        if (resource.fileName === processedFileName) {
          try {
            // 导出为base64
            const base64Data = await exportFigmaNodeToBase64(resource.node)
            console.log('Base64 generated:', !!base64Data)

            // 替换代码中的引用
            modifiedCode = modifiedCode.replace(fullMatch, `src="${base64Data}"`)
            break
          } catch (error) {
            console.error(`Error processing image ${processedFileName}:`, error)
          }
        }
      }
    }
  }

  return modifiedCode
}

async function initPreview() {
  try {
    console.log('Original code:', props.code)
    console.log('Resources:', props.resources)
    // 更新store
    store.setFiles({
      'src/App.vue': props.code
    })
  } catch (error) {
    console.error('Error in initPreview:', error)
  }
}
async function replaceImg() {
  // 替换代码中的图片引用
  const updatedCode = await replaceImagesWithBase64(props.code, props.resources)
  console.log('Updated code:', updatedCode)
  // 更新store
  store.setFiles({
    'src/App.vue': updatedCode
  })
}

onMounted(() => {
  // 阻止滚动事件冒泡到外层文档
  if (previewContainer.value) {
    previewContainer.value.addEventListener(
      'wheel',
      (e) => {
        e.stopPropagation()
      },
      { passive: false }
    )
  }
  initPreview()
})
</script>

<template>
  <div class="preview-container" ref="previewContainer">
    <div class="preview-header">
      <Button @click="replaceImg">替换图片</Button>
    </div>
    <Repl :store="store" :editor="CodeMirror" :autoResize="true" :previewOptions="{ headHTML }" />
  </div>
</template>

<style scoped>
.preview-container {
  margin: 0 auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  height: 100%; /* 改为100%高度，适应Modal容器 */
  max-height: 700px; /* 添加最大高度 */
}

.preview-header {
  display: flex;
  align-items: center;
  padding-top: 8px;
  padding-left: 8px;
  border-bottom: 1px solid var(--color-border);
}
:deep(.vue-repl) {
  height: 96%;
  width: 100%;
}
:deep(.left) {
  width: calc(100% - 400px) !important;
}
:deep(.right) {
  width: 400px !important;
}

/* 修改输出容器样式 */
:deep(.output-container) {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 修改iframe容器样式 */
:deep(.iframe-container) {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

/* 修改iframe本身的样式 */
:deep(iframe) {
  width: 375px !important;
  height: 667px !important;
  border: 1px solid var(--color-border);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
