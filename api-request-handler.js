const Types = require('./api-request-handler')

class ApiRequestHandler {
    constructor() {
        /** @type {Types.Handler[]} */
        this.Handlers = [ ]
    }

    /**
     * @param {string} path
     * @param {Types.HttpMethod} method
     * @param {Types.ApiRequestCallback} callback
     */
    Register(path, method, callback) {
        for (const handler of this.Handlers) {
            if (handler.path === path && handler.method === method) {
                throw new Error(`API Handler "${method} ${path}" already registered`)
            }
        }

        this.Handlers.push({ path, method, callback, })
    }

    /**
     * @param {string} path
     * @param {Types.HttpMethod} method
     * @param {any} data
     * @returns {Types.ApiResult<any> | null}
     */
    Handle(path, method, data) {
        /** @type {Types.Handler | null} */
        let bestMatch = null
        
        for (const handler of this.Handlers) {
            bestMatch = ApiRequestHandler.GetBestHandler(bestMatch, handler, path, method)
        }

        if (!bestMatch) {
            return null
        }

        if (bestMatch.method !== method) {
            return {
                success: false,
                httpCode: 400,
                message: 'Method not allowed',
            }
        }

        return bestMatch.callback(data, path)
    }

    /**
     * @param {string} path
     */
    Has(path) {
        for (const handler of this.Handlers) {
            if (ApiRequestHandler.ComparePath(handler.path, path)) {
                return true
            }
        }

        return false
    }

    /**
     * @param {string} pathSelector
     * @param {string} path
     */
    static ComparePath(pathSelector, path) {
        if (pathSelector === path) { return true }

        if (pathSelector.length <= 0 && path.length <= 0) { return true }
        
        /**
         * @param {string} str
         * @param {string} rule
         * @link https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript
         */
        function matchRuleShort(str, rule) {
            const escapeRegex = (/** @type {string} */ str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
            return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
        }

        return matchRuleShort(path, pathSelector)
    }

    /**
     * @param {Types.Handler?} handlerA
     * @param {Types.Handler?} handlerB
     * @param {string} path
     * @param {Types.HttpMethod} method
     */
    static GetBestHandler(handlerA, handlerB, path, method) {
        if (!handlerA && !handlerB) { return null }

        if (!handlerA) { return handlerB }

        if (!handlerB) { return handlerA }

        if (handlerA.path === path && handlerA.method === method) { return handlerA }

        if (handlerB.path === path && handlerB.method === method) { return handlerB }

        if (handlerA.path === path) { return handlerA }

        if (handlerB.path === path) { return handlerB }

        if (ApiRequestHandler.ComparePath(handlerA.path, path)) { return handlerA }

        if (ApiRequestHandler.ComparePath(handlerB.path, path)) { return handlerB }

        return handlerA
    }
}

module.exports = ApiRequestHandler