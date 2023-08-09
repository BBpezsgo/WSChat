// Some HTTP utilities

/**
 * @param {string | URL} url
 */
function Get(url, timeout = 0) { return SendRequest(url, 'GET', timeout) }

/**
 * @param {string | URL} url
 */
function GetAsync(url, timeout = 0) { return SendRequestAsync(url, 'GET', timeout) }

/**
 * @param {string | URL} url
 * @param {string} method
 */
function SendRequest(url, method, timeout = 0) {
    const req = new XMLHttpRequest()
    req.timeout = timeout
    req.ontimeout = () => { throw new Error(`Request timeout, readyState: ${req.readyState}, status: ${req.status}`) }
    req.onerror = () => { throw new Error(`Request error, readyState: ${req.readyState}, status: ${req.status}`) }
    req.open(method, url, false)
    req.send()
    if (req.readyState === 4) {
        return req.responseText
    }
    else throw new Error(`Unknown HTTP error, readyState: ${req.readyState}, status: ${req.status}`)
}

/**
 * @param {string | URL} url
 * @param {string} method
 */
function SendRequestAsync(url, method, timeout = 0) { return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.timeout = timeout
    req.onreadystatechange = () => { if (req.readyState === 4) resolve(req.responseText) }
    req.ontimeout = () => reject(new Error(`Request timeout, readyState: ${req.readyState}, status: ${req.status}`))
    req.onerror = () => reject(new Error(`Request error, readyState: ${req.readyState}, status: ${req.status}`))

    try { req.open(method, url) }
    catch (error) { reject(error); return }

    try { req.send() }
    catch (error) { reject(error); return }
})}

/**
 * @param {string | URL} url
 */
function CheckUrl(url, timeout = 0) { return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.timeout = timeout
    req.onreadystatechange = () => { if (req.readyState === 4) resolve(req.status) }
    req.ontimeout = () => reject(new Error(`Request timeout, readyState: ${req.readyState}, status: ${req.status}`))
    req.onerror = () => reject(new Error(`Request error, readyState: ${req.readyState}, status: ${req.status}`))

    try { req.open('GET', url) }
    catch (error) { reject(error); return }

    try { req.send() }
    catch (error) { reject(error); return }
})}
