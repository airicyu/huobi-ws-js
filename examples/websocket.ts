import { HbWebSocket } from 'huobi-ws-js'

const options = {
    wsUrl: 'wss://api-aws.huobi.pro/ws/v2',
    profileConfig: {
        accessKey: '<REPLACE_WITH_YOUR_ACCESS_KEY>',
        secretKey: '<REPLACE_WITH_YOUR_SECRET_KEY>',
    },
}

async function run() {
    const authResultHandler: HbWebSocketAuthResultHandler = async ({ success, msg, ws, service }) => {
        if (success) {
            service.sub('accounts.update#1')
        } else {
            console.error('auth error')
        }
    }

    const messageHandler: HbWebSocketMessageHandler = async ({ msg, ws, service }) => {
        // push event message
        if (msg.action == 'push') {
            if (msg.ch == 'accounts.update#1') {
                if (msg?.data?.changeType == 'deposit') {
                    // deposit event
                    console.log(`[${service.name}] deposit message`, { msg })
                } else if (msg?.data?.changeType == 'withdraw') {
                    // withdraw event
                    console.log(`[${service.name}] withdraw message`, { msg })
                } else if (msg?.data?.changeType == null) {
                    // initial push balance event
                    console.log(`[${service.name}] initial push balance message`, {
                        msg,
                    })
                } else if (msg?.data?.changeType == 'other') {
                    // other push
                    console.log(`[${service.name}] other push message`, { msg })
                } else {
                    // other ?
                    console.log(`[${service.name}] other misc push message`, { msg })
                }
            }
        }
        // other messages
        else {
            console.log(`[${service.name}] other message`, { msg })
        }
    }

    const hbWs = new HbWebSocket(options)
    hbWs.run()
}

run()
