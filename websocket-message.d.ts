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
}> |
MessageHeaderBase<'begin-voice-response', {
    AckMessageID: string
    data: string | {
        error: string
    }
}> |
MessageHeaderBase<'voice', {
    voice: string,
    callID: string,
}> |
MessageHeaderBase<'begin-voice', string> |
MessageHeaderBase<'join-voice', string> |
MessageHeaderBase<'end-voice', string>

type MessageHeaderBase<TType, TContent = null> = {
    time: number
    type: TType
    data: TContent
    ID: string
}
