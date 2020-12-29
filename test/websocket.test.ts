import sinon, { SinonSpy } from 'sinon'
import { MockWs } from './mockWs'

jest.mock('ws', () => {
    return MockWs
})

import { HbWebSocket } from '../src/main'
import { logger as silentLogger } from './silentLogger'
import { EventEmitter } from 'events'

const dummyConfig = {
    wsUrl: 'wss://api-aws.huobi.pro/ws/v2',
    profileConfig: {
        accessKey: 'd326b4a4-5eb24204-af16bc922b-fd0db',
        secretKey: 'e11b8b8c-d2c747b0-92131eea-ceadc',
    },
}

const authResultHandler: HbWebSocketAuthResultHandler = async ({ success, msg, ws, service }) => {
    if (success) {
        service.sub('accounts.update#1')
    } else {
        console.error('auth error')
    }
}

const messageHandlerBuilder: (done: Function) => HbWebSocketMessageHandler = (done) => {
    return async ({ msg, ws, service }) => {
        // push event message
        if (msg.action == 'push') {
            if (msg.ch == 'accounts.update#1') {
                done()
            }
        }
        // other messages
        else {
        }
    }
}

describe('Test Websocket call flow', function () {
    const sandbox = sinon.createSandbox()
    let hbWs: HbWebSocket | null

    let spyAuthResultHandler: HbWebSocketAuthResultHandler
    let spyMessageHandler: HbWebSocketMessageHandler

    beforeAll(() => {})

    afterAll(() => {
        sandbox.restore()
    })

    it('Test API call flow with mock server', async () => {
        // wrap in promise, run the ws and wait until flow done
        await new Promise(async (resolve) => {
            const messageHandler = messageHandlerBuilder(resolve)

            spyMessageHandler = sandbox.spy(messageHandler)
            spyAuthResultHandler = sandbox.spy(authResultHandler)

            hbWs = new HbWebSocket({
                wsUrl: dummyConfig.wsUrl,
                profileConfig: dummyConfig.profileConfig,
                authResultHandler: spyAuthResultHandler,
                messageHandler: spyMessageHandler,
                logger: silentLogger,
            })

            await hbWs?.run()

            return
        })

        await (hbWs as any)?.ws?.close() //simulate ws broken

        await hbWs?.close()

        /**
         * Verify authe result call
         */
        let authResultSpy: SinonSpy = spyAuthResultHandler as SinonSpy
        expect(authResultSpy.callCount).toEqual(1)

        let authResultCall = authResultSpy.getCall(0)
        expect(authResultCall?.args?.[0]?.success).toEqual(true)
        expect(authResultCall?.args?.[0]?.msg).toEqual({
            code: 200,
            action: 'req',
            ch: 'auth',
        })

        /**
         * Verify message handler call
         */
        let messageSpy: SinonSpy = spyMessageHandler as SinonSpy

        expect(messageSpy.callCount).toEqual(2)

        expect(messageSpy.getCall(0)?.args?.[0]?.msg).toEqual({
            action: 'sub',
            ch: 'accounts.update#1',
        })

        expect(messageSpy.getCall(1)?.args?.[0]?.msg).toEqual({
            action: 'push',
            ch: 'accounts.update#1',
            data: {
                currency: 'btc',
                accountId: 33385,
                available: '2028.699426619837209087',
                changeType: 'order.match',
                accountType: 'trade',
                changeTime: 1574393385167,
            },
        })
    })
})
