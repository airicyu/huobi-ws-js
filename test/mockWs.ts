import { EventEmitter } from 'events'

class MockWs extends EventEmitter {
    constructor() {
        super()

        setImmediate(() => {
            this.emit('open', {})
        })
    }

    async send(payload: string) {
        await this.mockServerReceiveMessage(payload)
    }

    async mockServerResponseMessage(data: object) {
        await this.emit('message', JSON.stringify(data))
    }

    async mockServerReceiveMessage(payload: string) {
        let msg = JSON.parse(payload)

        if (msg.action === 'req' && msg.ch === 'auth') {
            this.mockServerResponseMessage({
                code: 200,
                action: 'req',
                ch: 'auth',
            })

            setImmediate(() => {
                this.mockServerResponseMessage({
                    action: 'ping',
                    data: {
                        ts: Date.now(),
                    },
                })
            })
        } else if (msg.action === 'sub') {
            this.mockServerResponseMessage({
                action: 'sub',
                ch: msg.ch,
            })

            setImmediate(() => {
                this.mockServerResponseMessage({
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
        }
    }

    close() {
        this.emit('close')
    }
}

export { MockWs }
