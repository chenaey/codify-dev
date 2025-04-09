<script setup lang="ts">
import { Repl, useStore } from '@vue/repl'
import CodeMirror from '@vue/repl/codemirror-editor'
import { onMounted, ref } from 'vue'

const props = defineProps<{
  code: string
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

onMounted(() => {
  // 设置代码文件
  store.setFiles({
    'src/App.vue': props.code
  })

  // 阻止滚动事件冒泡到外层文档
  if (previewContainer.value) {
    previewContainer.value.addEventListener('wheel', (e) => {
      e.stopPropagation()
    }, { passive: false })
  }
})
</script>

<template>
  <div class="preview-container" ref="previewContainer">
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

:deep(.vue-repl) {
  height: 100%;
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
