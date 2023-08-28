export class WebSocketManager {
    constructor(messageManager: (message: MessageHeader) => void)
    
    SendMessage(type: 'send-message', message: {
        content: string
        channel: string
    }, response?: ResponseCallback<SimpleResponse>)
    
    SendMessage(type: 'delete-message', message: {
        message: string
        channel: string
    }, response?: ResponseCallback<SimpleResponse>)
    
    SendMessage(type: 'end-voice', message: string, response?: ResponseCallback<SimpleResponse>)
    
    SendMessage(type: 'begin-voice', message: string, response?: ResponseCallback<string>)
    
    SendMessage(type: 'join-voice', message: string, response?: ResponseCallback<SimpleResponse>)
    
    SendMessage(type: 'voice', message: {
        callID: string
        voice: string
    }, response?: ResponseCallback<SimpleResponse>)
}

export type SimpleResponse = 'OK' | { error: string }

export type ResponseCallback<T> = (response: T) => void