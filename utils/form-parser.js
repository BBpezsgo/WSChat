/**
 * @param {string} data
 */
module.exports = function(data) {
    /**
     * @type {{ [key: string]: string | undefined }}
     */
    let result = { }

    if (!data) { return result }
    
    if (data.length <= 0) { return result }
    
    if (!data.includes('=')) { return result }
    
    const rows = data.split('&')
    for (const row of rows) {
        if (!row.includes('=')) {
            console.warn('[Form Parser]: Row does not includes \"=\"', row)
            continue
        }

        const parts = row.split('=')

        if (parts.length != 2) {
            console.warn('[Form Parser]: Invalid row', row)
            continue
        }

        result[parts[0]] = decodeURIComponent(parts[1]).replace(/\+/g, ' ')
    }
    return result
}
