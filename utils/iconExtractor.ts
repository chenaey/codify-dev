import { extractColor } from './uiExtractor'

// 基础矢量数据类型
interface BaseVectorData {
  id: string
  type: string
  name: string
  width: number
  height: number
  fileName?: string
  resourceId?: string
}

// 完整矢量数据类型
interface FullVectorData extends BaseVectorData {
  svgContent?: string  // SVG原始内容，用于直接内联使用
  resourceId?: string  // 资源ID，用于文件引用方式
  fileName?: string    // 文件名，与resourceId搭配使用
}

// 矢量节点类型
const VECTOR_TYPES = [
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'REGULAR_POLYGON',
  'RECTANGLE'
] as const

// 容器节点类型
const CONTAINER_TYPES = [
  'GROUP',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
] as const

type VectorNodeType = typeof VECTOR_TYPES[number]
type ContainerNodeType = typeof CONTAINER_TYPES[number]

// 检查节点是否为矢量节点
export function isVectorNode(node: any): boolean {
  return VECTOR_TYPES.includes(node.type)
}

// 检查节点是否为容器节点
export function isContainerNode(node: any): boolean {
  return CONTAINER_TYPES.includes(node.type)
}

export function isIconName(node: any): boolean {
  return node.name.toLowerCase().includes('icon') ||
    node.name.toLowerCase().includes('图标')
}

// 检查节点是否为图标节点
export function isIconNode(node: any): boolean {
  // 空节点检查
  if (!node) return false;

  // 不可见节点不是图标
  if ('visible' in node && node.visible === false) return false;
  // 优先使用Figma官方API的判断方法 - 如果Figma认为这是一个图标资源
  if ('isAsset' in node && node.isAsset === true) {
    return true;
  }

  // 名称检查 - 作为补充判断方法
  const nameBasedIcon = isIconName(node) ||
    (node.description?.toLowerCase()?.includes('icon') ||
      node.description?.toLowerCase()?.includes('图标'));

  // 尺寸检查 - 更宽松的条件，只要是小尺寸基本就是图标
  const sizeBasedIcon = node.width <= 64 &&
    node.height <= 64;

  // 比例检查 - 图标通常是正方形或接近正方形的
  const isSquarish = Math.abs(node.width - node.height) <= 2;

  // 结合检查 - 针对不同类型节点的判断逻辑
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    // 组件和实例优先看名称和描述
    return nameBasedIcon || (sizeBasedIcon && isSquarish);
  }

  if (isVectorNode(node)) {
    // 矢量元素需要满足名称或尺寸条件
    return nameBasedIcon || (sizeBasedIcon && isSquarish && node.width > 0);
  }

  // 容器类型（FRAME, GROUP）需要进一步检查
  if (isContainerNode(node)) {
    // 如果名称包含关键词，或尺寸合适且为正方形
    if (nameBasedIcon || (sizeBasedIcon && isSquarish)) {
      return true;
    }

    // 检查子节点 - 如果所有子节点都是矢量，很可能是图标
    if ('children' in node && node.children?.length > 0) {
      const hasOnlyVectorChildren = node.children.length > 0 &&
        node.children.every((child: any) => isVectorNode(child));

      if (sizeBasedIcon && hasOnlyVectorChildren) {
        return true;
      }
    }
  }

  return false;
}

// 判断是否为简单单色SVG
function isSimpleSvg(node: any): boolean {
  // 检查节点的复杂度
  // 检查当前节点的 vectorPaths
  if (node.vectorPaths) {
    const pathData = node.vectorPaths.map((path: any) => path.data || '').join('');
    if (pathData.length >= 100) return false;
  }

  // 检查子节点的 vectorPaths
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.vectorPaths) {
        const childPathData = child.vectorPaths.map((path: any) => path.data || '').join('');
        if (childPathData.length >= 100) return false;
      }
    }
  }
  // 检查是否只有一种填充颜色
  const fills = node.fills || [];
  const visibleFills = fills.filter((fill: any) => fill.visible !== false);
  // 检查填充类型 - 只接受纯色填充
  const hasNonSolidFill = visibleFills.some((fill: any) =>
    fill.type !== 'SOLID' ||
    (typeof fill.opacity !== 'undefined' && fill.opacity < 1)
  );
  if (hasNonSolidFill) return false;

  // 检查是否有复杂效果
  const hasEffects = node.effects && node.effects.some((effect: any) => effect.visible !== false);
  if (hasEffects) return false;

  // 检查是否有描边
  const hasStrokes = node.strokes && node.strokes.some((stroke: any) => stroke.visible !== false);
  if (hasStrokes) return false;
  // 尺寸检查 - 简单图标通常较小
  const isSmallIcon = node.width <= 16 && node.height <= 16;
  return isSmallIcon;
}

// 提取图标数据
export async function extractVectorData(node: any): Promise<BaseVectorData | FullVectorData | undefined> {
  // 首先判断是否为图标节点
  if (!node || !isIconNode(node)) return undefined;

  // 创建基础矢量数据
  const baseVectorData: BaseVectorData = {
    id: node.id,
    type: node.type,
    name: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height)
  };

  // 判断是否为简单图标
  const isSimple = isSimpleSvg(node);

  // 创建完整矢量数据
  const vectorData: FullVectorData = {
    ...baseVectorData
  };



  // 如果节点支持导出SVG，使用Figma API导出
  try {
    console.log('[extractVectorData]', node, node.name, isSimple)
    if (isSimple) {
      // 直接导出SVG
      const svgBytes = await node.exportAsync({
        format: 'SVG'
      });      // 转换为字符串
      const decoder = new TextDecoder();
      const svgString = decoder.decode(svgBytes);
      // 导出之后再判断更准确
      const path = svgString.match(/<path d="([^"]+)"/)?.[1]
      if (path && path?.length <= 300) {
        // 简单单色SVG：保留SVG内容，用于内联
        vectorData.svgContent = svgString;
      } else {
        // 复杂SVG：设置resourceId，用于文件引用
        vectorData.resourceId = node.id;
      }
    } else {
      // 复杂SVG：设置resourceId，用于文件引用
      vectorData.resourceId = node.id;
    }
    return vectorData;
  } catch (error) {
    console.error('Error exporting SVG:', error);
  }

  // 如果不支持导出SVG或导出失败，返回基础数据
  return baseVectorData;
}

// 导出类型定义
export type {
  BaseVectorData,
  FullVectorData,
  VectorNodeType,
  ContainerNodeType
} 