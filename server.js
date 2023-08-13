const http = require('http')
const https = require('https')
const ws = require('ws')
const Path = require('path')
const fs = require('fs')
const Handlebars = require('handlebars')
const Client = require('./client')
const ParseForm = require('./utils/form-parser')
const Utils = require('./utils')
const APIHandler = require('./api')
const ANSI = require('./ansi')

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
     * @param {boolean} secure
     */
    constructor(address, port, secure) {
        const self = this

        /** @type {boolean} */
        this.IsSecure = secure

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

        eval(fs.readFileSync(Path.join(__dirname, '/utils/handlebar-helpers.js'), 'utf8'))
        
        if (this.IsSecure) {
            const certificatePath = require('./certificate.json')

            const key = fs.readFileSync(certificatePath.key)
            const certificate = fs.readFileSync(certificatePath.cert)

            this.WebServer = https.createServer({
                key: key,
                cert: certificate,
            }, (req, res) => {
                self.OnWebRequest(req, res)
            })
        } else {
            this.WebServer = http.createServer({

            }, (req, res) => {
                self.OnWebRequest(req, res)
            })
        }

        this.SocketServer = new ws.Server({
            server: this.WebServer,
        })

        this.SocketServer.on('connection', (socket, req) => {
            const address = Utils.ReadableAddress(req.socket)
            console.log(`${ANSI.FG.Gray}[WS]:   <<< ${address}${ANSI.RESET}`)

            const token = this.API.GetToken(APIHandler.GetTokenFromRequest(req))

            if (!token) {
                socket.close(1000, 'Invalid token')
                return
            }
            const client = self.API.GetUserByToken(token)

            if (!client) {
                socket.close(1000, 'User not found')
                return
            }

            client.SetToken(token)

            if (!client.IsAuthorized) {
                socket.close(1000, 'Unauthorized')
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
            console.log(`[WS]:   Closed`)
        })

        this.WebServer.on('clientError', (error) => {
            console.log(`${ANSI.FG.Gray}[HTTP]: ${ANSI.FG.Red}Client Error${ANSI.FG.Gray}`, error)
        })

        this.WebServer.on('close', () => {
            console.log(`[HTTP]: Closed`)
        })

        this.WebServer.on('connect', () => {
            console.log(`[HTTP]: ${'connect'}`)
        })

        this.WebServer.on('connection', (socket) => {
            console.log(`${ANSI.FG.Gray}[HTTP]: <<< ${Utils.ReadableAddress(socket)}${ANSI.RESET}`)
        })

        this.WebServer.on('request', (req) => {
            console.log(`${ANSI.FG.Gray}[HTTP]: < ${Utils.ReadableAddress(req.socket)} ${req.method} ${req.url} ${ANSI.RESET}`)
        })

        this.WebServer.on('listening', () => {
            console.log(`${ANSI.FG.Gray}[HTTP]: ${ANSI.FG.Green}Listening on ${this.Address}${ANSI.RESET}`)
        })

        this.WebServer.listen(port, address)

        this.API = new(require('./api'))(this)
        
        this.API.LoadUsers()
        this.API.LoadChannels()
        this.API.LoadTokens()
        this.API.PurgeTokens()
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    OnWebRequest(req, res) {
        const rawUrl = req.url ?? '/'
        const url = new URL(rawUrl, `${(this.IsSecure ? 'https' : 'http')}://${req.headers.host}`)

        if (this.HandlePath(req, res)) {
            this.API.SaveUsers()
            return
        }

        if (req.method !== 'GET') {
            ChatServer.SendError(400, res)
            return
        }

        if (url.pathname === '/cookie.js') {
            ChatServer.SendFile(Path.join(__dirname, 'node_modules', 'js-cookie', 'dist', 'js.cookie.js'), res)
            return
        }

        if (url.pathname === '/handlebars.js') {
            ChatServer.SendFile(Path.join(__dirname, 'public', 'handlebars.js'), res)
            return
        }

        if (url.pathname === '/utils/handlebar-helpers.js') {
            ChatServer.SendFile(Path.join(__dirname, 'utils', 'handlebar-helpers.js'), res)
            return
        }

        if (url.pathname === '/utils/handlebar-partials.json') {
            ChatServer.SendFile(Path.join(__dirname, 'utils', 'handlebar-partials.json'), res)
            return
        }

        const publicPath = Path.join(__dirname, 'public')
        let path = Path.join(publicPath, url.pathname)
        if (!path.startsWith(publicPath)) {
            ChatServer.SendError(403, res)
            return
        }

        if (!fs.existsSync(path)) {
            ChatServer.SendError(404, res)
            return
        }
        
        const fstat = fs.statSync(path)
        
        if (!fstat.isFile()) {
            ChatServer.SendError(403, res)
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
        const url = new URL(req.url ?? '/', `${(this.IsSecure ? 'https' : 'http')}://${req.headers.host}`)

        const receivedToken = this.API.GetToken(APIHandler.GetTokenFromRequest(req))

        /** @type {{ [key: string]: string | undefined }} */
        const params = { }
        url.searchParams.forEach((value, key) => { params[key] = value })
        
        if (url.pathname.startsWith('/api')) {
            const apiPath = url.pathname.replace('/api', '')

            if (!this.API.Handler.Has(apiPath)) {
                return false
            }

            Utils.ReceiveData(req)
                .then(data => {
                    const form = ParseForm(data)

                    let collectedData = {
                        ...form,
                        ...params,
                    }

                    const result = this.API.HandleApiRequest(req.method ?? 'GET', apiPath, {
                        ...collectedData,
                        receivedToken: receivedToken,
                    })

                    if (!result.success) {  
                        ChatServer.SendError(result, res)
                        return
                    }

                    /** @type {http.OutgoingHttpHeaders} */
                    let headers = { }

                    if (result.setCookie) {
                        headers['Set-Cookie'] = result.setCookie
                    }

                    if (result.httpCode === 303) {
                        headers['Location'] = result.redirect
                    }

                    if (result.data) {
                        const format = (collectedData['format'] ?? 'json').toLowerCase()

                        let responseData

                        switch (format) {
                            case 'json_readable': {
                                responseData = JSON.stringify(result.data, null, ' ')
                                break
                            }

                            case 'json':
                            default: {
                                responseData = JSON.stringify(result.data)
                                break
                            }
                        }

                        headers['Content-Type'] = 'application/json'
                        res.writeHead(result.httpCode, 'OK', headers)
                        res.write(responseData, 'utf8', error => {
                            if (error) { console.error(error) }
                        })
                        res.end()
                    } else {
                        res.writeHead(result.httpCode, 'OK', headers).end()
                    }
                })
                .catch(error => {
                    console.error(error)
                    ChatServer.SendError({ httpCode: 500, message: 'Internal error', details: error }, res)
                })

            return true
        }

        const disassembledPath =
            Utils.DisassemblePath(url.pathname) ??
            Utils.DisassemblePath(url.pathname, 'channel')

        if (!disassembledPath) {
            return false
        }

        let info = {
            channel: disassembledPath['channel'] ?? 'default',
        }

        info = {
            ...info,
            ...params,
        }

        if (req.method !== 'GET') {
            ChatServer.SendError(405, res)
            return true
        }

        const isTokenExpired = (receivedToken ? (receivedToken.expiresAt <= Date.now()) : null)

        const client = this.API.GetUserByToken(receivedToken)
        
        if (client) { client.RemoteAddress = Utils.ReadableAddress(req.socket) }

        if (isTokenExpired || !client) {
            ChatServer.SendDynamicFile(Path.join(__dirname, 'web', 'login.hbs'), {
                
            }, res)
            return true
        }

        client.SetHttpSocket(req.socket)
        client.SetToken(receivedToken)

        let channel = this.API.GetChannel(info.channel)
        
        if (channel === null && info.channel === 'default') {
            this.API.CreateChannel(info.channel)
            channel = this.API.GetChannel(info.channel)
        }

        if (channel === null) {
            ChatServer.SendError({ httpCode: 404, message: `Channel "${info.channel}" not found` }, res)
            return true
        }

        client.ActiveChannelID = info.channel

        const messages = channel.Messages.map(v => {
            return {
                ...v,
                sender: this.API.GetUserByID(v.senderID)?.User,
            }
        })

        const channels = this.API.Channels

        /** @type {import('./public/chat-info').ChatInfo} */
        const chatInfo = {
            user: client.User,
            channel: channel.ID,
        }
        
        ChatServer.SendDynamicFile(Path.join(__dirname, 'web', 'index.hbs'), {
            messages: messages,
            channels: channels,
            channel: channel,
            user: client.User,
            users: this.API.Clients.map(v => v.ActiveUser),
            chatInfo: chatInfo,
        }, res)
        return true
    }

    /**
     * @param {string} path
     * @param {http.ServerResponse} res
     * @param {number | null} maxAge
     */
    static SendFile(path, res, maxAge = null) {
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

        if (!maxAge) {
            const cacheControlDataPath = path + '.cache.json'
            if (fs.existsSync(cacheControlDataPath)) {
                const cacheControlData = fs.readFileSync(cacheControlDataPath, 'utf8')
                try {
                    const cacheControl = JSON.parse(cacheControlData)
                    if (cacheControl && typeof cacheControl === 'number') {
                        maxAge = cacheControl
                    }
                } catch (error) { console.error(error) }
            }
        }

        if (!maxAge) {
            const cacheControlDataPath = Path.join(Path.dirname(path), '.cache.json')
            if (fs.existsSync(cacheControlDataPath)) {
                const cacheControlData = fs.readFileSync(cacheControlDataPath, 'utf8')
                try {
                    const cacheControl = JSON.parse(cacheControlData)
                    if (cacheControl && typeof cacheControl === 'number') {
                        maxAge = cacheControl
                    }
                } catch (error) { console.error(error) }
            }
        }
    
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
                /** @type {http.OutgoingHttpHeaders} */
                let headers = {
                    'content-type': contentType,
                }
                if (maxAge && maxAge > 0) {
                    headers['cache-control'] = 'max-age=' + maxAge
                }
                res.writeHead(200, headers)
                res.end(content, 'utf-8')
            }
        })
    }

    /**
     * @param {string} path
     * @param {any} data
     * @param {http.ServerResponse} res
     * @param {number} httpCode
     * @param {string | undefined} message
     */
    static SendDynamicFile(path, data, res, httpCode = 200, message = undefined) {
        const html = fs.readFileSync(path, 'utf8')
        ChatServer.SendDynamicPage(html, data, res, httpCode, message)
    }

    /**
     * @param {string} html
     * @param {any} data
     * @param {http.ServerResponse} res
     * @param {number} httpCode
     * @param {string | undefined} message
     */
    static SendDynamicPage(html, data, res, httpCode = 200, message = undefined) {
        const result = Handlebars.compile(html)(data)
        res.writeHead(httpCode, message, {
            'content-type': 'text/html'
        })
        res.write(result, (error) => {
            if (error) { console.error(error) }
        })
        res.end()
    }

    /**
     * @param {{ httpCode: number, message?: string, details?: any } | number} details
     * @param {http.ServerResponse} res
     */
    static SendError(details, res) {
        /** @type {{ [code: number]: string | undefined }} */
        const codes = {
            100: "Continue",
            101: "Switching Protocols",
            102: "Processing",
            103: "Early Hints",

            200: "OK",
            201: "Created",
            202: "Accepted",
            203: "Non-Authoritative Information",
            204: "No Content",
            205: "Reset Content",
            206: "Partial Content",
            207: "Multi-Status",
            208: "Already Reported",
            
            226: "IM Used",
            
            300: "Multiple Choices",
            301: "Moved Permanently",
            302: "Found",
            303: "See Other",
            304: "Not Modified",
            305: "Use Proxy",
            306: "(Unused)",
            307: "Temporary Redirect",
            308: "Permanent Redirect",
            
            400: "Bad Request",
            401: "Unauthorized",
            402: "Payment Required",
            403: "Forbidden",
            404: "Not Found",
            405: "Method Not Allowed",
            406: "Not Acceptable",
            407: "Proxy Authentication Required",
            408: "Request Timeout",
            409: "Conflict",
            410: "Gone",
            411: "Length Required",
            412: "Precondition Failed",
            413: "Content Too Large",
            414: "URI Too Long",
            415: "Unsupported Media Type",
            416: "Range Not Satisfiable",
            417: "Expectation Failed",
            418: "(Unused)",
            
            421: "Misdirected Request",
            422: "Unprocessable Content",
            423: "Locked",
            424: "Failed Dependency",
            425: "Too Early",
            426: "Upgrade Required",
            427: "Unassigned",
            428: "Precondition Required",
            429: "Too Many Requests",
            430: "Unassigned",
            431: "Request Header Fields Too Large",
            
            451: "Unavailable For Legal Reasons",
            
            500: "Internal Server Error",
            501: "Not Implemented",
            502: "Bad Gateway",
            503: "Service Unavailable",
            504: "Gateway Timeout",
            505: "HTTP Version Not Supported",
            506: "Variant Also Negotiates",
            507: "Insufficient Storage",
            508: "Loop Detected",
            509: "Unassigned",
            510: "Not Extended (OBSOLETED)",
            511: "Network Authentication Required",
        }

        let _details
        let httpCode
        let message

        if (typeof details === 'number') {
            httpCode = details
            message = undefined
            
            _details = { }
        } else {
            httpCode = details.httpCode
            message = details.message

            _details = details
        }

        const result = Handlebars.compile(fs.readFileSync(Path.join(__dirname, 'web', 'error.hbs'), 'utf8'))({
            ..._details,
            httpCode: httpCode,
            message: message ?? codes[httpCode],
        })
        res.writeHead(httpCode, message, {
            'content-type': 'text/html'
        })
        res.write(result, (error) => {
            if (error) { console.error(error) }
        })
        res.end()
    }

    /**
     * @param {Client} client
     * @param {import('./websocket-message').MessageHeader} message
     */
    OnWsMessage(client, message) {
        if (!client.IsAuthorized) {
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