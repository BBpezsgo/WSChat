/** @type {HTMLInputElement} */
// @ts-ignore
const chatInput = document.getElementById('chat-input')
/** @type {HTMLInputElement} */
// @ts-ignore
const statusSocket = document.getElementById('status-socket')
/** @type {HTMLInputElement} */
// @ts-ignore
const statusSession = document.getElementById('status-session')

const messages = [ ]

function LogOut() {
    Cookies.remove('account')
    location.reload()
}

/**
 * @param {KeyboardEvent} e
 */ 
function OnKeyPress(e) {
    if (e.key === 'Enter') { SendMessage() }
}

function GetCurrentChannel() {
    return new URL(window.location.href).searchParams.get('channel')
}

function SendMessage() {
    if (!chatInput.value || chatInput.value.length <= 0) {
        return
    }
    
    ws.SendMessage('send-message', {
        content: chatInput.value,
        channel: GetCurrentChannel() ?? '',
    }, console.log)

    chatInput.value = ''
}

/**
 * @param {string} id
 */ 
function DeleteMessage(id) {
    ws.SendMessage('delete-message', {
        message: id,
        channel: GetCurrentChannel() ?? '',
    }, console.log)
}

statusSocket.innerText = 'Connecting ...'
/** @type {import('./socket').WebSocketManager} */
const ws = new WebSocketManager(OnWebSocketMessage)

/**
 * @param {import('../websocket-message').MessageHeader} message
 */
function OnWebSocketMessage(message) {
    switch (message.type) {
        case 'message-created': {
            messages.push(message.data)
            TemplateAsync('base_message', message.data)
                .then(element => {
                    const messagesElement = GetElement('messages')
                    const mustScroll = (messagesElement.clientHeight - messagesElement.scrollTop < 100)
                    messagesElement.appendChild(element)
                    if (mustScroll) {
                        messagesElement.scrollTo(0, messagesElement.scrollHeight)
                    }
                })
                .catch(console.error)
            break
        }
        case 'message-deleted': {
            const messageElement = TryGetElement('message-' + message.data)
            if (messageElement) {
                messageElement.remove()
            }
            break
        }
        default: {
            break
        }
    }
}

function GUID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < length; i++) {
        const num = Math.random()
        const char = chars[Math.round(num * chars.length)]
        result += char
    }
    return result
}

if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/test.js', { scope: '/', type: 'classic' })
        .then(registration => {
            if (registration.installing) {
                console.log("Service worker installing")
            } else if (registration.waiting) {
                console.log("Service worker installed")
            } else if (registration.active) {
                console.log("Service worker active")
            }
            registration.sync.register('myFirstSync')
        })
        .catch(console.error)
}

const currentChannelElement = TryGetElement('channel-' + GetCurrentChannel())
if (currentChannelElement) {
    currentChannelElement.classList.add('channel-selected')
}
