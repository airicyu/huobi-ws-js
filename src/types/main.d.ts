/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * HB Websocket service
 */
declare class HbWebSocket {
    constructor({ name, wsConfig, profileConfig, authResultHandler, messageHandler, logger }: HbWebSocketConstructParams)

    run(): void

    sub(ch: string): void

    close(): void
}

/**
 * HB Websocket constructor params
 */
declare interface HbWebSocketConstructParams {
    name?: string
    wsUrl: string
    profileConfig: {
        accessKey: string
        secretKey: string
    }
    authResultHandler: HbWebSocketAuthResultHandler
    messageHandler: HbWebSocketMessageHandler
    logger?: Logger
}

declare type HbWebSocketAuthResultHandler = (args: {
    success: boolean
    msg: { action: string; data?: any; [prop: string]: unknown }
    ws: WebSocket | null
    service: HbWebSocket
}) => Promise<void>

declare type HbWebSocketMessageHandler = (args: {
    msg: { action: string; data?: any; [prop: string]: unknown }
    ws: WebSocket | null
    service: HbWebSocket
}) => Promise<void>

/**
 * Logger interface
 */
declare interface Logger {
    info: (msg: string, params?: Record<string, unknown>) => void
    debug: (msg: string, params?: Record<string, unknown>) => void
    error: (msg: string, params?: Record<string, unknown>) => void
    [propName: string]: any
}
