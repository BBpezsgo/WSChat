import * as ws from 'ws'
import * as net from 'net'
import * as Models from './models'

export = class Client {
    get IsOnline(): boolean
    get ActiveUser(): Models.ActiveUser
    get IsAuthorized(): boolean

    readonly ID: string
    readonly SERVER: import('./server')
    Password: string | null

    Socket: net.Socket | null
    WebSocket: ws.WebSocket | null

    CurrentVoice: string | null

    User: Models.PublicUser
    ActiveChannelID: string | null

    RemoteAddress: string | null

    constructor(id: string, password: string | null, server: import('./server'))

    Serialize(): Models.SerializedUser

    SetHttpSocket(socket: net.Socket): void
    SetWebSocket(socket: ws.WebSocket): void

    SetToken(token: Models.Token | Models.TokenRecord | null | undefined): void

    SendMessage(type: 'message-created', data: Models.Message): void
    SendMessage(type: 'message-deleted', data: string): void
    SendMessage(type: 'voice', data: {
        voice: string,
        callID: string,
    }): void
    SendMessage(type: 'base-response', data: {
        AckMessageID: string
        data: 'OK' | {
            error: string
        }
    }): void
    SendMessage(type: 'begin-voice-response', data: {
        AckMessageID: string
        data: string | {
            error: string
        }
    }): void
}
