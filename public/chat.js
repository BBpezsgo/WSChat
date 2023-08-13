/** @ts-ignore @type {HTMLInputElement} */
const chatInput = document.getElementById('chat-input')
/** @ts-ignore @type {HTMLInputElement} */
const statusSocket = document.getElementById('status-socket')
/** @ts-ignore @type {HTMLInputElement} */
const statusSession = document.getElementById('status-session')

/** @type {{ [messageID: string]: { content: string } | undefined }} */
const sendingMessages = { }

function LogOut() {
    Cookies.remove('token')
    location.reload()
}

/**
 * @param {KeyboardEvent} e
 */ 
function OnKeyPress(e) {
    if (e.key === 'Enter') { SendMessage() }
}

function SendMessage() {
    if (!chatInput.value || chatInput.value.length <= 0) {
        return
    }

    const messageContent = chatInput.value

    const messageID = ('sending-message-' + GUID())

    TemplateAsync('sending_message', {
        ID: messageID,
        content: messageContent,
        sender: {
            name: '?',
        },
        time: Date.now(),
    }).then(element => {
            const messagesElement = GetElement('messages')

            const mustScroll = (messagesElement.clientHeight - messagesElement.scrollTop < 100)

            messagesElement.appendChild(element)
            sendingMessages[messageID] = {
                content: messageContent
            }

            if (mustScroll) {
                messagesElement.scrollTo(0, messagesElement.scrollHeight)
            }

            ws.SendMessage('send-message', {
                content: messageContent,
                channel: ChatInformations?.channel ?? '',
            })
        }).catch(console.error)
    
    chatInput.value = ''
}

/**
 * @param {string} id
 */ 
function DeleteMessage(id) {
    ws.SendMessage('delete-message', {
        message: id,
        channel: ChatInformations?.channel ?? '',
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
            GenerateMessageElement(message.data)
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

/**
 * @param {import('../models').Message} data
 * @returns {Promise<HTMLElement>}
 */
function GenerateMessageElement(data) {
    return new Promise((resolve, reject) => {
        TemplateAsync('base_message', data)
            .then(element => {
                const messagesElement = GetElement('messages')
                
                let existingMessageElement = null

                for (const key in sendingMessages) {
                    const value = sendingMessages[key]
                    if (!value) { continue }
                    if (value.content !== data.content) { continue }
                    existingMessageElement = TryGetElement(key)
                    sendingMessages[key] = undefined
                }

                if (existingMessageElement) {
                    existingMessageElement.outerHTML = element.outerHTML
                    resolve(existingMessageElement)
                } else {
                    const mustScroll = (messagesElement.clientHeight - messagesElement.scrollTop < 100)
                    const newElement = messagesElement.appendChild(element)
                    if (mustScroll) {
                        messagesElement.scrollTo(0, messagesElement.scrollHeight)
                    }
                    // @ts-ignore
                    resolve(newElement)
                }
            })
            .catch(reject)
    })
}

function GUID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 16; i++) {
        const num = Math.random()
        const char = chars[Math.round(num * chars.length)]
        result += char
    }
    return result
}

const currentChannelElement = TryGetElement('channel-' + ChatInformations?.channel)
if (currentChannelElement) {
    currentChannelElement.classList.add('channel-selected')
}
