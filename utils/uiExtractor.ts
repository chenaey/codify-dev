import { options, activePlugin } from '@/ui/state'

import { codegen } from './codegen'
import { getDesignComponent } from './component'
import { getComponentMapping } from './componentMap'
import {
  isIconNode,
  extractVectorData,
} from './iconExtractor'
import { generateUniqueIconName } from './iconNaming'
import { toDecimalPlace } from './index'

// 添加布局模式类型
type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL'

// UI Node 类型定义
interface UINode {
  id: string
  name: string
  type: string
  // 自定义组件信息
  custom_component?: {
    name: string // 组件名称（如 ProductItem）
    importPath: string // 导入路径
    description?: string // 组件描述
    props?: string[] // 组件支持的属性列表
  }
  layout: {
    x?: number // 布局x坐标
    y?: number // 布局y坐标
    width?: number | '100%' // 布局宽度
    height?: number | '100%' // 布局高度
    layoutMode: LayoutMode // 改为必填，永远会有值
    layoutAlign?: string // 布局对齐方式 (STRETCH | CENTER | MIN | MAX)
    padding?: {
      top: number
      right: number
      bottom: number
      left: number
    }
    margin?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
  }
  style?: {
    fills?: Array<{
      type: string
      color?: string
      opacity?: number
      visible?: boolean
      blendMode?: string
    }>
    strokes?: Array<{
      type: string
      color: string
      width: number
      position?: string
    }>
    effects?: Array<{
      type: string
      color?: string
      offset?: { x: number; y: number }
      radius?: number
      visible?: boolean
    }>
    cornerRadius?:
    | number
    | {
      topLeft: number
      topRight: number
      bottomRight: number
      bottomLeft: number
    }
  }
  text?: {
    content: string
    fontSize: number
    fontFamily: string
    fontWeight: number
    letterSpacing: number
    lineHeight: number | { value: number; unit: string }
    textAlignHorizontal: string
    textAlignVertical: string
    textCase?: string
    textDecoration?: string
  }
  // 矢量/图标信息
  vector?: {
    id: string
    resourceId?: string
    name?: string // 添加name属性
    type: string
    width: number
    height: number
    fileName?: string
    svgContent?: string // SVG原始内容，用于直接导出
  }
  children?: UINode[]
  // 添加自定义样式字段
  customStyle?: string[]

  // 分割线数据，用于生成水平或垂直分隔线
  divider?: {
    // 分割线方向：horizontal生成<hr>，vertical生成带role="separator"的<div>
    orientation: 'horizontal' | 'vertical'
    // 分割线样式
    style: {
      // 分割线颜色，用于border-color
      color: string
      // 分割线粗细，用于border-width
      thickness: number
      // 线条样式，用于border-style
      lineStyle?: 'solid' | 'dashed' | 'dotted'
    }
    // 分割线布局
    layout: {
      // // 边距信息，用于生成margin
      // margin: {
      //   top?: number    // 上边距，用于margin-top
      //   right?: number  // 右边距，用于margin-right
      //   bottom?: number // 下边距，用于margin-bottom
      //   left?: number   // 左边距，用于margin-left
      // }
      // 是否全宽，true表示width:100%
      fullWidth?: boolean
      // 是否全高，true表示height:100%
      fullHeight?: boolean
    }
  }
}

