export enum MessageType {
    UNKNOWN = 0,
    USER = 1,
    SYSTEM = 2,
}

export type Message = PartialMessage & {
    sender?: PublicUser
}

export type PublicUser = {
    name: string
    lastAction: number
    admin?: boolean
}

export type PartialMessage = {
    ID: string
    type: MessageType
    senderID?: string
    time: number
    content: string
}

export type Channel = {
    ID: string
    Messages: PartialMessage[]
}