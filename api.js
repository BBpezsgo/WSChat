const fs = require('fs')
const Path = require('path')
const http = require('http')

const Client = require('./client')
const Models = require('./models')
const ParseCookies = require('./utils/cookie-parser')
const ChatServer = require('./server')
const GUID = require('./guid')

class APIHandler {
    /**
     * @param {ChatServer} server
     */
    constructor(server) {
        /** @type {Client[]} */
        this.Clients = []

        /** @type {Models.Channel[]} */
        this.Channels = []

        this.Server = server
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
                rawClients.push(client.GetRaw())
            }
            fs.writeFileSync(Path.join(__dirname, 'storage', 'users.json'), JSON.stringify(rawClients, null, ' '), 'utf8')
        } catch (error) { console.error(error) }
    }

    LoadUsers() {
        if (!fs.existsSync(Path.join(__dirname, 'storage', 'users.json'))) {
            return
        }

        try {
            const raw = fs.readFileSync(Path.join(__dirname, 'storage', 'users.json'), 'utf8')
            /** @type {any[]} */
            const rawClients = JSON.parse(raw)
            for (const rawClient of rawClients) {
                const newClient = new Client(rawClient.id, this.Server)
                newClient.User = rawClient.user
                newClient.ActiveChannelID = rawClient.ActiveChannelID
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

    /**
     * @param {string | null | undefined} userID
     */
    GetUser(userID) {
        if (!userID)
        { return null }

        for (const client of this.Clients) {
            if (client.ID === userID)
            { return client }
        }

        return null
    }

    /**
     * @param {http.IncomingMessage} req
     */
    GetUserID(req) {
        if (req.headers.cookie) {
            const cookies = ParseCookies(req.headers.cookie)
            const accountCookie = cookies['account']
            if (accountCookie && accountCookie.value) {
                return accountCookie.value
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
}

module.exports = APIHandler