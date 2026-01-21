import type { RequestPayload, ResponsePayload, SerializeOptions } from '@/types/codegen'
import type { DesignComponent } from '@/types/plugin'

import { createWorkerRequester } from '@/codegen/requester'
import Codegen from '@/codegen/worker?worker&inline'

import { getDesignComponent } from './component'
import { getCSSAsync } from './css'

export async function codegen(
  style: Record<string, string>,
  component: DesignComponent | null,
  options: SerializeOptions,
  pluginCode?: string,
  returnDevComponent?: boolean
): Promise<ResponsePayload> {
  const request = createWorkerRequester<RequestPayload, ResponsePayload>(Codegen)

  return await request({
    style,
    component: component ?? undefined,
    options,
    pluginCode,
    returnDevComponent
  })
}

export type CodegenConfig = {
  cssUnit: 'px' | 'rem'
  rootFontSize: number
  scale: number
  project?: string
}

export function workerUnitOptions(config: CodegenConfig): SerializeOptions {
  return {
    useRem: config.cssUnit === 'rem',
    rootFontSize: config.rootFontSize,
    scale: config.scale,
    project: config.project ?? ''
  }
}

export async function generateCodeBlocksForNode(
  node: SceneNode,
  config: CodegenConfig,
  pluginCode?: string,
  opts?: { returnDevComponent?: boolean }
): Promise<ResponsePayload> {
  // 使用封装的 getCSSAsync，支持 Figma 和 MasterGo
  const style = await getCSSAsync(node)
  const component = getDesignComponent(node)
  const serializeOptions: SerializeOptions = workerUnitOptions(config)

  return await codegen(style, component, serializeOptions, pluginCode, opts?.returnDevComponent)
}
