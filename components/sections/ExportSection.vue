<script lang="ts" setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { selectedNode, ScaleSelectionType } from '@/ui/state'
import Button from '../Button.vue'
import Section from '../Section.vue'
import JSZip from 'jszip'


const previewUrl = ref('')
const exportableNodes = ref<{ node: SceneNode; name: string; type: string }[]>([])
const isExporting = ref(false)

// 获取可导出的节点，专注于图标类型
function getExportableNodes(
  node: SceneNode, 
  depth: number = 0,
  maxDepth: number = 15  // 限制递归深度，超过3层的节点通常不是图标
): { node: SceneNode; name: string; type: string }[] {
  const nodes: { node: SceneNode; name: string; type: string }[] = []
  
  try {
    // 超过最大深度，跳过处理
    if (depth > maxDepth) {
      return nodes
    }

    // 快速过滤：跳过不可见节点
    if ('visible' in node && node.visible === false) {
      return nodes
    }


    
    // 检查是否是图标类型的节点
    const isIconNode = 
      // 组件和实例通常是图标
      node.type === 'COMPONENT' || 
      node.type === 'INSTANCE' ||
      // 矢量通常用于图标
      node.type === 'RECTANGLE' ||
      node.type === 'VECTOR' ||
      // 图标也可能是特定名称的帧
      (node.type === 'FRAME' && (
        node.name.toLowerCase().includes('icon') || 
        node.name.toLowerCase().includes('图标') ||
        node.width === node.height // 正方形帧可能是图标
      )) ||
      // 有导出设置的通常是设计师明确要导出的
      ('exportSettings' in node && node.exportSettings.length > 0)
    
    // 将图标节点添加到列表
    if (isIconNode) {
      nodes.push({ node, name: node.name, type: node.type })
    }
    
    // 如果节点有子节点，递归检查
    if ('children' in node && node.children.length > 0) {
      // 批量处理子节点
      const childResults = node.children.map(child => 
        getExportableNodes(child, depth + 1, maxDepth)
      )
      nodes.push(...childResults.flat())
    }
  } catch (error) {
    console.error('Error getting exportable nodes:', error)
  }
  
  return nodes
}

// 监听选中节点变化，更新预览图和可导出节点列表
watch(selectedNode, async (node) => {
  if (!node) {
    previewUrl.value = ''
    exportableNodes.value = []
    return
  }
  
  try {
    // 更新预览图
    const u8Array = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    })
    const blob = new Blob([u8Array], { type: 'image/png' })
    previewUrl.value = URL.createObjectURL(blob)
    
    // 更新可导出节点列表
    exportableNodes.value = getExportableNodes(node)
  } catch (error) {
    console.error('Failed to generate preview:', error)
    previewUrl.value = ''
  }
}, { immediate: true })

// 组件卸载时清理 URL
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

// 添加导出选项设置（隐藏的默认设置）
const exportOptions = ref({
  onlyVisible: true,       // 只导出可见项
  skipGroups: true,        // 跳过Group类型
  onlyIcons: true,         // 只导出图标
  avoidDuplicates: true,   // 避免重复
})

// 获取实际要导出的节点
const filteredExportNodes = computed(() => {
  if (!exportableNodes.value.length) return []
  
  let filtered = [...exportableNodes.value]
  
  // 只保留可见节点
  if (exportOptions.value.onlyVisible) {
    filtered = filtered.filter(item => {
      return !('visible' in item.node) || item.node.visible !== false
    })
  }
  
  // 只导出图标类型
  if (exportOptions.value.onlyIcons) {
    filtered = filtered.filter(item => {
      return item.type === 'COMPONENT' || item.type === 'INSTANCE'
    })
  }
  
  // 跳过Group类型
  if (exportOptions.value.skipGroups) {
    filtered = filtered.filter(item => item.type !== 'GROUP')
  }
  
  // 去重处理
  if (exportOptions.value.avoidDuplicates) {
    const seen = new Set()
    filtered = filtered.filter(item => {
      if (seen.has(item.name)) return false
      seen.add(item.name)
      return true
    })
  }
  
  return filtered
})

