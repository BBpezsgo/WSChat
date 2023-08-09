export class WebSocketManager {
    constructor(messageManager: (message: MessageHeader) => void)
    
    SendMessage(type: 'send-message', message: {
        content: string
        channel: string
    }, response?: ResponseCallback)
    
    SendMessage(type: 'delete-message', message: {
        message: string
        channel: string
    }, response?: ResponseCallback)
}
