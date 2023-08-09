/**
 * @param {string} data
 */
module.exports = function(data) {
    const rows = data.split('&')
    /**
     * @type {{ [key: string]: string | undefined }}
     */
    let result = { }
    for (const row of rows) {
        if (!row.includes('=')) {
            console.warn('[Form Parser]: Row does not includes \"&\"', row)
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
