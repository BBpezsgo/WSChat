export class WebSocketManager {
    constructor(messageManager: (message: MessageHeader) => void)
    
    SendMessage(type: 'send-message', message: {
        content: string
        channel: string
    }, response?: ResponseCallback<any>)
    
    SendMessage(type: 'delete-message', message: {
        message: string
        channel: string
    }, response?: ResponseCallback<any>)
}

export type ResponseCallback<T> = (response: T) => void