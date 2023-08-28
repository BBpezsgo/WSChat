const fs = require('fs')
const Path = require('path')
const http = require('http')

const Client = require('./client')
const Models = require('./models')
const ParseCookies = require('./utils/cookie-parser')
const ChatServer = require('./server')
const Utils = require('./utils')
const GUID = require('./guid')

const ApiRequestHandler = require('./api-request-handler')
const { MessageType } = require('./models')

class APIHandler {
    /**
     * @param {ChatServer} server
     */
    constructor(server) {
        /** @type {Client[]} */
        this.Clients = []

        /** @type {Models.Channel[]} */
        this.Channels = []

        /** @type {Models.Token[]} */
        this.Tokens = []

        this.Server = server

        /** @type {ApiRequestHandler} */
        this.Handler = new ApiRequestHandler()

        this.Handler.Register('/register', 'POST', data => {
            const username = data['username']?.toString()
            const password = data['password']?.toString()
            
            if (!username) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Username not specified`,
                }
            }

            if (!password) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Password not specified`,
                }
            }

            for (const user of this.Clients) {
                if (user.User.name === username) {
                    return {
                        success: false,
                        httpCode: 400,
                        message: `User already exists`,
                    }
                }
            }

            const newUserID = GUID()

            this.Clients.push(new Client(newUserID, password, this.Server))

            const user = this.GetUserByID(newUserID)

            if (!user) {
                return {
                    success: false,
                    httpCode: 500,
                    message: `Failed to create user`,
                }
            }
        
            const token = this.GenerateToken(user.ID)

            user.SetToken(token)

            user.User.name = username
            user.User.anonymous = false

            this.SaveUsers()

            console.log('User registered', user)

            return {
                success: true,
                httpCode: 303,
                redirect: '/?channel=default',
                setCookie: APIHandler.GetTokenCookie(token),
            }
        })

        this.Handler.Register('/login', 'POST', data => {
            const username = data['username']?.toString()
            const password = data['password']?.toString()
            const receivedToken = data['receivedToken']
            
            if (!username) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Username not specified`,
                }
            }

            if (!password) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Password not specified`,
                }
            }

            let userID = null
            for (const user of this.Clients) {
                if (user.User.name === username) {
                    userID = user.ID
                    break
                }
            }

            const user = this.GetUserByID(userID)

            if (!user) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `User not found`,
                }
            }

            if (user.User.name !== username) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Wrong username or password`,
                }
            }

            if (user.Password !== password) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Wrong username or password`,
                }
            }

            if (receivedToken) {
                if (typeof receivedToken !== 'object') {
                    return {
                        success: false,
                        httpCode: 400,
                        message: `Invalid token`,
                    }
                }
    
                if (!('token' in receivedToken && 'userID' in receivedToken && 'expiresAt' in receivedToken)) {
                    return {
                        success: false,
                        httpCode: 400,
                        message: `Invalid token`,
                    }
                }
    
                if (typeof receivedToken.token !== 'string' ||  typeof receivedToken.userID !== 'string' || typeof receivedToken.expiresAt !== 'number') {
                    return {
                        success: false,
                        httpCode: 400,
                        message: `Invalid token`,
                    }
                }

                user.SetToken(receivedToken ?? null)    
            }

            const token = this.GenerateToken(user.ID)

            user.User.name = username

            this.SaveUsers()

            console.log('User authorized', user)

            return {
                success: true,
                httpCode: 303,
                redirect: `/?channel=${user.ActiveChannelID ?? 'default'}`,
                setCookie: APIHandler.GetTokenCookie(token),
            }
        })

        this.Handler.Register('/anonymous', 'POST', data => {
            let username = data['username']?.toString()
            
            if (!username) { username = `guest-${GUID()}` }

            const userID = GUID()

            const user = new Client(userID, null, this.Server)
            user.User.name = username
            user.User.anonymous = true

            const token = this.GenerateToken(user.ID)
            user.SetToken(token)

            this.Clients.push(user)

            this.SaveUsers()

            console.log('Anonymous user authorized', user)

            return {
                success: true,
                httpCode: 303,
                redirect: `/?channel=${user.ActiveChannelID ?? 'default'}`,
                setCookie: APIHandler.GetTokenCookie(token),
            }
        })

        this.Handler.Register('/user/*', 'GET', (data, path) => {
            const disassembledPath = Utils.DisassemblePath(path, 'user')

            const username = data['username']
            const id = data['id'] ?? disassembledPath?.['user']

            if (!username && !id) {
                return {
                    success: false,
                    httpCode: 400,
                    message: `Identifiy not specified`,
                }
            }
            
            let userID = id?.toString()

            if (!userID) {
                for (const user of this.Clients) {
                    if (user.User.name === username) {
                        userID = user.ID
                        break
                    }
                }
            }

            const user = this.GetUserByID(userID)

            if (!user) {
                return {
                    success: false,
                    httpCode: 404,
                    message: `User not found`,
                    details: Utils.GenerateObject({
                        id: id,
                        username: username,
                    }),
                }
            }

            return {
                success: true,
                httpCode: 200,
                data: user.ActiveUser,
            }
        })
        
        this.Handler.Register('/users', 'GET', () => {
            let result = [ ]

            for (const user of this.Clients) {
                result.push({
                    ...user.ActiveUser,
                    id: user.ID,
                })
            }

            return {
                success: true,
                httpCode: 200,
                data: result,
            }
        })
    }

    CreateStorage() {
        try {
            if (fs.existsSync(Path.join(__dirname, 'storage'))) {
                return
            }
            fs.mkdirSync(Path.join(__dirname, 'storage'), { recursive: true })
        } catch (error) {
            console.error(error)
        }
    }

    SaveChannels() {
        this.CreateStorage()

        try {
            fs.writeFileSync(Path.join(__dirname, 'storage', 'channels.json'), JSON.stringify(this.Channels, null, ' '), 'utf8')
        } catch (error) { console.error(error) }
    }

    SaveUsers() {
        this.CreateStorage()

        try {
            const rawClients = []
            for (const client of this.Clients) {
                rawClients.push(client.Serialize())
            }
            fs.writeFileSync(Path.join(__dirname, 'storage', 'users.json'), JSON.stringify(rawClients, null, ' '), 'utf8')
        } catch (error) { console.error(error) }
    }

    SaveTokens() {
        this.CreateStorage()

        try {
            fs.writeFileSync(Path.join(__dirname, 'storage', 'tokens.json'), JSON.stringify(this.Tokens, null, ' '), 'utf8')
        } catch (error) { console.error(error) }
    }

    LoadUsers() {
        if (!fs.existsSync(Path.join(__dirname, 'storage', 'users.json'))) {
            return
        }

        try {
            const raw = fs.readFileSync(Path.join(__dirname, 'storage', 'users.json'), 'utf8')
            /** @type {Models.SerializedUser[]} */
            const rawClients = JSON.parse(raw)
            for (const rawClient of rawClients) {
                const newClient = new Client(rawClient.id, rawClient.sensitive.password, this.Server)
                newClient.User = rawClient.user
                newClient.ActiveChannelID = rawClient.state.channel
                this.Clients.push(newClient)
            }
        } catch (error) {
            console.error(error)
        }
    }

    LoadChannels() {
        if (!fs.existsSync(Path.join(__dirname, 'storage', 'channels.json'))) {
            return
        }

        try {
            const raw = fs.readFileSync(Path.join(__dirname, 'storage', 'channels.json'), 'utf8')
            this.Channels = JSON.parse(raw)
        } catch (error) {
            console.error(error)
        }
    }

    LoadTokens() {
        if (!fs.existsSync(Path.join(__dirname, 'storage', 'tokens.json'))) {
            return
        }

        try {
            const raw = fs.readFileSync(Path.join(__dirname, 'storage', 'tokens.json'), 'utf8')
            this.Tokens = JSON.parse(raw)
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * @param {string | null | undefined} token
     */
    GetToken(token) {
        if (!token)
        { return null }

        for (const _token of this.Tokens) {
            if (_token.token === token)
            { return _token }
        }

        return null
    }

    /**
     * @param {string | null | undefined} userID
     */
    GetUserByID(userID) {
        if (!userID)
        { return null }

        for (const client of this.Clients) {
            if (client.ID === userID)
            { return client }
        }

        return null
    }

    /**
     * @param {Models.Token | null | undefined} token
     */
    GetUserByToken(token) {
        if (!token)
        { return null }

        return this.GetUserByID(token.userID)
    }

    /**
     * @param {http.IncomingMessage} req
     */
    static GetTokenFromRequest(req) {
        if (req.headers.cookie) {
            const cookies = ParseCookies(req.headers.cookie)
            const cookie = cookies['token']
            if (cookie && cookie.value) {
                return cookie.value
            }
        }
        return null
    }

    /**
     * @param {import('./websocket-message').MessageHeader} message
     * @param {Client} client
     */
    Handle(message, client) {
        switch (message.type) {
            case 'send-message': {
                const result = this.HandleSendMessage({
                    type: Models.MessageType.USER,
                    time: message.time,
                    content: message.data.content,
                    senderID: client.ID,
                    sender: client.User,
                    ID: GUID(),
                }, message.data.channel)
                
                client.SendMessage('base-response', {
                    AckMessageID: message.ID,
                    data: result,
                })
                break
            }
            case 'delete-message': {
                if (!client.User.admin) {
                    client.SendMessage('base-response', {
                        AckMessageID: message.ID,
                        data: {
                            error: 'No permission'
                        }
                    })
                    break
                }

                const result = this.HandleDeleteMessage(message.data.message, message.data.channel)
                
                client.SendMessage('base-response', {
                    AckMessageID: message.ID,
                    data: result,
                })
                break
            }
            case 'begin-voice': {
                const callID = GUID()
                const channelID = message.data
                const channel = this.GetChannel(channelID)
                if (!channel) {
                    client.SendMessage('begin-voice-response', {
                        AckMessageID: message.ID,
                        data: { error: `Channel "${channelID}" not found` },
                    })
                    break
                }

                client.SendMessage('begin-voice-response', {
                    AckMessageID: message.ID,
                    data: callID,
                })
                client.CurrentVoice = callID

                /** @type {import('./models').CallMessage} */
                const channelMessage = {
                    ID: GUID(),
                    content: '',
                    time: Date.now(),
                    senderID: client.ID,
                    type: MessageType.CALL,
                    sender: client.User,
                    callID: callID,
                }
                channel.Messages.push(channelMessage)
                this.SaveChannels()

                for (const client of this.Clients) {
                    if (client.ActiveChannelID === channel.ID) {
                        client.SendMessage('message-created', channelMessage)
                    }
                }
                
                break
            }
            case 'join-voice': {
                const callID = message.data
                
                if (!callID) {
                    client.SendMessage('base-response', {
                        AckMessageID: message.ID,
                        data: { error: `Call id not specified` },
                    })
                    break
                }

                if (client.CurrentVoice && client.CurrentVoice !== callID) {
                    client.SendMessage('base-response', {
                        AckMessageID: message.ID,
                        data: { error: `Already in call` },
                    })
                    break
                }

                client.CurrentVoice = callID

                client.SendMessage('base-response', {
                    AckMessageID: message.ID,
                    data: 'OK',
                })

                break
            }
            case 'end-voice': {
                const callID = message.data
                
                if (!client.CurrentVoice || client.CurrentVoice === callID) {
                    client.CurrentVoice = null
                    client.SendMessage('base-response', {
                        AckMessageID: message.ID,
                        data: 'OK',
                    })
                    break
                }

                client.SendMessage('base-response', {
                    AckMessageID: message.ID,
                    data: { error: `Invalid call id` },
                })
                break
            }
            default: {
                break
            }
        }
    }

    /**
     * @param {Models.Message} message
     * @param {string} channelID
     */
    HandleSendMessage(message, channelID) {
        const channel = this.GetChannel(channelID)

        if (!channel) {
            return {
                error: `Channel "${channelID}" not found`
            }
        }

        channel.Messages.push(message)
        this.SaveChannels()

        for (const client of this.Clients) {
            if (client.ActiveChannelID === channel.ID) {
                client.SendMessage('message-created', message)
            }
        }

        return 'OK'
    }

    /**
     * @param {string} messageID
     * @param {string} channelID
     */
    HandleDeleteMessage(messageID, channelID) {
        const channel = this.GetChannel(channelID)

        if (!channel) {
            return {
                error: `Channel "${channelID}" not found`
            }
        }

        for (let i = 0; i < channel.Messages.length; i++) {
            if (channel.Messages[i].ID !== messageID) {
                continue
            }
            channel.Messages.splice(i, 1)
            this.SaveChannels()

            for (const client of this.Clients) {
                if (client.ActiveChannelID === channel.ID) {
                    client.SendMessage('message-deleted', messageID)
                }
            }
            return 'OK'
        }
        
        return {
            error: `Message "${messageID}" not found`
        }
    }

    /**
     * @param {string} channelID
     */
    GetChannel(channelID) {
        for (const channel of this.Channels) {
            if (channel.ID === channelID) {
                return channel
            }
        }
        return null
    }

    /**
     * @param {string} channelID
     */
    CreateChannel(channelID) {
        if (this.GetChannel(channelID)) {
            return
        }
        this.Channels.push({
            ID: channelID,
            Messages: [],
        })
        this.SaveChannels()
    }

    /**
     * @param {string} userID
     * @returns {Models.Token}
     */
    GenerateToken(userID) {
        const newToken = {
            userID: userID,
            token: GUID(),
            expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        }
        this.Tokens.push(newToken)
        this.SaveTokens()
        return newToken
    }

    /**
     * @param {{ token: string; expiresAt: number; }} token
     */
    static GetTokenCookie(token) {
        return `token=${encodeURIComponent(token.token)}; expires=${new Date(token.expiresAt).toUTCString()}; path=/`
    }

    PurgeTokens() {
        for (let i = this.Tokens.length - 1; i >= 0; i--) {
            const token = this.Tokens[i]
            if (token.expiresAt <= Date.now()) {
                console.log(`[Purge]: Expired token has been deleted`, token)
                this.Tokens.splice(i, 1)
                continue
            }

            let isUsed = false
            for (const user of this.Clients) {
                if (user.ID === token.userID) {
                    isUsed = true
                    break
                }
            }

            if (!isUsed) {
                console.log(`[Purge]: Unused token has been deleted`, token)
                this.Tokens.splice(i, 1)
                continue
            }
        }

        this.SaveTokens()
    }

    PurgeClients() {
        for (let i = this.Clients.length - 1; i >= 0; i--) {
            const client = this.Clients[i]
            if (client.User.anonymous) {
                let hasToken = false
                for (const token of this.Tokens) {
                    if (token.userID === client.ID) {
                        hasToken = true
                        break
                    }
                }

                if (!hasToken) {
                    console.log(`[Purge]: Anonymous user without token has been deleted`, client)
                    this.Clients.splice(i, 1)
                    continue
                }
            }
        }
        this.SaveUsers()
    }

    /**
     * @param {ApiRequestHandler.HttpMethod} method
     * @param {string} path
     * @param {any} data
     */
    HandleApiRequest(method, path, data) { return this.Handler.Handle(path, method, data) }
}

module.exports = APIHandler