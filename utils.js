const http = require('http')
const { Socket } = require('net')

/**
 * @param {http.IncomingMessage} request
 * @returns {Promise<string>}
 */
function ReceiveData(request) {
    return new Promise((resolve, reject) => {
        let data = ''
        request.on('data', chunk => {
            data += chunk.toString()
        })
        request.on('end', () => {
            resolve(data)
        })
        request.on('error', (error) => {
            reject(error)
        })
    })
}

/**
 * @param {Socket} socket
 */
function ReadableAddress(socket) {
    if (socket.remoteAddress) {
        return socket.remoteAddress
    }
    return null
}

/**
 * @param {string} path
 * @param {string[]} expectedParts
 */
function DisassemblePath(path, ...expectedParts) {
    if (!path || path.length <= 0 || path === '/') {
        if (expectedParts.length === 0) { return { } }
        return null
    }

    if (path.startsWith('/')) {
        path = path.substring(1)
    }

    if (path.endsWith('/')) {
        path = path.substring(0, path.length - 1)
    }
    
    let parts = path.split('/')
    /*
    for (let i = parts.length - 1; i >= 0; i--) {
        if (!parts[i] || parts[i].length <= 0) {
            parts.splice(i, 1)
        }
    }
    */
    
    if (parts.length === 0) { return null }

    /** @type {{ [part: string]: string | undefined }} */
    let result = {

    }

    for (const expectedPart of expectedParts) {
        result[expectedPart] = undefined
    }

    let partIndex = -1
    let expectedPartIndex = -1
    while (partIndex + 1 < parts.length) {
        partIndex++
        const part = parts[partIndex]
        
        expectedPartIndex++
        if (expectedPartIndex >= expectedParts.length) { return null }
        const expectedPart = expectedParts[expectedPartIndex]

        if (part !== expectedPart) { return null }

        partIndex++
        
        if (partIndex >= parts.length) { return null }

        const value = parts[partIndex]

        result[part] = value
    }

    if (expectedPartIndex < expectedParts.length - 1) { return null }

    return result
}

/**
 * @param {any} other
 */
function GenerateObject(other) {
    if (other === undefined) {
        return undefined
    }

    if (other === null) {
        return null
    }

    if (typeof other !== 'object') {
        return other
    }

    /** @type {any} */
    let result = {

    }

    for (const property in other) {
        if (!other[property]) {
            continue
        }
        result[property] = GenerateObject(other[property])
    }
    
    return result
}

module.exports = {
    ReceiveData,
    ReadableAddress,
    DisassemblePath,
    GenerateObject,
}