'use strict'

import moment from 'moment'
import WebSocket from 'ws'
import CryptoJS from 'crypto-js'
import url from 'url'
import { logger as defaultLogger } from './defaultLogger'

/**
 * Websocket service for HB
 */
class HbWebSocket {
    name: string
    private wsUrl: string
    private profileConfig: {
        accessKey: string
        secretKey: string
    }
    private ws: WebSocket | null = null
    private logger: Logger
    private authResultHandler: HbWebSocketAuthResultHandler
    private messageHandler: HbWebSocketMessageHandler
    private state: string | null = null

    constructor({ name, wsUrl, profileConfig, authResultHandler, messageHandler, logger }: HbWebSocketConstructParams) {
        this.name = name ?? 'HbWebSocket'
        this.wsUrl = wsUrl
        this.profileConfig = profileConfig
        this.authResultHandler = authResultHandler
        this.messageHandler = messageHandler
        this.logger = logger || defaultLogger
    }

    private signSHA({
        method,
        host,
        path,
        signPayload,
    }: {
        method: string
        host: string
        path: string
        signPayload: Record<string, unknown>
    }): string {
        const pars = []

        for (const item in signPayload) {
            pars.push(item + '=' + encodeURIComponent('' + signPayload[item]))
        }
        const queryString = pars.sort().join('&')
        const meta = [method, host, path, queryString].join('\n')
        const hash = CryptoJS.HmacSHA256(meta, this.profileConfig.secretKey)
        const signature = CryptoJS.enc.Base64.stringify(hash)
        return signature
    }

    private auth(): void {
        const timestamp = moment.utc().format('YYYY-MM-DDTHH:mm:ss')

        const signPayload = {
            accessKey: this.profileConfig.accessKey,
            signatureMethod: 'HmacSHA256',
            signatureVersion: '2.1',
            timestamp: timestamp,
        }

        const parsedUrl = url.parse(this.wsUrl)
        if (!parsedUrl?.host || !parsedUrl?.path) {
            const error = new Error('api base url invalid')
            this.logger.error(error.message, { error })
            throw error
        }

        const signature = this.signSHA({
            method: 'GET',
            host: parsedUrl.host,
            path: parsedUrl.path,
            signPayload,
        })

        const payload = {
            action: 'req',
            ch: 'auth',
            params: {
                authType: 'api',
                ...signPayload,
                signature,
            },
        }

        this.ws?.send(JSON.stringify(payload))
    }

    sub(ch: string): void {
        const data = {
            action: 'sub',
            ch: ch,
        }

        this.ws?.send(JSON.stringify(data))
    }

    run(): void {
        if (this.ws) {
            try {
                this.state = 'CLOSE'
                this.ws.close()
                this.ws = new WebSocket(this.wsUrl)
            } catch (error) {
                this.logger.error(`[${this.name}] closing websocket error`, { error })
                this.ws = null
                throw error
            }
        } else {
            this.ws = new WebSocket(this.wsUrl)
        }

        this.state = 'RUN'

        this.ws.on('open', () => {
            this.logger.debug(`[${this.name}] ws open`)
            this.auth()
        })
        this.ws.on('message', (data) => {
            let messageText = ''
            if (typeof data === 'string') {
                messageText = data
            } else if (data instanceof Buffer) {
                messageText = data.toString('utf8')
            } else if (data instanceof ArrayBuffer) {
                messageText = Buffer.from(data).toString('utf8')
            } else if (Array.isArray(data) && data?.[0] instanceof Buffer) {
                messageText = Buffer.concat(data).toString('utf8')
            }

            const msg: { action: string; data: { [prop: string]: unknown } | null; [prop: string]: unknown } = JSON.parse(messageText)

            if (msg.action == 'ping') {
                const pong = {
                    action: 'pong',
                    ts: msg?.data?.ts,
                }
                this.ws?.send(JSON.stringify(pong))
            } else if (msg.action == 'req' && msg.ch == 'auth') {
                if (msg.code == 200) {
                    if (this.authResultHandler) {
                        this.authResultHandler({ success: true, msg, ws: this.ws, service: this })
                    } else {
                        this.logger.info(`[${this.name}] auth success`)
                    }
                } else {
                    if (this.authResultHandler) {
                        this.authResultHandler({ success: false, msg, ws: this.ws, service: this })
                    } else {
                        this.logger.error(`[${this.name}] auth error`, { msg })
                    }
                }
            } else {
                this.messageHandler({ msg, ws: this.ws, service: this })
            }
        })
        this.ws.on('close', () => {
            this.logger.info(`[${this.name}] ws close`)
            if (this.state == 'RUN') {
                this.logger.info(`[${this.name}] ws reopen`)
                this.run()
            }
        })

        this.ws.on('error', (err) => {
            this.logger.error(`[${this.name}] ws error`, { err })
            if (this.state == 'RUN') {
                this.run()
            }
        })
    }

    close(): void {
        this.state = 'STOP'
        this.ws?.close()
    }
}

export { HbWebSocket }
