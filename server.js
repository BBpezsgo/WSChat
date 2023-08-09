const http = require('http')
const https = require('https')
const ws = require('ws')
const Path = require('path')
const fs = require('fs')
const Handlebars = require('handlebars')
const Client = require('./client')
const ParseForm = require('./utils/form-parser')
const GUID = require('./guid')

class ChatServer {

    get WebPath() { return Path.join(__dirname, 'web') }

    get Address() {
        if (this.WebServer === null) { return null }
        if (this.WebServer === undefined) { return null }
        const address = this.WebServer.address()
        if (address === null) return null
        if (typeof address === 'string') return address
        return address.address + ':' + address.port
    }

    /**
     * @param {string} address
     * @param {number} port
     */
    constructor(address, port) {
        const self = this

        Handlebars.registerPartial('base_message', function(context) {
            const content = fs.readFileSync(Path.join(__dirname, 'public', 'templates', 'base_message.hbs'), 'utf8')
            return Handlebars.compile(content)(context)
        })
        
        Handlebars.registerPartial('system_message', function(context) {
            const content = fs.readFileSync(Path.join(__dirname, 'public', 'templates', 'system_message.hbs'), 'utf8')
            return Handlebars.compile(content)(context)
        })
        
        Handlebars.registerPartial('user_message', function(context) {
            const content = fs.readFileSync(Path.join(__dirname, 'public', 'templates', 'user_message.hbs'), 'utf8')
            return Handlebars.compile(content)(context)
        })

        require('./handlebar-helpers')(Handlebars)
          
        this.WebServer = http.createServer({
            // @ts-ignore
            key: fs.readFileSync(Path.join(__dirname, 'private.pem')),
            cert: fs.readFileSync(Path.join(__dirname, 'cert.pem'))
        }, (req, res) => {
            // @ts-ignore
            self.OnWebRequest(req, res)
        })

        this.SocketServer = new ws.Server({
            server: this.WebServer,
        })

        this.SocketServer.on('connection', (socket, req) => {
            console.log(`[WS]: Client connected`)

            const clientID = this.API.GetUserID(req)

            if (!clientID) {
                socket.close(undefined, 'User ID not specified')
                return
            }
            
            const client = self.API.GetUser(clientID)

            if (!client) {
                socket.close(undefined, 'User not found')
                return
            }
            
            client.SetWebSocket(socket)

            /*
            socket.on('close', () => {
                self.API.HandleSendMessage({
                    type: Models.MessageType.SYSTEM,
                    time: Date.now(),
                    content: `User <b>${client.User.name}</b> disconnected`,
                    ID: GUID(),
                })
            })
            
            self.API.HandleSendMessage({
                type: Models.MessageType.SYSTEM,
                time: Date.now(),
                content: `User <b>${client.User.name}</b> connected`,
                ID: GUID(),
            })
            */
        })

        this.SocketServer.on('error', console.error)

        this.SocketServer.on('close', () => {
            console.log(`[WS]: Closed`)
        })

        this.WebServer.on('clientError', (error) => {
            console.log(`[HTTP]: ${'clientError'}`, error)
        })

        this.WebServer.on('close', () => {
            console.log(`[HTTP]: ${'close'}`)
        })

        this.WebServer.on('connect', () => {
            console.log(`[HTTP]: ${'connect'}`)
        })

        this.WebServer.on('connection', () => {
            console.log(`[HTTP]: ${'connection'}`)
        })

        this.WebServer.on('request', () => {
            console.log(`[HTTP]: ${'request'}`)
        })

        this.WebServer.on('listening', () => {
            console.log(`[HTTP]: Listening on ${this.Address}`)
        })

        this.WebServer.listen(port, address)

        this.API = new(require('./api'))(this)
        
        this.API.LoadUsers()
        this.API.LoadChannels()
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    OnWebRequest(req, res) {
        let url = new URL(req.url ?? '/', `http://${req.headers.host}`)

        if (this.HandlePath(req, res)) {
            this.API.SaveUsers()
            return
        }

        if (req.method !== 'GET') {
            res.writeHead(400, 'Method not allowed').end()
            return
        }

        const publicPath = Path.join(__dirname, 'public')
        let path = Path.join(publicPath, url.pathname)
        if (!path.startsWith(publicPath)) {
            res.writeHead(400, 'Acces denied').end()
            return
        }

        if (!fs.existsSync(path)) {
            res.writeHead(404, 'Not found').end()
            return
        }
        
        const fstat = fs.statSync(path)
        
        if (!fstat.isFile()) {
            res.writeHead(400, 'Invalid path').end()
            return
        }

        ChatServer.SendFile(path, res)
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @returns {boolean}
     */
    HandlePath(req, res) {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

        if (url.pathname === '/cookie.js') {
            ChatServer.SendFile(Path.join(__dirname, 'node_modules', 'js-cookie', 'dist', 'js.cookie.js'), res)
            return true
        }

        let clientID = this.API.GetUserID(req)

        if (url.pathname === '/') {
            if (req.method !== 'GET') {
                res.writeHead(400, 'Method not allowed').end()
                return true
            }

            const client = this.API.GetUser(clientID)

            if (!client) {
                const result = Handlebars.compile(fs.readFileSync(Path.join(__dirname, 'web', 'login.hbs'), 'utf8'))({
                    
                })
                res.writeHead(200, undefined, {
                    'content-type': 'text/html'
                })
                res.write(result, (error) => {
                    if (error) { console.error(error) }
                })
                res.end()
                return true
            }

            client.Authorized = true

            client.SetHttpSocket(req.socket)

            let selectedChannelID = url.searchParams.get('channel')

            if (!selectedChannelID) {
                res.writeHead(303, 'No channel selected', {
                    'Location': '/?channel=default',
                })
                res.end()
                return true
            }

            let channel = this.API.GetChannel(selectedChannelID)
            
            if (channel === null && selectedChannelID === 'default') {
                this.API.CreateChannel(selectedChannelID)
                channel = this.API.GetChannel(selectedChannelID)
            }

            if (channel === null) {
                res.writeHead(404, `Channel "${selectedChannelID}" not found`)
                res.end()
                return true
            }

            client.ActiveChannelID = selectedChannelID

            const messages = channel.Messages.map(v => {
                return {
                    ...v,
                    sender: this.API.GetUser(v.senderID)?.User,
                }
            })

            const channels = this.API.Channels
            
            const result = Handlebars.compile(fs.readFileSync(Path.join(__dirname, 'web', 'index.hbs'), 'utf8'))({
                messages: messages,
                channels: channels,
                channel: channel,
                user: client.User,
                users: this.API.Clients.map(v => v.GetUser()),
            })
            res.writeHead(200, undefined, {
                'content-type': 'text/html'
            })
            res.write(result, (error) => {
                if (error) { console.error(error) }
            })
            res.end()
            return true
        }

        if (url.pathname === '/login') {
            if (req.method !== 'POST') {
                res.writeHead(400, 'Bruh')
                res.end()
                return true
            }

            let client = this.API.GetUser(clientID)

            if (!client) {
                clientID = GUID()
                this.API.Clients.push(new Client(clientID, this))
            }

            client = this.API.GetUser(clientID)

            if (!client) {
                throw new Error('WTF???')
            }

            client.SetHttpSocket(req.socket)

            var data = ''
            req.on('data', chunk => data += chunk.toString())
            req.on('end', () => {
                if (!client) {
                    throw new Error('WTF???')
                }

                const form = ParseForm(data)
                if (form['username']) {
                    client.Authorized = true
                    client.User.name = form['username']
                    this.API.SaveUsers()
                    console.log('User authorized', this.API.GetUser(clientID))
                    res.writeHead(303, 'OK', {
                        'Set-Cookie': `account=${encodeURIComponent(client.ID)};max-age=${6000}`,
                        'Location': `/?channel=${client.ActiveChannelID ?? 'default'}`,
                    })

                    /*
                    const result = Handlebars.compile(fs.readFileSync(Path.join(__dirname, 'web', 'login-redirect.hbs'), 'utf8'))({
                        url: `/`,
                    })
                    res.write(result)
                    */

                    res.end()
                } else {
                    res.writeHead(400)
                    res.end()
                }
            })
            return true
        }

        return false
    }

    /**
     * @param {string} path
     * @param {http.ServerResponse} res
     */
    static SendFile(path, res) {
        const extension = Path.extname(path).toLowerCase().substring(1)

        /**
         * @type {{
         *   [ext: string]: string | undefined
         * }}
         */
        const mimeTypes = {
            'hbs': 'text/plain',
            'html': 'text/html',
            'js': 'text/javascript',
            'css': 'text/css',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'wav': 'audio/wav',
            'mp4': 'video/mp4',
            'woff': 'application/font-woff',
            'ttf': 'application/font-ttf',
            'eot': 'application/vnd.ms-fontobject',
            'otf': 'application/font-otf',
            'wasm': 'application/wasm',
            'ico': 'image/icon',
        }
    
        const contentType = mimeTypes[extension] || 'application/octet-stream'
    
        fs.readFile(path, function (error, content) {
            if (error) {
                if (error.code == 'ENOENT') {
                    res.writeHead(404, 'Not found')
                    res.end()
                    return
                }

                res.writeHead(500)
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n')
                return
            } else {
                res.writeHead(200, { 'Content-Type': contentType })
                res.end(content, 'utf-8')
            }
        })
    }

    /**
     * @param {Client} client
     * @param {import('./websocket-message').MessageHeader} message
     */
    OnWsMessage(client, message) {
        if (!client.Authorized) {
            client.SendMessage('base-response', {
                AckMessageID: message.ID,
                data: {
                    error: 'Not authorized'
                },
            })
            return
        }
        
        this.API.Handle(message, client)
    }
}

module.exports = ChatServer