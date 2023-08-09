import Models from './models'

export type MessageHeader = 
MessageHeaderBase<'send-message', {
    content: string
    channel: string
}> |
MessageHeaderBase<'delete-message', {
    message: string
    channel: string
}> |
MessageHeaderBase<'message-created', Models.Message> |
MessageHeaderBase<'message-deleted', string> |
MessageHeaderBase<'base-response', {
    AckMessageID: string
    data: 'OK' | {
        error: string
    }
}>

type MessageHeaderBase<TType, TContent = null> = {
    time: number
    type: TType
    data: TContent
    ID: string
}
