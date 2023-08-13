export = class ApiRequestHandler {
    readonly Handlers: Handler[]

    Register<T>(path: string, method: HttpMethod, callback: ApiRequestCallback<T>): void

    Handle(path: string, method: HttpMethod, data: any): ApiResult<any> | null
    
    Has(path: string): boolean
}

export type ApiResult<T> = {
    success: false
    httpCode: number
    message: string
    details?: object
} | {
    success: true
    httpCode: 200
    setCookie?: string
    data?: T
} | {
    success: true
    httpCode: 303
    setCookie?: string
    redirect: string
    data?: T
}

export type Handler = {
    path: string
    method: HttpMethod
    callback: ApiRequestCallback
}

export type HttpMethod = 'GET' | 'POST'

export type ApiRequestCallback<T = any> = (data: ApiRequestData, path: string) => ApiResult<T>

export type ApiRequestData = {
    [key: string]: string | number | boolean | object | undefined
}
