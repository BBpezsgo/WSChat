declare global {
    declare const ChatInformations: null | ChatInfo
}

export type ChatInfo = {
    user: import('../models').PublicUser
    channel: string
}