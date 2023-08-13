/**
 * @param {any} obj
 * @param {import("./structure-check").StructureTypes} types
 */
function CheckStructure(obj, types) {
    if (obj === null || obj === undefined) {
        return false
    }
    if (typeof obj !== 'object') {
        return false
    }
    return CheckSubstructure(obj, types)
}

/**
 * @param {any} obj
 * @param {import("./structure-check").StructureTypes} types
 */
function CheckSubstructure(obj, types) {
    for (const property in types) {
        const value = obj[property]
        if (!value) { return false }

        const expectedType = types[property]
        const type = typeof value

        if (typeof expectedType === 'string') {
            if (type !== expectedType) {
                return false
            }
        } else {
            if (!CheckSubstructure(value, expectedType)) {
                return false
            }
        }
    }
    return true
}

module.exports = CheckStructure