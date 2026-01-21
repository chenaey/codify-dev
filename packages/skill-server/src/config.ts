import pino from 'pino'

export const log = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export const DEFAULT_PORT = 13580
export const DEFAULT_WS_PORT = 13581
export const TOOL_TIMEOUT_MS = 30000
