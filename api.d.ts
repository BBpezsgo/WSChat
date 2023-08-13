import http from 'http'

import Client from './client'
import Models from './models'
import ChatServer from './server'
import ApiRequestHandler from './api-request-handler'

class APIHandler {

    Clients: Client[]
    Channels: Models.Channel[]
    Tokens: Models.Token[]

    readonly Handler: ApiRequestHandler

    readonly Server: ChatServer

    constructor(server: ChatServer)

    CreateStorage(): void

    SaveChannels(): void

    SaveUsers(): void

    SaveTokens(): void

    LoadUsers(): void

    LoadChannels(): void

    LoadTokens(): void

    GetToken(token: string | null | undefined): Models.Token | null

    GetUserByID(userID: string | null | undefined): Client | null

    GetUserByToken(token: Models.Token | null | undefined): Client | null

    static GetTokenFromRequest(req: http.IncomingMessage): string | null

    Handle(message: import('./websocket-message').MessageHeader, client: Client): void

    HandleSendMessage(message: Models.Message, channelID: string): "OK" | {
        error: string
    }

    HandleDeleteMessage(messageID: string, channelID: string): "OK" | {
        error: string
    }

    GetChannel(channelID: string): Models.Channel | null

    CreateChannel(channelID: string): void

    GenerateToken(userID: string): Models.Token

    static GetTokenCookie(token: { token: string; expiresAt: number }): string

    PurgeTokens(): void

    HandleApiRequest(method: HttpMethod, path: string, data: any): ApiRequestHandler.ApiResult<any>
}

export = APIHandler