const ws = require('ws')
const net = require('net')
const Models = require('./models')

class Client {
    get IsOnline() {
        if (!this.WebSocket)
        { return false }
        return (
            this.WebSocket.readyState === ws.WebSocket.OPEN ||
            this.WebSocket.readyState === ws.WebSocket.CONNECTING
        )
    }

    /**
     * @param {string} id
     * @param {import('./server')} server
     */
    constructor(id, server) {
        this.ID = id
        this.SERVER = server

        /** @type {net.Socket?} */
        this.Socket = null

        /** @type {ws.WebSocket?} */
        this.WebSocket = null

        /** @type {Models.PublicUser} */
        this.User = {
            name: '',
            lastAction: Date.now(),
            admin: false,
        }

        this.Authorized = false

        /** @type {string | null} */
        this.ActiveChannelID = null
        
        console.log('Create new client', this)
    }

    /**
     * @param {net.Socket} socket
     */
    SetHttpSocket(socket) {
        this.User.lastAction = Date.now()
        this.Socket = socket
    }

    /**
     * @param {ws.WebSocket} socket
     */
    SetWebSocket(socket) {
        this.User.lastAction = Date.now()
        this.WebSocket = socket

        this.WebSocket.addEventListener('message', e => {
            if (!e) { return }

            this.User.lastAction = Date.now()
            console.log('[WS]: Received message: ' + e.data, e)
            
            /** @type {import('./websocket-message').MessageHeader} */
            const data = JSON.parse(e.data.toString())

            if (!data.type) { return }

            if (typeof data.type !== 'string') { return }
    
            if (!this.WebSocket) { return }

            this.SERVER.OnWsMessage(this, data)
        })

        this.WebSocket.addEventListener('error', console.error)

        this.WebSocket.addEventListener('close', e => {
            console.log('[WS]: Client closed', e)
        })
    }

    /**
     * @param {string} type
     * @param {object | string} data
     */
    SendMessage(type, data) {
        const _message = {
            time: Date.now(),
            type: type,
            data: data,
        }
        console.log('[WS]: Sending message to a client', _message)
        this.WebSocket?.send(JSON.stringify(_message))
    }

    GetRaw() {
        return {
            id: this.ID,
            ActiveChannelID: this.ActiveChannelID,
            user: this.User,
        }
    }

    GetUser() {
        return {
            ...this.User,
            isOnline: this.IsOnline,
        }
    }
}

module.exports = Client
