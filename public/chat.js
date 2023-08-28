/** @ts-ignore @type {HTMLInputElement} */
const chatInput = document.getElementById('chat-input')
/** @ts-ignore @type {HTMLInputElement} */
const statusSocket = document.getElementById('status-socket')
/** @ts-ignore @type {HTMLImageElement} */
const statusSocketIcon = document.getElementById('status-socket-icon')
/** @ts-ignore @type {HTMLInputElement} */
const statusSession = document.getElementById('status-session')

/** @type {{ [messageID: string]: { content: string } | undefined }} */
const sendingMessages = { }

function LogOut() {
    Cookies.remove('token')
    location.reload()
}

/** @type {string | null} */
let CurrentVoice = null

/** @type {MediaRecorder | null} */
let Recorder = null

function BeginVoice() {
    /** @ts-ignore @type {HTMLButtonElement} */
    const button = document.getElementById('button-begin-voice')
    /** @ts-ignore @type {HTMLElement} */
    const buttonLabel = document.getElementById('button-begin-voice-label')

    button.disabled = true
    buttonLabel.innerText = `Loading ...`

    if (CurrentVoice) {
        ws.SendMessage('end-voice', CurrentVoice, response => {
            if (response !== 'OK') {
                console.warn(`[Voice]: Failed to end call: ${response.error}`)
                return
            }

            if (Recorder && Recorder.stream) {
                const tracks = Recorder.stream.getTracks()
                for (const track of tracks) {
                    track.stop()
                    Recorder.stream.removeTrack(track)
                }
            }

            button.disabled = false
            buttonLabel.innerText = `Begin Call`
            CurrentVoice = null
            
            // @ts-ignore
            document.getElementById('label-current-voice').innerText = ''
        })
        return
    }

    ws.SendMessage('begin-voice', ChatInformations?.channel ?? '', response => {
        button.disabled = false
        buttonLabel.innerText = `End Call`
        CurrentVoice = response

        HandleVoiceCall()
    })
}

/**
 * @param {string} callID
 */
function JoinCall(callID) {
    /** @ts-ignore @type {HTMLButtonElement} */
    const button = document.getElementById('button-begin-voice')
    /** @ts-ignore @type {HTMLElement} */
    const buttonLabel = document.getElementById('button-begin-voice-label')
    
    if (CurrentVoice) {
        console.warn(`[Voice]: Failed to join call "${callID}": already joined to call ${CurrentVoice}`)
        return
    }

    button.disabled = true
    buttonLabel.innerText = `Loading ...`

    ws.SendMessage('join-voice', callID, response => {
        if (response !== 'OK') {
            console.warn(`[Voice]: Failed to join call "${callID}": ${response.error}`)

            button.disabled = false
            buttonLabel.innerText = `Begin Call`
            CurrentVoice = null

            return
        }

        button.disabled = false
        buttonLabel.innerText = `Leave Call`
        CurrentVoice = callID

        HandleVoiceCall()
    })
}

function HandleVoiceCall() {
    if (!CurrentVoice) {
        return
    }

    if (!navigator || !navigator.mediaDevices) {
        console.warn(`[Voice]: Not supported`)
        return
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(HandleVoiceMedia)
        .catch(console.error)
}

/** @param {MediaStream} stream */
function HandleVoiceMedia(stream) {
    const time = 1000

    // @ts-ignore
    document.getElementById('label-current-voice').innerText = `In Voice Call`
    
    /** @type {Blob[]} */
    var audioChunks = []

    if (!Recorder) {
        Recorder = new MediaRecorder(stream)

        Recorder.addEventListener('dataavailable', e => audioChunks.push(e.data))

        Recorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks)

            audioChunks = []

            const fileReader = new FileReader()
            fileReader.readAsDataURL(audioBlob)
            fileReader.onloadend = () => {
                if (!CurrentVoice) { return }
                if (!fileReader.result) { return }

                const data = fileReader.result.toString()

                // @ts-ignore
                document.getElementById('label-current-voice').innerText = `In Voice Call`
                console.log(`[Voice]: Send data chunk`)
                ws.SendMessage('voice', {
                    voice: data,
                    callID: CurrentVoice,
                })
            }

            if (CurrentVoice && Recorder && Recorder.stream && Recorder.stream.active && Recorder.state !== 'recording') {
                Recorder.start()
            }

            setTimeout(() => {
                if (Recorder) Recorder.stop()
            }, time)
        })
    } else {
        Recorder.stream.addTrack(stream.getTracks()[0])
    }

    Recorder.start()

    setTimeout(() => {
        if (Recorder) Recorder.stop()
    }, time)
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
        case 'voice': {
            if (message.data.voice.startsWith('data:audio/ogg;')) {
                const audio = new Audio(message.data.voice)
                audio.play()
            } else {
                console.error(`[Voice]: Invalid audio data`)
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
        let messagePartialName = null
        switch (data.type) {
            case 1:
                messagePartialName = 'user_message'
                break
            case 2:
                messagePartialName = 'system_message'
                break
            case 3:
                messagePartialName = 'call_message'
                break
            default:
                reject(`Unknown message type ${data.type}`)
                return
        }
        TemplateAsync(messagePartialName, data)
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
