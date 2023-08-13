const ws = require('ws')
const net = require('net')
const Models = require('./models')
const ANSI = require('./ansi')

class Client {
    /**
     * @returns {boolean}
     */
    get IsOnline() {
        if (!this.WebSocket)
        { return false }
        return (
            this.WebSocket.readyState === ws.WebSocket.OPEN ||
            this.WebSocket.readyState === ws.WebSocket.CONNECTING
        )
    }

    /**
     * @returns {Models.ActiveUser}
     */
    get ActiveUser() {
        return {
            ...this.User,
            isOnline: this.IsOnline,
        }
    }

    /**
     * @returns {boolean}
     */
    get IsAuthorized() {
        if (!this.Token) {
            return false
        }
        if (this.Token.expiresAt <= Date.now()) {
            return false
        }
        if (this.Token.userID !== this.ID) {
            return false
        }
        return true
    }

    /**
     * @param {string} id
     * @param {string} password
     * @param {import('./server')} server
     */
    constructor(id, password, server) {
        this.ID = id
        this.Password = password
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

        /** @type {string | null} */
        this.ActiveChannelID = null

        /** @type {Models.Token | null} */
        this.Token = null

        /** @type {string | null} */
        this.RemoteAddress = null
        
        // console.log(`${ANSI.FG.Gray}Create new client`, this)
    }

    /**
     * @returns {Models.SerializedUser}
     */
    Serialize() {
        return {
            id: this.ID,
            state: {
                channel: this.ActiveChannelID,
            },
            user: this.User,
            sensitive: {
                password: this.Password,
            },
        }
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
            console.log(`${ANSI.FG.Gray}[WS]:   < ${e.data}`, e)
            
            /** @type {import('./websocket-message').MessageHeader} */
            const data = JSON.parse(e.data.toString())

            if (!data.type) { return }

            if (typeof data.type !== 'string') { return }
    
            if (!this.WebSocket) { return }

            this.SERVER.OnWsMessage(this, data)
        })

        this.WebSocket.addEventListener('error', console.error)

        this.WebSocket.addEventListener('close', e => {
            console.log(`${ANSI.FG.Gray}[WS]:   ${ANSI.FG.Yellow}X${ANSI.FG.Gray} ${this.RemoteAddress}`, e)
        })
    }

    /**
     * @param {Models.Token | null | undefined} token
     */
    SetToken(token) {
        if (!token) {
            this.Token = null
        } else {
            this.Token = token
        }
    }

    /**
     * @param {string} type
     * @param {any} data
     */
    SendMessage(type, data) {
        const _message = {
            time: Date.now(),
            type: type,
            data: data,
        }
        console.log(`${ANSI.FG.Gray}[WS]:   >`, _message)
        this.WebSocket?.send(JSON.stringify(_message))
    }
}

module.exports = Client
