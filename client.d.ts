import * as ws from 'ws'
import * as net from 'net'
import * as Models from './models'

export = class Client {
    get IsOnline(): boolean

    readonly ID: string
    readonly SERVER: import('./server')

    Socket: net.Socket | null

    WebSocket: ws.WebSocket | null

    User: Models.PublicUser

    Authorized: boolean

    ActiveChannelID: string | null

    constructor(id: string, server: import('./server'))

    SetHttpSocket(socket: net.Socket): void

    SetWebSocket(socket: ws.WebSocket): void

    SendMessage(type: 'message-created', data: Models.Message): void
    SendMessage(type: 'message-deleted', data: string): void
    SendMessage(type: 'base-response', data: {
        AckMessageID: string
        data: 'OK' | {
            error: string
        }
    }): void

    GetRaw(): {
        id: string
        user: Models.PublicUser
    }

    GetUser() : Models.PublicUser & {
        isOnline: boolean
    }
}
