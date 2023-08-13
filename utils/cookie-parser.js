/**
 * @param {string} data
 */
module.exports = function(data) {
    const rows = data.split(';')
    /** @type {{ [key: string]: { value: string, MaxAge?: number } | undefined }} */
    let result = { }
    let currentCookie = null
    for (const row of rows) {
        if (!row.includes('=')) {
            console.warn('[Cookie Parser]: Row does not includes \"&\"', row)
            continue
        }

        const parts = row.split('=')

        if (parts.length != 2) {
            console.warn('[Cookie Parser]: Invalid row', row)
            continue
        }

        switch (parts[0].toLowerCase()) {
            case 'max-age':
                if (!currentCookie) {
                    console.warn('[Cookie Parser]: Unexpected key', row)
                    continue
                }
                // @ts-ignore
                result[currentCookie].MaxAge = Number.parseInt(parts[1])
                break

            case 'expires':
                if (!currentCookie) {
                    console.warn('[Cookie Parser]: Unexpected key', row)
                    continue
                }
                // result[currentCookie].Expires = Number.parseInt(parts[1])
                break
        
            default:
                break
        }

        currentCookie = parts[0]
        result[parts[0]] = {
            value: parts[1]
        }
    }
    return result
}