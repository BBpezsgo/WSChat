const ReconnectTime = 1000

class WebSocketManager {
    /**
     * @param {(message: import('../websocket-message').MessageHeader) => void} OnMessage
     */
    constructor(OnMessage) {
        this.WS = null

        this.OnMessage = OnMessage

        /**
         * @type {{
         * Callback?: (response: any) => void,
         * ID: string,
         * }[]}
         */
        this.SentMessages = [ ]

        /** @type {NodeJS.Timeout | null} */
        this.ReconnectHandler = null

        this.Connect()
    }

    TryReconnect() {
        if (this.WS && this.WS.readyState !== this.WS.CLOSED) {
            return
        }

        this.Connect()
    }

    Connect() {
        console.log('[WS]: Connecting ...')

        this.WS = new WebSocket('ws://' + window.location.host + '/')

        const self = this

        this.WS.addEventListener('open', function() {
            statusSocket.innerText = 'Connected'
            console.log('[WS]: Connected')

            if (self.ReconnectHandler) {
                clearTimeout(self.ReconnectHandler)
            }
        })

        this.WS.addEventListener('error', function(e) {
            statusSocket.innerText = 'Error'
            console.error('[WS]: Error', e)
        })
        
        this.WS.addEventListener('close', function(e) {
            statusSocket.innerText = 'Disconnected'
            console.log('[WS]: Disconnected', e)

            console.log(`[WS]: Reconnecting in ${ReconnectTime} ms`, e)
            self.ReconnectHandler = setTimeout(() => self.TryReconnect(), ReconnectTime)
        })
        
        this.WS.addEventListener('message', function(e) {
            if (!e) { return }

            console.log('[WS]: Message from server: ' + e.data, e)

            /** @type {import('../websocket-message').MessageHeader} */
            const data = JSON.parse(e.data)

            if (!data.type) { return }

            if (typeof data.type !== 'string') { return }

            if (data.type === 'base-response') {
                for (let i = self.SentMessages.length - 1; i >= 0; i--) {
                    const sentMessage = self.SentMessages[i]
                    if (sentMessage.ID === data.data.AckMessageID) {
                        if (sentMessage.Callback)
                        { sentMessage.Callback(data.data.data) }
                        self.SentMessages.splice(i, 1)
                        return
                    }
                }
                console.warn('[WS]: Unexpected response', data)
                return
            }

            self.OnMessage(data)
        })
    }
    
    /**
     * @param {string} type
     * @param {object | string} message
     * @param {((response: any) => void) | undefined} responseCallback
     */
    SendMessage(type, message, responseCallback = undefined) {
        if (!this.WS) {
            return
        }

        const _message = {
            time: Date.now(),
            type: type,
            data: message,
            ID: GUID(),
        }
        this.WS.send(JSON.stringify(_message))
        this.SentMessages.push({
            Callback: responseCallback,
            ID: _message.ID,
        })
    }
}
