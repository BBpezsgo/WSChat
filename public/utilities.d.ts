declare let TemplateCache: Cache | null
declare let CustomTemplateCache: { [key: string]: string | undefined }

declare global {
    function IsSecure(): boolean

    function CreateElement(htmlString: string): Element
    
    function TemplateAsync(name: any, values: any): Promise<Element>
    
    function TryGetElement(id: any): HTMLElement | null
    function GetElement(id: any): HTMLElement
    
    function GetImageElement(id: any): HTMLElement
    
    function TryGetInputElement(id: any): HTMLInputElement | null
    function GetInputElement(id: any): HTMLInputElement
    
    function ClearElement(element: any): void
    
    /**
     * @author Angelos Chalaris
     * @link https://www.30secondsofcode.org/js/s/levenshtein-distance
     */
    function LevenshteinDistance(s: any, t: any): any
    
    function NormalizeString(v: any): any
    
    /**
     * @param maxDifference Must be larger than -1
     * @returns True if `b` is contained in `a` by the specified maximum difference
     */
    function CompareString(a: any, b: any, maxDifference: any, trueIfBEmpty?: boolean): boolean
}