// 提取颜色信息
export function extractColor(color: { r: number; g: number; b: number; a?: number }) {
  if (!color) return 'null'
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255
  )}, ${color.a ?? 1})`
}

// 提取填充信息
function extractFills(node: any) {
  if (!('fills' in node) || !node.fills || !Array.isArray(node.fills)) return undefined
  return node.fills
    .filter((fill: any) => fill.visible !== false)
    .map((fill: any) => {
      const base = {
        type: fill.type,
        visible: fill.visible !== false,
        opacity: fill.opacity,
        blendMode: fill.blendMode
      }

      if (fill.type === 'SOLID') {
        return {
          ...base,
          color: extractColor(fill.color)
        }
      }

      // 其他类型的填充（如渐变）可以在这里扩展
      return base
    })
}

// 提取描边信息
function extractStrokes(node: any) {
  if (!('strokes' in node) || !node.strokes) return undefined

  return node.strokes
    .filter((stroke: any) => stroke?.visible !== false && stroke?.color)
    .map((stroke: any) => ({
      type: stroke.type,
      color: extractColor(stroke.color),
      width: node.strokeWeight,
      position: node.strokeAlign
    }))
}

// 提取效果信息
function extractEffects(node: any) {
  if (!('effects' in node) || !node.effects) return undefined

  return node.effects
    .filter((effect: any) => effect.visible !== false)
    .map((effect: any) => {
      const base = {
        type: effect.type,
        visible: effect.visible !== false
      }

      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        return {
          ...base,
          color: extractColor(effect.color),
          offset: { x: effect.offset.x, y: effect.offset.y },
          radius: effect.radius
        }
      }

      if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
        return {
          ...base,
          radius: effect.radius
        }
      }

      return base
    })
}

// 提取圆角信息
function extractCornerRadius(node: any) {
  if (!('cornerRadius' in node)) return undefined

  if (typeof node.cornerRadius === 'number') {
    return node.cornerRadius
  }

  if (
    node.topLeftRadius ||
    node.topRightRadius ||
    node.bottomRightRadius ||
    node.bottomLeftRadius
  ) {
    return {
      topLeft: node.topLeftRadius || 0,
      topRight: node.topRightRadius || 0,
      bottomRight: node.bottomRightRadius || 0,
      bottomLeft: node.bottomLeftRadius || 0
    }
  }

  return undefined
}

// 提取文本信息
function extractText(node: any) {
  if (node.type !== 'TEXT') return undefined

  return {
    content: node.characters,
    fontSize: node.fontSize,
    // fontFamily: node.fontName?.family,
    fontWeight: node.fontName?.style,
    letterSpacing: node.letterSpacing?.value || 0,
    lineHeight:
      typeof node.lineHeight === 'number'
        ? node.lineHeight
        : { value: node.lineHeight?.value || 0, unit: node.lineHeight?.unit || 'AUTO' },
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textCase: node.textCase,
    textDecoration: node.textDecoration
  }
}

// 判断是否需要添加宽高信息
const shouldAddWidthHeight = (node: any) => {
  // 1. 检查是否为容器类型
  const isContainer = ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'TEXT'].includes(node.type)

  // 2. 检查是否有自动布局
  const hasAutoLayout = node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL'

  // 3. 检查约束条件
  const hasFlexibleConstraints =
    node.constraints?.horizontal === 'SCALE' ||
    node.constraints?.vertical === 'SCALE' ||
    node.constraints?.horizontal === 'STRETCH' ||
    node.constraints?.vertical === 'STRETCH'
    
  // 返回判断结果
  return isIconNode(node) || (!isContainer && !hasAutoLayout && !hasFlexibleConstraints)
}

// 获取节点位置的通用函数（优先使用绝对坐标）
function getNodePosition(node: any) {
  return {
    x: node.absoluteRenderBounds?.x || node.absoluteBoundingBox?.x || node.x,
    y: node.absoluteRenderBounds?.y || node.absoluteBoundingBox?.y || node.y,
    width: node.absoluteRenderBounds?.width || node.absoluteBoundingBox?.width || node.width,
    height: node.absoluteRenderBounds?.height || node.absoluteBoundingBox?.height || node.height
  }
}

// 获取节点的布局模式
function getLayoutMode(node: any): LayoutMode {
  // 1. 如果节点显式设置了layoutMode，使用设置的值
  if ('layoutMode' in node && node.layoutMode) {
    return node.layoutMode as LayoutMode
  }
  return 'NONE'
}

// 判断是否需要计算margin
function shouldCalculateMargin(node: any, parent: any): boolean {
  // 1. 父节点必须是自动布局容器
  if (getLayoutMode(parent) === 'NONE') return false

  // 2. 节点不能是绝对定位
  if (node.position === 'ABSOLUTE') return false

  // 3. 父节点必须设置了itemSpacing
  if (parent.itemSpacing === undefined) return false

  // 4. 父节点必须有多个子元素
  const visibleSiblings = (parent.children || []).filter((child: any) => 
    child.visible !== false
  )
  if (visibleSiblings.length <= 1) return false

  return true
}

// 获取排序后的兄弟节点
function getSortedSiblings(siblings: any[], layoutMode: LayoutMode): any[] {
  return [...siblings].sort((a, b) => {
    const posA = getNodePosition(a)
    const posB = getNodePosition(b)
    return layoutMode === 'HORIZONTAL' ? posA.x - posB.x : posA.y - posB.y
  })
}

// 计算实际间距
function calculateActualSpacing(currentNode: any, nextNode: any): number {
  const currentPos = getNodePosition(currentNode)
  const nextPos = getNodePosition(nextNode)

  // 考虑padding的影响
  const currentPadding = currentNode.padding || {}
  const nextPadding = nextNode.padding || {}

  if (currentNode.parent?.layoutMode === 'HORIZONTAL') {
    return toDecimalPlace(
      nextPos.x - (currentPos.x + currentPos.width) -
      (currentPadding.right || 0) - (nextPadding.left || 0)
    )
  }

  return toDecimalPlace(
    nextPos.y - (currentPos.y + currentPos.height) -
    (currentPadding.bottom || 0) - (nextPadding.top || 0)
  )
}

// 计算margin
function calculateMargin(node: any, siblings: any[], parent: any) {
  if (!shouldCalculateMargin(node, parent)) return null

  // 过滤掉隐藏的兄弟节点
  const visibleSiblings = siblings.filter(sibling => sibling.visible !== false)
  
  // 获取节点在可见兄弟中的位置
  const sortedSiblings = getSortedSiblings(visibleSiblings, parent.layoutMode as LayoutMode)
  const nodeIndex = sortedSiblings.findIndex(s => s.id === node.id)
  
  // 最后一个元素不需要margin
  if (nodeIndex === sortedSiblings.length - 1) return null

  // 使用父节点的itemSpacing作为margin值
  const marginValue = parent.itemSpacing

  if (marginValue <= 0) return null

  // 根据布局方向设置对应的margin
  return {
    ...(parent.layoutMode === 'HORIZONTAL' 
      ? { right: marginValue }
      : { bottom: marginValue }
    )
  }
}

// 提取布局信息
function extractLayout(node: any, parent?: any, siblings?: any[], rootNode?: any) {
  let relativeX, relativeY

  // 获取当前节点和根节点的位置
  const nodePos = getNodePosition(node)

  if (rootNode) {
    // 计算相对于根节点的坐标
    const rootPos = getNodePosition(rootNode)
    relativeX = nodePos.x - rootPos.x
    relativeY = nodePos.y - rootPos.y
  } else {
    // 如果没有根节点，使用原始坐标
    relativeX = nodePos.x
    relativeY = nodePos.y
  }

  const layout: UINode['layout'] = {
    x: toDecimalPlace(relativeX),
    y: toDecimalPlace(relativeY),
    layoutMode: getLayoutMode(node)
  }

  // 根据判断结果添加宽高
  if (shouldAddWidthHeight(node)) {
    layout.width = toDecimalPlace(nodePos.width)
    layout.height = toDecimalPlace(nodePos.height)
  } else {
    layout.width = '100%'
  }


  if ('layoutAlign' in node) {
    layout.layoutAlign = node.layoutAlign
  }

  // 对于容器节点，保留 padding 信息以便于布局
  if (
    'paddingTop' in node ||
    'paddingRight' in node ||
    'paddingBottom' in node ||
    'paddingLeft' in node
  ) {
    layout.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    }
  }

  // 计算margin
  if (siblings?.length && parent) {
    const margin = calculateMargin(node, siblings, parent)
    if (margin) {
      layout.margin = margin
    }
  }

  return layout
}

// 提取自定义组件信息
function extractCustomComponent(node: any) {
  if (!node?.name) return undefined

  // 获取组件映射
  const mapping = getComponentMapping(node.name)
  if (!mapping) return undefined

  return {
    ...mapping
  }
}

// 检测节点是否为分割线
function isDivider(node: any): boolean {
  // 条件1: 明确的LINE类型元素
  if (node.type === 'LINE') {
    return true;
  }

  // 条件2: 矢量或矩形元素 + 极小高度 + 有描边/填充 (水平分割线)
  const isHorizontalDivider =
    (node.type === 'VECTOR' || node.type === 'RECTANGLE') &&
    node.height <= 2 &&
    node.width >= 8 &&
    (node.strokes?.length > 0 || (node.fills?.length > 0 && node.fills[0].visible !== false));

  // 条件3: 矢量或矩形元素 + 极小宽度 + 有描边/填充 (垂直分割线)
  const isVerticalDivider =
    (node.type === 'VECTOR' || node.type === 'RECTANGLE') &&
    node.width <= 2 &&
    node.height >= 8 &&
    (node.strokes?.length > 0 || (node.fills?.length > 0 && node.fills[0].visible !== false));

  // 条件4: 名称中包含关键词
  const nameContainsDividerKeyword =
    node.name.toLowerCase().includes('divider') ||
    node.name.toLowerCase().includes('separator') ||
    node.name.toLowerCase().includes('分割线');

  // 对于关键词匹配的节点，进一步验证其视觉特征
  if (nameContainsDividerKeyword) {
    // 检查是否为细长的元素 (宽高比大于10或高宽比大于10)
    const aspectRatio = node.width / node.height;
    const isExtremelyWide = aspectRatio >= 10;
    const isExtremelyTall = aspectRatio <= 0.1;

    if (isExtremelyWide || isExtremelyTall) {
      return true;
    }
  }

  return isHorizontalDivider || isVerticalDivider;
}

// 提取分割线数据
function extractDividerData(node: any): {
  orientation: 'horizontal' | 'vertical';
  style: {
    color: string;
    thickness: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  };
  layout: {
    // margin: {
    //   top?: number;
    //   right?: number;
    //   bottom?: number;
    //   left?: number;
    // };
    fullWidth?: boolean;
    fullHeight?: boolean;
  };
} {
  // 确定方向
  let isHorizontal = true;

  if (node.type === 'LINE') {
    // 对于LINE元素，检查起始点和终止点的关系
    if (node.x1 === node.x2) {
      isHorizontal = false; // 垂直线
    } else if (node.y1 === node.y2) {
      isHorizontal = true; // 水平线
    } else {
      // 对于斜线，通过比较高度和宽度判断主方向
      isHorizontal = (node.width > node.height);
    }
  } else {
    // 对于其他类型元素，通过宽高比判断
    isHorizontal = (node.width > node.height);
  }

  // 创建结果对象
  const result: {
    orientation: 'horizontal' | 'vertical';
    style: {
      color: string;
      thickness: number;
      lineStyle?: 'solid' | 'dashed' | 'dotted';
    };
    layout: {
      fullWidth?: boolean;
      fullHeight?: boolean;
    };
  } = {
    orientation: isHorizontal ? 'horizontal' : 'vertical',
    style: {
      color: '#EFEFEF', // 默认浅灰色
      thickness: 1
    },
    layout: {
    }
  };

  // 获取颜色
  if (node.strokes?.length > 0 && node.strokes[0].visible !== false) {
    result.style.color = extractColor(node.strokes[0].color);
  } else if (node.fills?.length > 0 && node.fills[0].visible !== false) {
    result.style.color = extractColor(node.fills[0].color);
  }

  // 获取线条粗细
  if (node.strokeWeight) {
    result.style.thickness = node.strokeWeight;
  } else {
    // 基于方向使用实际高度或宽度
    result.style.thickness = isHorizontal ? node.height : node.width;
    // 确保最小值为1
    // result.style.thickness = Math.max(1, result.style.thickness);
  }

  // 检查线条样式
  if (node.strokeDashes?.length > 0) {
    // 根据dash模式判断是dotted还是dashed
    result.style.lineStyle = node.strokeDashes[0] <= 2 ? 'dotted' : 'dashed';
  }

  // 通过检查与父容器的关系来估算边距
  if (node.parent) {
    const nodePos = getNodePosition(node);
    const parentPos = getNodePosition(node.parent);
    // 判断是否是父容器宽/高的100%
    // 如果宽度接近父容器宽度的90%以上，认为是100%宽
    if (isHorizontal && nodePos.width >= parentPos.width * 0.9) {
      result.layout.fullWidth = true;
    }

    // 如果高度接近父容器高度的90%以上，认为是100%高
    if (!isHorizontal && nodePos.height >= parentPos.height * 0.9) {
      result.layout.fullHeight = true;
    }
  }

  return result;
}

// 提取矢量/图标数据并返回处理结果
const processVectorData = async (node: any, resources: Map<string, any>) => {
  // 获取矢量数据
  const vectorData = await extractVectorData(node);
  if (!vectorData) return null;

  // 创建vector对象
  const vector: UINode['vector'] = {
    ...vectorData
  };

  // 处理资源引用方式的图标 - 只有当有resourceId但没有fileName时才需要处理
  if (vector.resourceId && !vector.fileName) {
    // 生成唯一文件名
    const fileName = generateUniqueIconName(resources, node);

    // 添加文件名
    vector.fileName = fileName;

    // 保存到资源集合中
    resources.set(node.id, {
      node,
      fileName,
    });
  }

  return vector;
};

// 主函数：提取UI节点信息
export async function extractUINode(
  node: any,
  maxDepth = Infinity,
  parent?: any,
  siblings?: any[],
  rootNode?: any,
  resources: Map<string, any> = new Map()
): Promise<UINode | null> {
  // 过滤掉隐藏的节点
  if ('visible' in node && node.visible === false) {
    return null
  }

  // 如果父节点是图标，则跳过子节点的处理
  if (parent && isIconNode(parent)) {
    return null
  }

  // 第一次调用时，记录根节点
  if (!rootNode) {
    rootNode = node
  }

  // 检查是否为分割线
  const isDividerNode = isDivider(node);

  const uiNode: UINode = {
    id: node.id,
    name: node.name,
    type: node.type,
    layout: extractLayout(node, parent, siblings, rootNode),
    style: {
      fills: extractFills(node),
      strokes: extractStrokes(node),
      effects: extractEffects(node),
      cornerRadius: extractCornerRadius(node)
    }
  };

  // 提取自定义组件信息
  const customComponent = extractCustomComponent(node)
  if (customComponent) {
    uiNode.custom_component = customComponent
  }

  const textInfo = extractText(node)
  if (textInfo) {
    uiNode.text = textInfo
  }

  try {
    // 获取生成的CSS代码
    const style = await node.getCSSAsync()
    const component = getDesignComponent(node)

    const { cssUnit, project, rootFontSize, scale } = options.value
    const serializeOptions = {
      useRem: cssUnit === 'rem',
      rootFontSize,
      scale,
      project
    }

    // 使用与 CodeSection.vue 相同的参数调用 codegen
    const { codeBlocks } = await codegen(
      style,
      component,
      serializeOptions,
      activePlugin.value?.code || undefined
    )

    // 只保存 css 代码块的 code 字段
    const cssBlock = codeBlocks.find((block) => block.name === 'css')
    if (cssBlock) {
      let styles = cssBlock.code.split('\n')
      // 如果节点不需要固定宽高，则过滤掉 width 和 height 样式
      if (!shouldAddWidthHeight(node)) {
        // 对于容器节点，过滤掉 width 和 height 样式
        styles = styles.filter((line) => {
          return !line.trim().startsWith('width:') && !line.trim().startsWith('height:')
        })
      }

      uiNode.customStyle = styles
    }
  } catch (error) {
    console.error(`Failed to get CSS for node ${node.id}:`, error)
  }

  // 提取矢量/图标数据
  const vector = await processVectorData(node, resources);
  if (vector) {
    uiNode.vector = vector;
    // 清理可能影响图标渲染的填充
    if (Array.isArray(uiNode.customStyle)) {
      uiNode.customStyle = uiNode.customStyle.filter(
        style => !style.includes('padding')
      );
    }
    // 删除布局内的填充
    if (uiNode.layout?.padding) {
      delete uiNode.layout.padding;
    }
  }

  // 如果是分割线，添加divider属性并设置为DIVIDER类型
  if (isDividerNode) {
    const dividerData = extractDividerData(node);
    // 转换成UINode.divider结构
    uiNode.divider = {
      orientation: dividerData.orientation as 'horizontal' | 'vertical',
      style: dividerData.style,
      layout: dividerData.layout
    };
    delete uiNode.layout.height;
    delete uiNode.layout.width;
    // delete uiNode.layout.x;
    // delete uiNode.layout.y;
    delete uiNode.style;
    // 删除customStyle属性
    delete uiNode.customStyle
  }

  // 如果当前节点不是图标且不是自定义组件，才处理子节点
  if (!isIconNode(node) && !customComponent && maxDepth > 0 && 'children' in node && node.children) {
    // 提取所有子节点信息，并传递当前节点作为它们的父节点
    const childNodes = await Promise.all(
      node.children.map((child: any) =>
        extractUINode(child, maxDepth - 1, node, node.children, rootNode, resources)
      )
    )
    uiNode.children = childNodes.filter((node): node is UINode => node !== null)
  }

  return uiNode
}

// 导出函数：处理选中的节点
export async function extractSelectedNodes(selection: readonly any[]) {
  // 如果没有选中节点，返回空对象
  if (!selection.length) {
    return { nodes: [], resources: new Map() }
  }

  // 以选中的第一个节点作为根节点
  const rootNode = selection[0]

  // 创建资源收集器
  const resources = new Map<string, any>()

  const uiNodes = await Promise.all(
    selection.map((node) =>
      extractUINode(node, Infinity, node.parent, node.parent?.children, rootNode, resources)
    )
  )
  // 过滤掉null节点
  const nodes = uiNodes.filter((node): node is UINode => node !== null)

  // 返回包含节点和资源的对象
  return { nodes, resources }
}