// 判断节点是否适合导出为SVG
function shouldExportAsSvg(node: any): boolean {
  try {
    // 1. 检查是否包含不适合SVG的复杂效果
    const hasComplexEffects = 
      // 检查特效
      ('effects' in node && node.effects?.length > 0) ||
      // 检查混合模式
      ('blendMode' in node && node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') ||
      // 检查填充
      ('fills' in node && node.fills?.some((fill: any) => 
        fill.type === 'IMAGE' || // 图片填充
        fill.type === 'VIDEO' || // 视频填充
        fill.type === 'GRADIENT_LINEAR' || // 线性渐变
        fill.type === 'GRADIENT_RADIAL' || // 径向渐变
        fill.type === 'GRADIENT_ANGULAR' || // 角度渐变
        fill.type === 'GRADIENT_DIAMOND' // 菱形渐变
      )) ||
      // 检查描边
      ('strokes' in node && node.strokes?.some((stroke: any) =>
        stroke.type !== 'SOLID' // 非纯色描边
      )) ||
      // 检查遮罩
      ('isMask' in node && node.isMask)

    if (hasComplexEffects) {
      return false
    }

    // 2. 检查是否是简单的矢量图形
    const isSimpleVector = 
      // 基础矢量类型
      node.type === 'VECTOR' ||
      node.type === 'LINE' ||
      node.type === 'ELLIPSE' ||
      node.type === 'POLYGON' ||
      node.type === 'STAR' ||
      node.type === 'BOOLEAN_OPERATION' ||
      // 简单的矩形（无圆角或固定圆角）
      (node.type === 'RECTANGLE' && 
       (!('cornerRadius' in node) || 
        typeof node.cornerRadius === 'number'))

    if (isSimpleVector) {
      return true
    }

    // 3. 检查是否是简单的组件/实例
    if ((node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
        node.width <= 128 && 
        node.height <= 128) {
      // 检查所有子节点是否都适合SVG
      if ('children' in node) {
        return node.children.every(child => shouldExportAsSvg(child))
      }
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking SVG compatibility:', error)
    return false
  }
}

async function exportImage() {
  if (!selectedNode.value || filteredExportNodes.value.length === 0) return
  
  isExporting.value = true
  const zip = new JSZip()
  
  try {
    // 为每个节点选择最合适的格式导出
    for (const { node, name } of filteredExportNodes.value) {
      try {
        const useSvg = shouldExportAsSvg(node)
        
        if (useSvg) {
          // 导出SVG版本
          const svgArray = await node.exportAsync({
            format: 'SVG'
          })
          zip.file(`${name}.svg`, svgArray)
        } else {
          // 导出PNG版本
          const pngArray = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 }
          })
          zip.file(`${name}@2x.png`, pngArray)
        }
      } catch (error) {
        console.error(`Failed to export ${name}:`, error)
      }
    }
    
    // 生成zip文件并下载
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedNode.value.name}-export.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to create zip:', error)
  } finally {
    isExporting.value = false
  }
}
function handleFileSelectChange(select: ScaleSelectionType) {
  if (select.fileType === 'SVG') {
    select.scale = '1x'
  }
}
</script>

<template>
  <Section class="tp-export" v-if="filteredExportNodes.length">
    <template #header>
      <div class="tp-code-header tp-row tp-shrink tp-gap-l">
        Export
      </div>

    </template>
    <div class="tp-preview" v-if="previewUrl">
      <div class="tp-preview-container">
        <img 
          :src="previewUrl" 
          alt="Preview" 
          class="tp-preview-image"
        />
      </div>
    </div>

    <Button 
      class="tp-export-button" 
      @click="exportImage"
      :disabled="isExporting || filteredExportNodes.length === 0"
    >
      {{ isExporting ? 'Exporting...' : `Export ${filteredExportNodes.length} icons (@2x)` }}
    </Button>
  </Section>
</template>

<style scoped>
.tp-preview {
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.tp-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  min-height: 100px;
  max-height: 300px;
  overflow: hidden;
}

.tp-preview-image {
  max-width: 100%;
  max-height: 276px; /* 300px - 2 * 12px padding */
  object-fit: contain;
  display: block;
}

.tp-export-info {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 8px;
}

.tp-export-button {
  margin-top: 8px;
  --btn-height: 2rem;
  --btn-padding: 0 0.5rem;
  border-radius: 0.375rem;
  font-weight: var(--text-body-medium-strong-font-weight);
  letter-spacing: var(--text-body-medium-strong-letter-spacing);
  background: transparent;
  color: var(--btn-text);
  outline-width: 0.0625rem;
  outline-offset: -0.0625rem;
  outline-style: solid;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--btn-height);
  box-sizing: border-box;
  place-items: center;
  user-select: none;
}
</style>