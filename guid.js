const Characters = {
    AllNonJunk: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
    Numbers: '0123456789',
    Letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    Simple: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
}

/**
 * @param {number} length
 */
function RandomCharacters(length) {
    let result = ''
    for (let i = 0; i < length; i++) {
        const num = Math.random()
        const char = Characters.Simple[Math.round(num * Characters.Simple.length)]
        result += char
    }
    return result
}

function Time() {
    let result = ''
    const date = Date.now().toString()
    for (let i = 0; i < date.length; i++) {
        const num = Number.parseInt(date[i])
        const char = Characters.Simple[Math.round(num * Characters.Simple.length / 10)]
        result += char
    }
    return result
}

function Guid() {
    let result = ''
    result += Time()
    result += '-'
    result += RandomCharacters(32)
    return result
}

module.exports = Guid