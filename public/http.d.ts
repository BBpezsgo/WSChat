declare global {
    declare function Get(url: string | URL, timeout?: number): string
    declare function GetAsync(url: string | URL, timeout?: number): Promise<string>
    
    declare function SendRequest(url: string | URL, method: string, timeout?: number): string
    declare function SendRequestAsync(url: string | URL, method: string, timeout?: number): Promise<string>
    
    declare function CheckUrl(url: string | URL, timeout?: number): Promise<number>
}
