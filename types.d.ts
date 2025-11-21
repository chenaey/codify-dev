interface Window {
  figma: PluginAPI
  webpackChunk_figma_web_bundler: any[] & { push: (...args: any[]) => any }
  mg: {
    document: {
      currentPage: {
        selection: readonly any[]
      }
    }
    codegen: {
      getMCPStyleData: (nodeId?: string) => Promise<Array<{ cssCode: string }>>
      getDSL: (nodeId?: string, framework?: string) => Promise<{
        nodeMap: {
          [key: string]: {
            style: {
              value: Record<string, any>
              layoutStyles: Record<string, string>
              styleTokenAlias?: Record<string, string>
            }
          }
        }
        localStyleMap: {
          [key: string]: {
            id: string
            type: string
            name: string
            value: string | any
          }
        }
        root: {
          style: {
            value: Record<string, any>
            layoutStyles: Record<string, string>
            styleTokenAlias?: Record<string, string>
          }
        }
      }>
    }
  }
}
