export enum MessageType {
    UNKNOWN = 0,
    USER = 1,
    SYSTEM = 2,
}

export type Message = PartialMessage & {
    sender?: PublicUser
}

export type PrivateUser = PublicUser & {
    password: string
}

export type PublicUser = {
    name: string
    lastAction: number
    admin?: boolean
}

export type ActiveUser = PublicUser & {
    isOnline: boolean
}

export type SerializedUser = {
    id: string
    state: UserState
    user: PublicUser
    sensitive: SensitiveData
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

export type UserState = {
    /**
     * Active channel id
     */
    channel: string | null
}

export type SensitiveData = {
    password: string
}

export type Token = {
    token: string
    userID: string
    expiresAt: number
}

export type TokenRecord = object &
    Record<"token", unknown> &
    Record<"userID", unknown> &
    Record<"expiresAt", unknown>

