# huobi-ws-js

[![npm version](https://img.shields.io/npm/v/huobi-ws-js.svg)](https://www.npmjs.com/package/huobi-ws-js)
[![Build](https://travis-ci.org/airicyu/huobi-ws-js.svg?branch=master)](https://travis-ci.org/airicyu/huobi-ws-js)
[![Codecov branch](https://img.shields.io/codecov/c/github/airicyu/huobi-ws-js/master.svg)](https://codecov.io/gh/airicyu/huobi-ws-js)

[![dependencies Status](https://david-dm.org/airicyu/huobi-ws-js/status.svg)](https://david-dm.org/airicyu/huobi-ws-js)
[![devDependencies Status](https://david-dm.org/airicyu/huobi-ws-js/dev-status.svg)](https://david-dm.org/airicyu/huobi-ws-js?type=dev)

This is a non-official HuoBi web socket(v2) integration nodejs module.

(這是非官方的火幣web socket(v2) nodejs module。)

---------------------------------

## Install

```bash
$ npm i huobi-ws-js
```

---------------------------------

## Usage

Establish web socket connection to HuoBi and allow defining your own message handler function.

```javascript
import { HbWebSocket } from 'huobi-ws-js'

...

// Handler for authentication result
const authResultHandler: HbWebSocketAuthResultHandler = async ({ success, msg, ws, service }) => {
    if (success) {
        // ...
    } else {
        console.error('auth error')
    }
}

// General message handling (e.g: push data message)
const messageHandler: HbWebSocketMessageHandler = async ({ msg, ws, service }) => {
    // ...
}

...

const hbWs = new HbWebSocket({
    name: 'root',
    wsUrl: 'wss://api-aws.huobi.pro/ws/v2',
    profileConfig: {
        accessKey: '<REPLACE_WITH_YOUR_ACCESS_KEY>',
        secretKey: '<REPLACE_WITH_YOUR_SECRET_KEY>',
    },
    authResultHandler,
    messageHandler,
})
hbWs.run()

```

---------------------------------

## API

### new service class

Create a new service class which is reusable to call multiple REST APIs

```javascript
const hbWs = new HbWebSocket({
    name: 'root',
    wsUrl: 'wss://api-aws.huobi.pro/ws/v2',
    profileConfig: {
        accessKey: '<REPLACE_WITH_YOUR_ACCESS_KEY>',
        secretKey: '<REPLACE_WITH_YOUR_SECRET_KEY>',
    },
    authResultHandler,
    messageHandler,
})
```

constructor parameters:

| Parameter               | Type     | Description                                                                                                 | Mandatory                 |
|-------------------------|----------|-------------------------------------------------------------------------------------------------------------|---------------------------|
| name                    | string   | just a label                                                                                                | N                         |
| wsUrl                   | string   | websocket server base URL                                                                                   | Y                         |
| profileConfig.accessKey | string   | access key                                                                                                  | Y                         |
| profileConfig.secretKey | string   | secretKey                                                                                                   | Y                         |
| authResultHandler       | function | Handler for authentication. You should pass in handler to subscribe channels after success authentication.  | N, but you should pass in |
| messageHandler          | function | Handler for handling messages (initial auth/ping messages are excluded)                                     | N, but you should pass in |
| logger                  | object   | your logger implementation                                                                                  | N                         |


---------------------------------

### run web socket

```javascript
hbWs.run()
```

### close web socket

```javascript
hbWs.close()
```

### subscribe channel

method signature:

```
sub(ch: string): void
```

usage:

```javascript
const authResultHandler: HbWebSocketAuthResultHandler = async ({ success, msg, ws, service }) => {
    if (success) {
        service.sub('accounts.update#1') // subscribe to account updates after initial authentication success
    } else {
        console.error('auth error')
    }
}
```

---------------------------------

## Example

```javascript
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
            service.sub('accounts.update#1') // subscribe to account updates after authentication success
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
```